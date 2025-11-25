// api wrappers for object detection services (API Ninjas only)
import { API_NINJAS_KEY } from '/api/config.js';

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
  // API Ninjas returns array of detections; pick the top object's label field first
  // sample response uses `label`, so check that first, then fall back to other keys
  const top = data && data[0]
    ? (data[0].label || data[0].name || data[0].object || null)
    : null;
  // Return both a normalized label and the raw response so the frontend
  // can show debugging information.
  return { label: top, raw: data };
}
