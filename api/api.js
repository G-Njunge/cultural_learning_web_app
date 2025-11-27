// API Ninjas object detection wrapper
// Sends images to API Ninjas and extracts detected object labels for quiz answers
import { API_NINJAS_KEY } from '/api/config.js';

export async function detectObjectNinjas(file) {
  // file: Blob or File object containing image data
  // Returns: { label: "object name", raw: full API response } or null on error
  
  // Check if API key is configured properly
  if (!API_NINJAS_KEY || API_NINJAS_KEY.startsWith('REPLACE')) {
    console.warn('API_NINJAS_KEY not configured. Returning null.');
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
