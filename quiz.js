// Kulture Quiz Frontend
// Main quiz logic: loads questions, renders UI, handles user interactions, manages level progression
import { detectObjectNinjas } from '/api/api.js';

document.addEventListener('DOMContentLoaded', function () {
  // Cache DOM elements for efficient access throughout the app
  const choiceEls = [
    document.getElementById('choice1'),
    document.getElementById('choice2'),
    document.getElementById('choice3'),
    document.getElementById('choice4')
  ].filter(Boolean);
  const homeBtn = document.getElementById('btn-home');
  const feedbackEl = document.getElementById('quiz-feedback');
  const imgEl = document.getElementById('quiz-img');
  const titleEl = document.getElementById('quiz-title');
  const level1Btn = document.getElementById('level-1');
  const level2Btn = document.getElementById('level-2');
  const level3Btn = document.getElementById('level-3');
  const stageActions = document.getElementById('stage-actions');
  const promptEl = document.getElementById('stage-action-question');

  // Quiz state
  let questions = [];
  let index = 0;
  let currentStage = 1;

  // Fisher-Yates shuffle algorithm for randomizing choices
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  // Extract numeric ID from question identifiers like "q5" to return 5
  function idToNum(id) {
    if (!id) return NaN;
    const m = String(id).match(/q(\d+)/i);
    return m ? Number(m[1]) : NaN;
  }

  // Provide fallback image if image path is missing or broken
  function safeImageSrc(src) {
    if (!src) return './images/pexels-jairo-david-arboleda-621072-1425883.jpg';
    return src;
  }

  // Show only the active level button and hide others to reduce confusion
  function setActiveLevelButton(level) {
    [level1Btn, level2Btn, level3Btn].forEach(function (b) {
      if (!b) return;
      // Display only the current level button
      if (Number(b.dataset.level) === level) {
        b.style.display = '';
        b.classList.add('active');
        b.setAttribute('aria-pressed','true');
      } else {
        b.style.display = 'none';
        b.classList.remove('active');
        b.setAttribute('aria-pressed','false');
      }
    });
  }

  // Load questions for a specific level (1, 2, or 3)
  async function loadQuestions(count, stage) {
    count = count || 5; stage = stage || 1;
    try {
      // Hide level completion options when loading new questions
      if (stageActions) stageActions.style.display = 'none';
      // Try multiple paths to find the questions dataset
      const paths = ['/api/questions.json', './api/questions.json', 'api/questions.json'];
      let data = null;
      for (let p of paths) {
        try {
          const res = await fetch(p);
          if (!res.ok) continue;
          const json = await res.json();
          if (Array.isArray(json) && json.length) { data = json; break; }
        } catch (e) {
          // Continue to next path if fetch fails
        }
      }
      if (!Array.isArray(data) || !data.length) throw new Error('No questions found');

      // Filter questions by level range (1-5 for level 1, 6-10 for level 2, etc)
      const ranges = {1: [1,5], 2: [6,10], 3: [11,15]};
      const r = ranges[stage] || ranges[1];
      const pool = data.filter(d => {
        const n = idToNum(d.id); return !Number.isNaN(n) && n >= r[0] && n <= r[1];
      });
      const source = pool.length >= Math.min(count, data.length) ? pool : data;
      questions = shuffle(source).slice(0, Math.min(count, source.length));
      index = 0; currentStage = stage; setActiveLevelButton(stage);
      renderQuestion();
    } catch (err) {
      console.error(err);
      feedbackEl.textContent = 'Could not load quiz questions.';
      choiceEls.forEach(b => b.disabled = true);
    }
  }

  function renderQuestion() {
    const q = questions[index];
    if (!q) return;
    // Ensure image and choices are visible when rendering a new question
    imgEl.style.display = '';
    document.querySelector('.quiz-choices').style.display = '';
    // show the persistent prompt above choices
    if (promptEl) { promptEl.textContent = 'What is this?'; promptEl.style.display = ''; }
    imgEl.src = safeImageSrc(q.image);
    imgEl.alt = q.label ? 'Picture of ' + q.label : 'Quiz image';
    imgEl.onerror = function () { imgEl.src = './images/pexels-jairo-david-arboleda-621072-1425883.jpg'; };
    feedbackEl.textContent = '';
    // If label missing, use detection but do not block UI
    (async function(){
      if (!q.label) {
        try {
          const resp = await fetch(imgEl.src);
          const blob = await resp.blob();
          const detected = await detectObjectNinjas(blob).catch(()=>null);
          if (detected && typeof detected === 'object' && detected.label) q.label = detected.label;
        } catch (e) {}
      }
      // prepare choices
      const labels = questions.map(s => s.label).filter(Boolean);
      const pool = labels.length >= 4 ? labels : ['Elephant','Baobab Tree','Drum','Kente Cloth','Mask','Giraffe','Lion','Zebra'];
      const distractors = shuffle(pool.filter(l=>l!==q.label)).slice(0,3);
      const choices = shuffle([q.label, ...distractors]);
      choiceEls.forEach(function(btn,i){ btn.disabled=false; btn.classList.remove('correct','wrong'); btn.textContent = choices[i]||''; btn.onclick = function(){ onChoiceClick(btn, q.label); }; });
      updateProgress();
    })();
  }

  function updateProgress(){ if (titleEl && questions.length) titleEl.textContent = 'Question ' + (index+1) + ' of ' + questions.length; }

  function onChoiceClick(btn, correctLabel){ const chosen = btn.textContent;
    if (chosen === correctLabel){ choiceEls.forEach(b=>b.disabled=true); btn.classList.add('correct'); feedbackEl.textContent='Correct!'; showConfetti(); setTimeout(nextQuestion,1500); }
    else { btn.classList.add('wrong'); feedbackEl.textContent='Try Again!'; const correctBtn = choiceEls.find(b=>b.textContent===correctLabel); if (correctBtn) correctBtn.classList.add('correct'); }
  }

  function nextQuestion(){ 
    if (!questions.length) return; 
    if (index < questions.length-1){ 
      index++; renderQuestion(); 
    } else { 
      // Level complete - show confetti and completion options
      feedbackEl.textContent='Level complete — well done!'; 
      // hide the prompt immediately when the level finishes
      if (promptEl) promptEl.style.display = 'none';
      imgEl.style.display='none'; 
      document.querySelector('.quiz-choices').style.display='none'; 
      showConfetti(); 
      setTimeout(function(){ 
        showLevelCompletionOptions(); 
      }, 2000); 
    } 
  }

  function showLevelCompletionOptions() {
    // Use the dedicated actions container so we do not replace the answer buttons
    if (!stageActions) return;
    stageActions.innerHTML = '';
    stageActions.style.display = '';

    // Hide the static back button when showing stage actions
    if (homeBtn) homeBtn.style.display = 'none';

    // Hide the persistent prompt when showing completion options
    if (promptEl) promptEl.style.display = 'none';

    // hide the image and choices area while options are shown
    imgEl.style.display = 'none';
    const quizChoices = document.querySelector('.quiz-choices');
    if (quizChoices) quizChoices.style.display = 'none';

    // small helper to set ARIA and keyboard handlers (Enter/Space)
    function makeAccessible(btn, ariaLabel) {
      btn.setAttribute('aria-label', ariaLabel);
      btn.type = 'button';
      btn.setAttribute('tabindex', '0');
      btn.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          btn.click();
        }
      });
    }

    if (currentStage < 3) {
      feedbackEl.textContent = '';

      const playAgainBtn = document.createElement('button');
      playAgainBtn.className = 'btn btn-primary';
      playAgainBtn.textContent = 'Play Level Again';
      makeAccessible(playAgainBtn, 'Play this level again');
      playAgainBtn.onclick = function() {
        stageActions.style.display = 'none';
        loadQuestions(5, currentStage);
      };

      const proceedBtn = document.createElement('button');
      proceedBtn.className = 'btn btn-primary';
      proceedBtn.textContent = 'Proceed';
      makeAccessible(proceedBtn, 'Proceed to next level');
      proceedBtn.onclick = function() {
        stageActions.style.display = 'none';
        currentStage++;
        loadQuestions(5, currentStage);
      };

      const backBtn = document.createElement('button');
      backBtn.className = 'btn btn-primary';
      backBtn.textContent = 'Back to Home';
      makeAccessible(backBtn, 'Go back to the home page');
      backBtn.onclick = function() { window.location.href = 'index.html'; };

      stageActions.appendChild(playAgainBtn);
      stageActions.appendChild(proceedBtn);
      stageActions.appendChild(backBtn);
    } else {
      feedbackEl.textContent = 'All levels complete! You finished the quiz!';

      const playAgainBtn = document.createElement('button');
      playAgainBtn.className = 'btn btn-primary';
      playAgainBtn.textContent = 'Play Quiz Again';
      makeAccessible(playAgainBtn, 'Play the whole quiz again');
      playAgainBtn.onclick = function() {
        stageActions.style.display = 'none';
        currentStage = 1;
        loadQuestions(5, 1);
      };

      const backBtn = document.createElement('button');
      backBtn.className = 'btn btn-primary';
      backBtn.textContent = 'Back to Home';
      makeAccessible(backBtn, 'Go back to the home page');
      backBtn.onclick = function() { window.location.href = 'index.html'; };

      stageActions.appendChild(playAgainBtn);
      stageActions.appendChild(backBtn);
    }
  }

  

  // Wire level buttons and home
  if (level1Btn) level1Btn.addEventListener('click', function(e){ e.preventDefault(); loadQuestions(5,1); });
  if (level2Btn) level2Btn.addEventListener('click', function(e){ e.preventDefault(); loadQuestions(5,2); });
  if (level3Btn) level3Btn.addEventListener('click', function(e){ e.preventDefault(); loadQuestions(5,3); });

  // Start
  setActiveLevelButton(currentStage);
  loadQuestions(5, currentStage);

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
