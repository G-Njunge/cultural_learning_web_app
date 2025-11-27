// API Ninjas object detection wrapper
// Sends images to API Ninjas and extracts detected object labels for quiz answers

// NOTE: We avoid a static import of `api/config.js` because some deployments
// intentionally omit the local `api/config.js` file (it contains private keys
// and is listed in .gitignore). A static import would fail module loading and
// prevent the quiz script from running. Instead, load the key dynamically at
// runtime inside the detection function and gracefully handle a missing key.

export async function detectObjectNinjas(file) {
  // file: Blob or File object containing image data
  // Returns: { label: "object name", raw: full API response } or null on error

  // Try to load the local config dynamically. If it does not exist, continue
  // without throwing so the rest of the app can still work (detection will be
  // skipped and questions will still function).
  let API_NINJAS_KEY = null;
  try {
    const cfg = await import('./config.js');
    API_NINJAS_KEY = cfg && cfg.API_NINJAS_KEY ? cfg.API_NINJAS_KEY : null;
  } catch (e) {
    // Config not present or import failed; proceed without a key
    console.debug('Local api/config.js not present or failed to load; skipping detection.');
    API_NINJAS_KEY = null;
  }

  // If no valid key, just return null so the caller knows detection was not run
  if (!API_NINJAS_KEY || API_NINJAS_KEY.startsWith('REPLACE')) {
    return null;
  }

  const endpoint = 'https://api.api-ninjas.com/v1/objectdetection';
  const formData = new FormData();
  formData.append('image', file, 'image.jpg');

  // Send image to API Ninjas for object detection
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'X-Api-Key': API_NINJAS_KEY
    },
    body: formData
  });

  // Handle API errors
  if (!response.ok) {
    const text = await response.text();
    throw new Error('API Ninjas object detection error: ' + response.status + ' ' + text);
  }

  const data = await response.json();
  // Extract label from the top detection result (API Ninjas returns array of objects)
  // Try multiple label field names for compatibility
  const top = data && data[0]
    ? (data[0].label || data[0].name || data[0].object || null)
    : null;

  // Return both the extracted label and raw API response for debugging
  return { label: top, raw: data };
}
