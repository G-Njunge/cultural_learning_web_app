// quiz-frontend.js (updated)
// Loads questions from `/data/questions.json`, shows a 5-question quiz,
// and uses the API detection function when loading each image.

import { detectObjectNinjas, detectObjectAPI4AI } from '/api/api.js';

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
  // absolute URL (http/https)
  if (/^https?:\/\//i.test(url)) return url;
  // root-relative
  if (url.startsWith('/')) return url;
  // relative paths like ./images/foo.jpg or images/foo.jpg -> make root-relative
  return url.replace(/^\.\/?/, '/');
}

async function showQuestion(q) {
  answered = false;
  feedbackEl.textContent = 'Detecting image...';
  const imgUrl = normalizeImageUrl(q.image);
  imageEl.src = imgUrl;
  imageEl.alt = q.id;
  clearChoices();

  // Build choices: correct + 3 random distractors
  const allLabels = questions.map(x => x.label);
  const others = allLabels.filter(l => l !== q.label);
  const distractors = sample(others, Math.min(3, others.length));
  const choices = [q.label, ...distractors].sort(() => Math.random() - 0.5);

  choices.forEach(choice => {
    const b = createChoiceButton(choice);
    b.addEventListener('click', () => onChoose(choice, b, q));
    choicesEl.appendChild(b);
  });

  renderProgress();

  // Fetch image as blob and send to detection API (use Ninjas by default)
  try {
    const resp = await fetch(imgUrl);
    const blob = await resp.blob();

    // Use detectObjectNinjas(file) as requested
    let detected = null;
    try {
      detected = await detectObjectNinjas(blob);
    } catch (err) {
      console.warn('detectObjectNinjas failed:', err);
    }

    // If detectObjectNinjas returned null, as a fallback try API4AI
    if (!detected) {
      try {
        detected = await detectObjectAPI4AI(q.image);
      } catch (err) {
        console.warn('detectObjectAPI4AI failed:', err);
      }
    }

    // Attach detection label to question for debugging / display
    q.detected = detected;
    feedbackEl.textContent = detected ? `Detected: ${detected}` : '';
  } catch (err) {
    console.error('Failed to fetch image for detection:', err);
    feedbackEl.textContent = '';
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
    feedbackEl.textContent = `Wrong — correct: ${q.label}` + (q.detected ? ` (detected: ${q.detected})` : '');
  }
  renderProgress();
}

nextBtn.addEventListener('click', () => {
  if (!questions.length) return;
  if (!answered) {
    // reveal correct if user didn't answer
    const buttons = choicesEl.querySelectorAll('.choice');
    buttons.forEach(b => { if (b.textContent === questions[currentIndex].label) b.classList.add('correct'); b.style.pointerEvents = 'none'; });
    feedbackEl.textContent = `Skipped — correct: ${questions[currentIndex].label}` + (questions[currentIndex].detected ? ` (detected: ${questions[currentIndex].detected})` : '');
    answered = true;
    return;
  }

  currentIndex += 1;
  if (currentIndex >= questions.length) {
    feedbackEl.textContent = `Quiz finished! Score: ${score} / ${questions.length}`;
    imageEl.src = '/images/quiz-finish.jpg';
    clearChoices();
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
    // Normalize image URLs to root-relative or absolute
    const normalized = all.map(q => ({ ...q, image: normalizeImageUrl(q.image) }));
    // pick 5 random
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
