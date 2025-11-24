// Quiz logic: load local `api/questions.json`, pick 5 questions per round,
// display a large image and four answer buttons, show feedback and handle Next/Try Again.

document.addEventListener('DOMContentLoaded', () => {
  const choiceEls = [
    document.getElementById('choice1'),
    document.getElementById('choice2'),
    document.getElementById('choice3'),
    document.getElementById('choice4')
  ].filter(Boolean);
  const nextBtn = document.getElementById('btn-next');
  const tryAgainBtn = document.getElementById('btn-try-again');
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

    // Prepare choices: correct + three distractors
    const labels = questions.map(s => s.label).filter(Boolean);
    const distractPool = labels.filter(l => l !== q.label);
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

    // Reset feedback and controls
    feedbackEl.textContent = '';
    answered = false;
    if (nextBtn) nextBtn.disabled = true;
    updateProgress();
  }

  function onChoiceClick(btn, correctLabel) {
    // mark answer
    const chosen = btn.textContent;
    // disable all buttons so child can't spam
    choiceEls.forEach(b => b.disabled = true);

    if (chosen === correctLabel) {
      btn.classList.add('correct');
      feedbackEl.textContent = 'Correct! 🎉';
      // show a quick confetti celebration
      showConfetti();
    } else {
      btn.classList.add('wrong');
      feedbackEl.textContent = 'Try Again!';
      // highlight correct
      const correctBtn = choiceEls.find(b => b.textContent === correctLabel);
      if (correctBtn) correctBtn.classList.add('correct');
    }

    answered = true;
    if (nextBtn) nextBtn.disabled = false;
  }

  function nextQuestion() {
    if (!questions.length) return;
    if (index < questions.length - 1) {
      index += 1;
      renderQuestion();
    } else {
      // finished
      feedbackEl.textContent = 'Quiz complete — well done! 🎉';
      imgEl.src = './images/placeholder-quiz.jpg';
      choiceEls.forEach(b => { b.textContent = ''; b.disabled = true; b.classList.remove('correct','wrong'); });
      if (nextBtn) nextBtn.disabled = true;
      if (titleEl) titleEl.textContent = 'All done!';
    }
  }

  function tryAgain() {
    // allow re-attempt on current question
    answered = false;
    feedbackEl.textContent = '';
    choiceEls.forEach(b => { b.disabled = false; b.classList.remove('correct','wrong'); b.setAttribute('aria-pressed','false'); });
    if (nextBtn) nextBtn.disabled = true;
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
  if (tryAgainBtn) tryAgainBtn.addEventListener('click', (e) => { e.preventDefault(); tryAgain(); });

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

    // create a bunch of pieces
    const colors = ['var(--color-primary)','var(--color-secondary)','var(--color-accent)','#FFD166'];
    const pieces = [];
    for (let i=0;i<18;i++) {
      const el = document.createElement('span');
      el.className = 'confetti-piece';
      const left = Math.random() * 100;
      const size = 8 + Math.random() * 12;
      el.style.left = left + '%';
      el.style.top = (-10 - Math.random()*10) + '%';
      el.style.width = size + 'px';
      el.style.height = Math.round(size * 1.4) + 'px';
      el.style.background = colors[Math.floor(Math.random()*colors.length)];
      el.style.transform = `rotate(${Math.random()*360}deg)`;
      const delay = (Math.random()*0.2) + 's';
      const dur = 1.2 + Math.random()*0.8;
      el.style.animation = `confetti-fall ${dur}s ${delay} cubic-bezier(.2,.9,.3,1)`;
      confettiWrap.appendChild(el);
      pieces.push(el);
    }

    // remove pieces after animation
    setTimeout(() => {
      pieces.forEach(p => p.remove());
    }, 2500);
  }
});
