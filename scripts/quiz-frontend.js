// quiz-frontend.js removed — kept as an empty harmless stub to avoid
// duplicate/declaration/parse errors produced by earlier iterations.

// The active quiz page `quiz.html` loads `quiz.js` (the canonical frontend).
// If you want to enable an alternate implementation, add it as
// `scripts/quiz-frontend-clean.js` and import it explicitly from `quiz.html`.

// quiz-frontend.js
// Clean implementation: load questions from `/api/questions.json`,
// call API Ninjas to detect label for each image, present 4 choices,
// and show a debug panel with the raw API response.

import { detectObjectNinjas } from '/api/api.js';

const imageEl = document.getElementById('quiz-image');
const choicesEl = document.getElementById('choices');
const feedbackEl = document.getElementById('feedback');
const nextBtn = document.getElementById('next-btn');
const restartBtn = document.getElementById('restart-btn');
const progressEl = document.getElementById('progress');

let questions = [];
let currentIndex = 0;
let score = 0;
let answered = false;

const LABEL_POOL = [
  'Elephant', 'Baobab Tree', 'Drum', 'Kente Cloth', 'Ceremonial Mask', 'Canoe',
  'Giraffe', 'Rhino', 'Lion', 'Thatched Hut', 'Market', 'Safari Jeep', 'Chapati',
  'Ugali', 'Zebra'
];

function sample(array, n) {
  const copy = array.slice();
  const out = [];
  while (out.length < n && copy.length) {
    const i = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(i, 1)[0]);
  }
  return out;
}

function renderProgress() {
  if (!progressEl) return;
  progressEl.textContent = `Question ${Math.min(currentIndex + 1, questions.length)} / ${questions.length}  •  Score: ${score}`;
}

function clearChoices() {
  choicesEl.innerHTML = '';
}

function createChoiceButton(text) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'choice';
  btn.textContent = text;
  return btn;
}

function normalizeImageUrl(url) {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/')) return url;
  return url.replace(/^\.\/?/, '/');
}

function normalizeLabelForDisplay(s) {
  if (!s) return null;
  s = String(s).trim();
  if (!s) return null;
  return s.split(/\s+/).map(w => w[0]?.toUpperCase() + w.slice(1)).join(' ');
}

// Create (or reuse) a debug pre element to show raw detection JSON
function setDebugRaw(obj) {
  let pre = document.getElementById('detection-raw');
  if (!pre) {
    pre = document.createElement('pre');
    pre.id = 'detection-raw';
    pre.style.maxHeight = '220px';
    pre.style.overflow = 'auto';
    pre.style.background = '#0b1220';
    pre.style.color = '#dfe6ff';
    pre.style.padding = '8px';
    pre.style.borderRadius = '6px';
    pre.style.marginTop = '8px';
    if (feedbackEl && feedbackEl.parentElement) feedbackEl.insertAdjacentElement('afterend', pre);
  }
  try { pre.textContent = JSON.stringify(obj, null, 2); } catch (e) { pre.textContent = String(obj); }
}

function clearDebug() {
  const pre = document.getElementById('detection-raw');
  if (pre) pre.remove();
}

async function showQuestion(q) {
  answered = false;
  feedbackEl.textContent = 'Detecting image...';
  const imgUrl = normalizeImageUrl(q.image);
  imageEl.src = imgUrl;
  imageEl.alt = q.id || '';
  clearChoices();

  // Placeholder while detection runs
  ['Loading...', 'Loading...', 'Loading...', 'Loading...'].forEach(text => {
    const b = createChoiceButton(text);
    b.disabled = true;
    choicesEl.appendChild(b);
  });

  renderProgress();

  try {
    const resp = await fetch(imgUrl);
    const blob = await resp.blob();

    let detected = null;
    try { detected = await detectObjectNinjas(blob); } catch (e) { console.warn('detection failed', e); }

    const rawLabel = detected && typeof detected === 'object' ? detected.label : null;
    const displayLabel = normalizeLabelForDisplay(rawLabel);
    const finalCorrect = displayLabel || sample(LABEL_POOL, 1)[0];

    // Save for evaluation
    q.label = finalCorrect;
    q.detectedLabel = displayLabel;
    q.detectedRaw = detected && detected.raw ? detected.raw : detected || null;

    // Build distractors from LABEL_POOL excluding the correct label
    const pool = LABEL_POOL.filter(l => String(l).toLowerCase() !== String(finalCorrect).toLowerCase());
    const distractors = sample(pool, Math.min(3, pool.length));
    const choices = [finalCorrect, ...distractors].sort(() => Math.random() - 0.5);

    clearChoices();
    choices.forEach(choice => {
      const b = createChoiceButton(choice);
      b.addEventListener('click', () => onChoose(choice, b, q));
      choicesEl.appendChild(b);
    });

    feedbackEl.textContent = q.detectedLabel ? `Detected: ${q.detectedLabel}` : 'No label detected (using fallback)';

    if (q.detectedRaw) setDebugRaw(q.detectedRaw); else clearDebug();

    renderProgress();
  } catch (err) {
    console.error('Failed to fetch image for detection:', err);
    feedbackEl.textContent = 'Image fetch failed';
    clearChoices();
    clearDebug();
  }
}

function onChoose(choice, btn, q) {
  if (answered) return;
  answered = true;

  const buttons = choicesEl.querySelectorAll('.choice');
  buttons.forEach(b => {
    if (b.textContent === q.label) b.classList.add('correct');
    if (b === btn && b.textContent !== q.label) b.classList.add('wrong');
    b.style.pointerEvents = 'none';
  });

  if (choice === q.label) {
    feedbackEl.textContent = 'Correct! 🎉';
    score += 1;
  } else {
    feedbackEl.textContent = `Wrong — correct: ${q.label}` + (q.detectedLabel ? ` (detected: ${q.detectedLabel})` : '');
  }
  renderProgress();
}

nextBtn.addEventListener('click', () => {
  if (!questions.length) return;
  if (!answered) {
    // reveal correct if user didn't answer
    const buttons = choicesEl.querySelectorAll('.choice');
    buttons.forEach(b => { if (b.textContent === questions[currentIndex].label) b.classList.add('correct'); b.style.pointerEvents = 'none'; });
    feedbackEl.textContent = `Skipped — correct: ${questions[currentIndex].label}` + (questions[currentIndex].detectedLabel ? ` (detected: ${questions[currentIndex].detectedLabel})` : '');
    answered = true;
    return;
  }

  currentIndex += 1;
  if (currentIndex >= questions.length) {
    feedbackEl.textContent = `Quiz finished! Score: ${score} / ${questions.length}`;
    imageEl.src = '/images/quiz-finish.jpg';
    clearChoices();
    clearDebug();
    renderProgress();
  } else {
    showQuestion(questions[currentIndex]);
  }
});

restartBtn.addEventListener('click', () => {
  startQuiz();
});

async function startQuiz() {
  try {
    const res = await fetch('/api/questions.json');
    if (!res.ok) throw new Error('Failed to load questions.json');
    const all = await res.json();
    const normalized = all.map(q => ({ ...q, image: normalizeImageUrl(q.image) }));
    questions = sample(normalized, Math.min(5, normalized.length));
    currentIndex = 0;
    score = 0;
    if (!questions.length) {
      feedbackEl.textContent = 'No questions available.';
      renderProgress();
      return;
    }
    showQuestion(questions[currentIndex]);
  } catch (err) {
    console.error(err);
    feedbackEl.textContent = 'Error loading questions. Try again.';
  }
}

// initialize
(function () {
  startQuiz();
})();
