// Registers the service worker that provides the /api/question endpoint
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/api/sw.js').then((reg) => {
      console.log('Service worker registered.', reg);
    }).catch((err) => {
      console.warn('Service worker registration failed:', err);
    });
  });
} else {
  console.warn('Service workers not supported in this browser.');
}
