/* Service Worker acting as a tiny backend for /api/question */
const CACHE_NAME = 'prickly-quiz-sw-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

async function loadDataset() {
  const resp = await fetch('/api/questions.json');
  if (!resp.ok) throw new Error('Could not load questions dataset');
  return await resp.json();
}

function sample(array, n) {
  const copy = array.slice();
  const out = [];
  while (out.length < n && copy.length) {
    const i = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(i, 1)[0]);
  }
  return out;
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.pathname === '/api/question') {
    event.respondWith((async () => {
      try {
        const params = url.searchParams;
        const count = Math.max(1, Math.min(10, parseInt(params.get('count') || '1')));
        const dataset = await loadDataset();

        // pick `count` distinct questions
        const picks = sample(dataset, count);

        const questions = picks.map((item) => {
          // Build three distractors from dataset labels that are not the correct label
          const others = dataset.filter(d => d.id !== item.id).map(d => d.label);
          // shuffle and pick 3
          const distractors = sample(others, Math.min(3, others.length));
          const choices = sample([item.label, ...distractors], Math.min(4, 1 + distractors.length));
          return {
            id: item.id,
            image: item.image,
            label: item.label,
            choices: choices
          };
        });

        const body = JSON.stringify({ questions });
        return new Response(body, {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }
    })());
  }
});
