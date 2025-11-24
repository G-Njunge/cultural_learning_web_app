// api wrappers for object detection services
import { API_NINJAS_KEY} from '/api/config.js';

export async function detectObjectNinjas(file) {
  // file: Blob or File
  if (!API_NINJAS_KEY || API_NINJAS_KEY.startsWith('REPLACE')) {
    console.warn('API_NINJAS_KEY not configured. Returning null.');
    return null;
  }

  const endpoint = 'https://api.api-ninjas.com/v1/objectdetection';
  const formData = new FormData();
  formData.append('image', file, 'image.jpg');

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'X-Api-Key': API_NINJAS_KEY
    },
    body: formData
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error('API Ninjas object detection error: ' + response.status + ' ' + text);
  }

  const data = await response.json();
  // API Ninjas returns array of detections; pick the top object's label
  const top = data && data[0] ? (data[0].name || data[0].object || null) : null;
  return top;
}

export async function detectObjectAPI4AI(imageUrl) {
  // Example wrapper for API4AI - requires an API key and a known endpoint.
  // This is a placeholder implementation; if you have an API4AI account,
  // set API4AI_KEY in `/api/config.js` and update the endpoint details.
  if (!API4AI_KEY || API4AI_KEY.startsWith('REPLACE')) {
    console.warn('API4AI_KEY not configured. Returning null.');
    return null;
  }

  // Example endpoint (may vary by provider/region)
  const endpoint = 'https://api.api4ai.cloud/vision/v1/object-detection';

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Api-Key ${API4AI_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ url: imageUrl })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error('API4AI detection error: ' + res.status + ' ' + text);
  }

  const payload = await res.json();
  // Extract a label from the response; shape varies by provider
  // This attempts a couple of common fields; adapt if your provider differs.
  try {
    const label = payload?.results?.[0]?.entities?.[0]?.type || payload?.results?.[0]?.entities?.[0]?.classes?.[0]?.name || null;
    return label;
  } catch (e) {
    return null;
  }
}
