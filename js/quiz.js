/* Frontend quiz logic (vanilla JS)
   - Fetches a set of 5 questions from /api/question?count=5
   - Renders image + four choices
   - Shows feedback, updates progress, handles next/restart
*/

(function () {
  const startBtn = document.getElementById('start-quiz');
  const quizPlay = document.getElementById('quiz-play');
  const quizImage = document.getElementById('quiz-image');
  const quizChoices = document.getElementById('quiz-choices');
  const quizFeedback = document.getElementById('quiz-feedback');
  const quizProgress = document.getElementById('quiz-progress');
  const nextBtn = document.getElementById('next-btn');
  const restartBtn = document.getElementById('restart-btn');

  let questions = [];
  let index = 0;
  let locked = false;

  async function fetchQuestions(count = 5) {
    try {
      const res = await fetch(`/api/question?count=${count}`);
      if (!res.ok) throw new Error('Failed to fetch questions');
      const data = await res.json();
      return data.questions || [];
    } catch (err) {
      console.error(err);
      alert('Could not load quiz questions. Try again later.');
      return [];
    }
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function renderQuestion() {
    const q = questions[index];
    if (!q) return;
    quizImage.src = q.image;
    quizImage.alt = `Picture for question ${index + 1}`;

    // Clear choices
    quizChoices.innerHTML = '';
    const choices = shuffle(q.choices.slice());
    choices.forEach(choice => {
      const btn = document.createElement('button');
      btn.className = 'btn btn-quiz-choice';
      btn.type = 'button';
      btn.textContent = choice;
      btn.setAttribute('role', 'listitem');
      btn.addEventListener('click', () => onChoiceClick(btn, q));
      quizChoices.appendChild(btn);
    });

    quizFeedback.textContent = '';
    nextBtn.disabled = true;
    updateProgress();
  }

  function updateProgress() {
    quizProgress.textContent = `Question ${index + 1} of ${questions.length}`;
  }

  function onChoiceClick(btn, q) {
    if (locked) return;
    locked = true;
    const chosen = btn.textContent;
    const correct = q.label;

    // Mark selection
    Array.from(quizChoices.children).forEach(b => {
      b.disabled = true;
      b.classList.remove('correct');
      b.classList.remove('wrong');
    });

    if (chosen === correct) {
      btn.classList.add('correct');
      quizFeedback.textContent = 'Correct! 🎉';
    } else {
      btn.classList.add('wrong');
      // highlight correct
      const correctBtn = Array.from(quizChoices.children).find(b => b.textContent === correct);
      if (correctBtn) correctBtn.classList.add('correct');
      quizFeedback.textContent = `Wrong — the correct answer is "${correct}".`;
    }

    nextBtn.disabled = false;
  }

  function nextQuestion() {
    if (index < questions.length - 1) {
      index += 1;
      locked = false;
      renderQuestion();
    } else {
      // finished
      quizFeedback.textContent = 'Quiz complete — well done! 🎉';
      quizImage.src = '';
      quizChoices.innerHTML = '';
      quizProgress.textContent = `You finished ${questions.length} questions.`;
      nextBtn.disabled = true;
    }
  }

  function resetQuizUI() {
    quizPlay.hidden = true;
    quizImage.src = '';
    quizChoices.innerHTML = '';
    quizFeedback.textContent = '';
    quizProgress.textContent = '';
    nextBtn.disabled = true;
  }

  async function startQuiz() {
    startBtn.disabled = true;
    startBtn.textContent = 'Loading...';
    questions = await fetchQuestions(5);
    if (!questions.length) {
      startBtn.disabled = false;
      startBtn.textContent = 'Start Quiz';
      return;
    }
    index = 0;
    quizPlay.hidden = false;
    renderQuestion();
    startBtn.textContent = 'Start Quiz';
    startBtn.disabled = false;
  }

  startBtn.addEventListener('click', (e) => {
    e.preventDefault();
    startQuiz();
  });

  nextBtn.addEventListener('click', (e) => {
    e.preventDefault();
    nextQuestion();
  });

  restartBtn.addEventListener('click', (e) => {
    e.preventDefault();
    resetQuizUI();
    startQuiz();
  });

  // Expose for debugging
  window._pricklyQuiz = {
    startQuiz,
    fetchQuestions
  };
})();
