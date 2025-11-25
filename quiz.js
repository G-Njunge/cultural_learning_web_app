// Clean, self-contained quiz frontend
import { detectObjectNinjas } from '/api/api.js';

document.addEventListener('DOMContentLoaded', function () {
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

  let questions = [];
  let index = 0;
  let currentStage = 1;

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  function idToNum(id) {
    if (!id) return NaN;
    const m = String(id).match(/q(\d+)/i);
    return m ? Number(m[1]) : NaN;
  }

  function safeImageSrc(src) {
    if (!src) return './images/pexels-jairo-david-arboleda-621072-1425883.jpg';
    return src;
  }

  function setActiveLevelButton(level) {
    [level1Btn, level2Btn, level3Btn].forEach(function (b) {
      if (!b) return;
      // Show only the current level button
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

  async function loadQuestions(count, stage) {
    count = count || 5; stage = stage || 1;
    try {
      const paths = ['/api/questions.json', './api/questions.json', 'api/questions.json'];
      let data = null;
      for (let p of paths) {
        try {
          const res = await fetch(p);
          if (!res.ok) continue;
          const json = await res.json();
          if (Array.isArray(json) && json.length) { data = json; break; }
        } catch (e) {
          // try next
        }
      }
      if (!Array.isArray(data) || !data.length) throw new Error('No questions found');

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
    if (chosen === correctLabel){ choiceEls.forEach(b=>b.disabled=true); btn.classList.add('correct'); feedbackEl.textContent='Correct! 🎉'; showConfetti(); setTimeout(nextQuestion,1500); }
    else { btn.classList.add('wrong'); feedbackEl.textContent='Try Again!'; const correctBtn = choiceEls.find(b=>b.textContent===correctLabel); if (correctBtn) correctBtn.classList.add('correct'); }
  }

  function nextQuestion(){ 
    if (!questions.length) return; 
    if (index < questions.length-1){ 
      index++; renderQuestion(); 
    } else { 
      // Level complete - show confetti and completion options
      feedbackEl.textContent='Level complete — well done! 🎉'; 
      imgEl.style.display='none'; 
      document.querySelector('.quiz-choices').style.display='none'; 
      showConfetti(); 
      setTimeout(function(){ 
        showLevelCompletionOptions(); 
      }, 2000); 
    } 
  }

  function showLevelCompletionOptions() {
    // Clear choices and show level-appropriate buttons
    const quizChoices = document.querySelector('.quiz-choices');
    quizChoices.innerHTML = '';
    quizChoices.style.display = '';
    
    if (currentStage < 3) {
      // Levels 1 and 2: Show 3 buttons
      feedbackEl.textContent = '';
      
      const playAgainBtn = document.createElement('button');
      playAgainBtn.className = 'btn btn-primary';
      playAgainBtn.textContent = 'Play Level Again';
      playAgainBtn.onclick = function() { 
        imgEl.style.display=''; 
        quizChoices.innerHTML = '';
        loadQuestions(5, currentStage); 
      };
      
      const proceedBtn = document.createElement('button');
      proceedBtn.className = 'btn btn-primary';
      proceedBtn.textContent = 'Proceed';
      proceedBtn.onclick = function() { 
        currentStage++; 
        imgEl.style.display=''; 
        quizChoices.innerHTML = '';
        loadQuestions(5, currentStage); 
      };
      
      const homeBtn2 = document.createElement('button');
      homeBtn2.className = 'btn btn-outline';
      homeBtn2.textContent = 'Back to Home';
      homeBtn2.onclick = function() { window.location.href = 'index.html'; };
      
      quizChoices.appendChild(playAgainBtn);
      quizChoices.appendChild(proceedBtn);
      quizChoices.appendChild(homeBtn2);
    } else {
      // Level 3: Show 2 buttons
      feedbackEl.textContent = 'All levels complete! You finished the quiz! 🎊';
      
      const playAgainBtn = document.createElement('button');
      playAgainBtn.className = 'btn btn-primary';
      playAgainBtn.textContent = 'Play Quiz Again';
      playAgainBtn.onclick = function() { 
        currentStage = 1;
        imgEl.style.display=''; 
        quizChoices.innerHTML = '';
        loadQuestions(5, 1); 
      };
      
      const homeBtn2 = document.createElement('button');
      homeBtn2.className = 'btn btn-outline';
      homeBtn2.textContent = 'Back to Home';
      homeBtn2.onclick = function() { window.location.href = 'index.html'; };
      
      quizChoices.appendChild(playAgainBtn);
      quizChoices.appendChild(homeBtn2);
    }
  }

  function showConfetti(){ const container = document.querySelector('.quiz-image'); if (!container) return; let wrap = container.querySelector('.confetti-container'); if (!wrap){ wrap = document.createElement('div'); wrap.className='confetti-container'; container.appendChild(wrap); }
    const colors = ['var(--color-primary)','var(--color-secondary)','var(--color-accent)','#FFD166'];
    const pieces = [];
    for (let i=0;i<28;i++){ const el=document.createElement('span'); el.className='confetti-piece'; const left=Math.random()*100; const size=12+Math.random()*24; el.style.left=left+'%'; el.style.top=(-10-Math.random()*20)+'%'; el.style.width=size+'px'; el.style.height=Math.round(size*1.2)+'px'; el.style.background=colors[Math.floor(Math.random()*colors.length)]; el.style.transform='rotate('+ (Math.random()*360) +'deg) scale(0)'; const delay=(Math.random()*0.25)+'s'; const dur=1.6+Math.random()*1.2; el.style.animation='confetti-burst '+dur+'s '+delay+' cubic-bezier(.15,.82,.4,1)'; wrap.appendChild(el); pieces.push(el); }
    setTimeout(()=>pieces.forEach(p=>p.remove()),3800);
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
