// sw.js - Basic Service Worker
const CACHE_NAME = 'campus-life-planner-v1.0.0';

self.addEventListener('install', (event) => {
  console.log('Service Worker installing');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Basic fetch handling - you can customize this later
  event.respondWith(fetch(event.request));
});