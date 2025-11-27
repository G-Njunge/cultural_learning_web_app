/*
  Service Worker Registration
  Registers the service worker for offline support and request interception
  SW Path: /api/sw.js
*/

if ('serviceWorker' in navigator) {
  // Wait for page load before registering service worker to avoid blocking
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/api/sw.js').then((reg) => {
      console.log('Service worker registered.', reg);
    }).catch((err) => {
      // Log but don't block app if service worker fails to register
      console.warn('Service worker registration failed:', err);
    });
  });
} else {
  // Graceful fallback for browsers without service worker support
  console.warn('Service workers not supported in this browser.');
}
