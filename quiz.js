// Quiz logic: load local `api/questions.json`, pick 5 questions per round,
// display a large image and four answer buttons, show feedback and handle Next/Try Again.

import { detectObjectNinjas } from '/api/api.js';

document.addEventListener('DOMContentLoaded', () => {
  const choiceEls = [
    document.getElementById('choice1'),
    document.getElementById('choice2'),
    document.getElementById('choice3'),
    document.getElementById('choice4')
  ].filter(Boolean);
  const nextBtn = document.getElementById('btn-next');
  const feedbackEl = document.getElementById('quiz-feedback');
  const imgEl = document.getElementById('quiz-img');
  const titleEl = document.getElementById('quiz-title');

  let questions = [];
  let index = 0;
  let answered = false;

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function updateProgress() {
    if (!questions.length) return;
    if (titleEl) titleEl.textContent = `Question ${index + 1} of ${questions.length}`;
  }

  function safeImageSrc(src) {
    if (!src) return './images/placeholder-quiz.jpg';
    return src;
  }

  function renderQuestion() {
    const q = questions[index];
    if (!q) return;

    // Image
    const src = safeImageSrc(q.image);
    imgEl.src = src;
    imgEl.alt = q.label ? `Picture of ${q.label}` : 'Quiz image';
    imgEl.loading = 'lazy';
    imgEl.onerror = () => {
      // replace with local placeholder if image fails
      imgEl.src = './images/placeholder-quiz.jpg';
    };

    // If question lacks a label, call detection API to get it
    (async () => {
      let correct = q.label || null;
      if (!correct) {
        try {
          // fetch image as blob
          const resp = await fetch(src);
          const blob = await resp.blob();
          const detected = await detectObjectNinjas(blob);
          const rawLabel = detected && typeof detected === 'object' ? detected.label || detected.name || detected.object : detected;
          if (rawLabel) {
            // normalize
            correct = String(rawLabel).trim().split(/\s+/).map(w => w[0]?.toUpperCase()+w.slice(1)).join(' ');
          }
        } catch (e) {
          console.warn('Detection failed:', e);
        }
      }

      if (!correct) {
        // fallback to another question's label or placeholder
        const otherLabels = questions.map(s => s.label).filter(Boolean);
        correct = otherLabels.length ? otherLabels[0] : 'Unknown';
      }

      q.label = correct;

      // Prepare choices: correct + three distractors
      const labels = questions.map(s => s.label).filter(Boolean);
      // Use labels if available, otherwise use a small static pool
      const pool = labels.length >= 4 ? labels : ['Elephant','Baobab Tree','Drum','Kente Cloth','Mask','Giraffe','Lion','Zebra'];
      const distractPool = pool.filter(l => l !== q.label);
      const distractors = shuffle(distractPool).slice(0, 3);
      const choices = shuffle([q.label, ...distractors]);

      // Fill buttons
      choiceEls.forEach((btn, i) => {
        btn.disabled = false;
        btn.classList.remove('correct', 'wrong');
        btn.textContent = choices[i] || '';
        btn.setAttribute('aria-pressed', 'false');
        btn.onclick = () => onChoiceClick(btn, q.label);
      });
    })();

    // Reset feedback and controls
    feedbackEl.textContent = '';
    answered = false;
    if (nextBtn) nextBtn.disabled = true;
    updateProgress();
  }

  function onChoiceClick(btn, correctLabel) {
    // mark answer
    const chosen = btn.textContent;

    if (chosen === correctLabel) {
      // Correct! Disable buttons and auto-advance
      choiceEls.forEach(b => b.disabled = true);
      btn.classList.add('correct');
      feedbackEl.textContent = 'Correct! 🎉';
      // show a quick confetti celebration
      showConfetti();
      // Auto-advance after delay
      answered = true;
      setTimeout(() => {
        nextQuestion();
      }, 1500);
    } else {
      // Wrong: show feedback, highlight correct, allow retry by clicking another choice
      btn.classList.add('wrong');
      feedbackEl.textContent = 'Try Again!';
      // highlight correct answer
      const correctBtn = choiceEls.find(b => b.textContent === correctLabel);
      if (correctBtn) correctBtn.classList.add('correct');
      // Don't disable buttons—let them pick again
    }
  }

  function nextQuestion() {
    if (!questions.length) return;
    if (index < questions.length - 1) {
      index += 1;
      renderQuestion();
    } else {
      // finished
      feedbackEl.textContent = 'Quiz complete — well done! 🎉';
      if (titleEl) titleEl.textContent = 'All done!';
      // Hide image and choices
      const quizImage = document.getElementById('quiz-image');
      if (quizImage) quizImage.style.display = 'none';
      const quizChoices = document.querySelector('.quiz-choices');
      if (quizChoices) quizChoices.style.display = 'none';
      // Hide Next button, show Play Again and Back to Home
      if (nextBtn) nextBtn.style.display = 'none';
      // Change Back to Home to Play Again for convenience
      const homeBtn = document.getElementById('btn-home');
      if (homeBtn) {
        homeBtn.textContent = 'Play Again';
        homeBtn.href = '#';
        homeBtn.onclick = (e) => { e.preventDefault(); resetQuizUI(); loadQuestions(5); };
      }
      // Show confetti
      showConfetti();
    }

  // Helper to reset UI for new quiz
  function resetQuizUI() {
    const quizImage = document.getElementById('quiz-image');
    if (quizImage) quizImage.style.display = '';
    const quizChoices = document.querySelector('.quiz-choices');
    if (quizChoices) quizChoices.style.display = '';
    if (nextBtn) nextBtn.style.display = '';
    const homeBtn = document.getElementById('btn-home');
    if (homeBtn) {
      homeBtn.textContent = 'Back to Home';
      homeBtn.href = 'index.html';
      homeBtn.onclick = null;
    }
  }
  }


  async function loadQuestions(count = 5) {
    try {
      const res = await fetch('/api/questions.json');
      if (!res.ok) throw new Error('Network response was not ok');
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) throw new Error('No questions found');

      const chosen = shuffle(data).slice(0, Math.min(count, data.length));
      questions = chosen;
      index = 0;
      renderQuestion();
    } catch (err) {
      console.error('Failed to load questions:', err);
      feedbackEl.textContent = 'Could not load quiz questions. Try again later.';
      // disable controls
      choiceEls.forEach(b => b.disabled = true);
      if (nextBtn) nextBtn.disabled = true;
    }
  }

  // Wire controls
  if (nextBtn) nextBtn.addEventListener('click', (e) => { e.preventDefault(); nextQuestion(); });

  // Start by loading 5 questions
  loadQuestions(5);

  // --- Confetti helper ---
  function showConfetti() {
    const container = document.querySelector('.quiz-image');
    if (!container) return;

    let confettiWrap = container.querySelector('.confetti-container');
    if (!confettiWrap) {
      confettiWrap = document.createElement('div');
      confettiWrap.className = 'confetti-container';
      container.appendChild(confettiWrap);
    }

    // create a bunch of bigger pieces with more celebratory effect
    const colors = ['var(--color-primary)','var(--color-secondary)','var(--color-accent)','#FFD166'];
    const pieces = [];
    for (let i=0;i<40;i++) {
      const el = document.createElement('span');
      el.className = 'confetti-piece';
      const left = Math.random() * 100;
      const size = 16 + Math.random() * 28;  // bigger: 16-44px instead of 8-20px
      el.style.left = left + '%';
      el.style.top = (-20 - Math.random()*20) + '%';
      el.style.width = size + 'px';
      el.style.height = Math.round(size * 1.4) + 'px';
      el.style.background = colors[Math.floor(Math.random()*colors.length)];
      el.style.transform = `rotate(${Math.random()*360}deg) scale(0)`;
      const delay = (Math.random()*0.3) + 's';
      const dur = 2.5 + Math.random()*1.5;  // longer fall time
      el.style.animation = `confetti-burst ${dur}s ${delay} cubic-bezier(.15,.82,.4,1)`;
      confettiWrap.appendChild(el);
      pieces.push(el);
    }

    // remove pieces after animation
    setTimeout(() => {
      pieces.forEach(p => p.remove());
    }, 4500);
  }
});
