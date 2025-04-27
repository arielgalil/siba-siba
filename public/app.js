const { createElement, useState, useEffect, useRef } = React;

function App() {
  const [groups, setGroups] = useState([]);
  const [currentGroup, setCurrentGroup] = useState(null);
  const [attempts, setAttempts] = useState(0);
  const [startTime, setStartTime] = useState(Date.now());
  const [timer, setTimer] = useState(0);
  const [difficulty, setDifficulty] = useState(1);
  const [message, setMessage] = useState('');
  const [score, setScore] = useState(0);
  const [displayedScore, setDisplayedScore] = useState(0);
  const [finished, setFinished] = useState(false);
  // מצב הכפתור: "check", "checking" או "ready"
  const [checkButtonState, setCheckButtonState] = useState("check");
  // מערך תוצאות לבדיקה – עבור כל תיבה: true/false או null (אם עדיין לא עודכנה)
  const [checkedResults, setCheckedResults] = useState(undefined);

  const containerRef = useRef(null);
  const currentGroupRef = useRef(currentGroup);
  let timerInterval = useRef(null);

  // Refs for pulse animations
  const scoreRef = useRef(null);
  const difficultyRef = useRef(null);
  const isFirstRender = useRef(true);

  // עדכון ref של currentGroup
  useEffect(() => {
    currentGroupRef.current = currentGroup;
    if (currentGroup) {
      console.log('Current group updated. Order:', currentGroup.sentences.map(s => s.id));
      setCheckedResults(undefined);
      setCheckButtonState("check");
    }
  }, [currentGroup]);

  // טעינת הנתונים והתחלת הקבוצה הראשונה
  useEffect(() => {
    fetch('data.json')
      .then((res) => res.json())
      .then((data) => {
        setGroups(data.groups);
        loadRandomGroupByDifficulty(data.groups, difficulty);
      })
      .catch((error) => {
        console.error('Error loading data:', error);
        setMessage('שגיאה בטעינת הנתונים');
      });
  }, []);

  // הפעלת טיימר בכל טעינה חדשה של קבוצה
  useEffect(() => {
    if (currentGroup) {
      const newStartTime = Date.now();
      setStartTime(newStartTime);
      setTimer(0);
      
      timerInterval.current = setInterval(() => {
        setTimer(Math.floor((Date.now() - newStartTime) / 1000));
      }, 1000);
    }
    
    return () => {
      if (timerInterval.current) clearInterval(timerInterval.current);
    };
  }, [currentGroup]); // הסר את startTime מהדפנדנסיז

  // אנימציית ניקוד – עדכון displayedScore בהדרגה כאשר score משתנה, עם רטט דינמי במקביל
  useEffect(() => {
    if (score === displayedScore) return;
    const duration = 1000; // משך האנימציה
    const start = displayedScore;
    const end = score;
    const startTimeAnim = performance.now();
    let lastVibrationTime = startTimeAnim;
    function animate(time) {
      const elapsed = time - startTimeAnim;
      const progress = Math.min(elapsed / duration, 1);
      const current = Math.floor(start + (end - start) * (progress * progress));
      setDisplayedScore(current);
      
      // מרווח רטט דינמי: בתחילה מהיר ובהמשך מתארך (מ-50ms ועד 200ms)
      const dynamicInterval = 50 + 150 * progress;
      if (time - lastVibrationTime >= dynamicInterval) {
        if (navigator.vibrate) {
          navigator.vibrate(20);
        }
        lastVibrationTime = time;
      }
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    }
    requestAnimationFrame(animate);
  }, [score]);

  // אנימציית פעימה לניקוד (לא בהתחלה)
  useEffect(() => {
    if (isFirstRender.current) return;
    if (scoreRef.current) {
      scoreRef.current.classList.add('pulse');
      setTimeout(() => {
        scoreRef.current && scoreRef.current.classList.remove('pulse');
      }, 1000);
    }
  }, [score]);

  // אנימציית פעימה לרמה (לא בהתחלה)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (difficultyRef.current) {
      difficultyRef.current.classList.add('pulse');
      setTimeout(() => {
        difficultyRef.current && difficultyRef.current.classList.remove('pulse');
      }, 1000);
    }
  }, [difficulty]);

  // אתחול SortableJS – instance נוצר פעם אחת
  useEffect(() => {
    if (containerRef.current && window.Sortable) {
      console.log('Creating Sortable on:', containerRef.current);
      const sortable = new Sortable(containerRef.current, {
        animation: 150,
        swap: true,
        swapClass: 'swap-highlight',
        draggable: '.text-box:not(.fixed)',
        filter: '.fixed',
        onMove: function (evt, originalEvent) {
          if (evt.related && evt.related.classList.contains('fixed')) return false;
          return true;
        },
        onStart: function(e) {
          // רטט קצר בעת התחלת גרירה
          if (navigator.vibrate) navigator.vibrate(30);
          console.log('onStart fired:', e);
        },
        onUpdate: function (e) {
          if (!currentGroupRef.current) return;
          const newOrder = Array.from(e.to.children).map(child =>
            child.getAttribute('data-id')
          );
          console.log('onUpdate fired. New order from DOM:', newOrder);
          setCurrentGroup(prev => {
            const newSentences = newOrder.map(id =>
              prev.sentences.find(s => s.id === id)
            );
            console.log('Updated state order:', newSentences.map(s => s.id));
            // רטט קצר בעת שחרור תיבה
            if (navigator.vibrate) navigator.vibrate(50);
            return { ...prev, sentences: newSentences };
          });
        }
      });
      return () => { sortable.destroy(); };
    }
  }, []);

  function calculateScore({ timer, attempts, difficulty, totalSentences, lockedSentences }) {
    const baseScore = 100;
    const difficultyBonus = difficulty * 20;
    const lengthBonus = totalSentences * 15;
    const lockedPenalty = lockedSentences * 10;
    
    const timePenalty = timer * 2;
    const attemptsPenalty = Math.max(0, (attempts - 1) * 15);
  
    let score = baseScore + difficultyBonus + lengthBonus - lockedPenalty - timePenalty - attemptsPenalty;
  
    return Math.max(0, Math.floor(score));
  }  

  function getDifficultyText(diff) {
    if (diff <= 2) return "קל";
    if (diff <= 4) return "בינוני";
    return "קשה";
  }

  // בוחר תרגיל רנדומלי לפי רמת קושי מתוך המאגר
  function loadRandomGroupByDifficulty(groupsArray, diff) {
    const filtered = groupsArray.filter(g => g.difficulty === diff);
    if (!filtered.length) {
      setMessage('אין עוד תרגילים ברמה זו!');
      setFinished(true);
      setCurrentGroup(null);
      return;
    }
    const randomGroup = filtered[Math.floor(Math.random() * filtered.length)];
    const sentencesWithId = randomGroup.sentences.map((s, index) => ({
      ...s,
      id: String(index)
    }));
    const groupWithOrder = {
      ...randomGroup,
      sentences: sentencesWithId,
      // השומר את הסדר המקורי לפני ערבוב
      originalOrder: randomGroup.sentences.map((s, index) => String(index))
    };
    setCurrentGroup(shuffleGroup(groupWithOrder));
    setAttempts(0);
  }

  // ערבוב משפטים – ערבוב התיבות הגרירות תוך שמירה על התיבות הקבועות במקומן
  function shuffleGroup(group) {
    const total = group.sentences.length;
    const result = new Array(total).fill(null);
    const originalMovable = [];
    for (let i = 0; i < total; i++) {
      if (!group.sentences[i].movable) result[i] = group.sentences[i];
      else originalMovable.push(group.sentences[i]);
    }
    const movable = originalMovable.slice();
    for (let i = movable.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [movable[i], movable[j]] = [movable[j], movable[i]];
    }
    let same = true;
    for (let i = 0; i < movable.length; i++) {
      if (movable[i].id !== originalMovable[i].id) { same = false; break; }
    }
    if (same && movable.length > 1) [movable[0], movable[1]] = [movable[1], movable[0]];
    let movableIndex = 0;
    for (let i = 0; i < total; i++) {
      if (result[i] === null) result[i] = movable[movableIndex++];
    }
    return { ...group, sentences: result };
  }

  function checkOrder() {
    if (!currentGroup || finished) return;
    setAttempts(a => a + 1);
    setCheckButtonState("checking");
    const correctOrder = currentGroup.originalOrder;
    setCheckedResults(undefined);
  
    function updateBox(i) {
      if (i >= currentGroup.sentences.length) {
        const currentOrder = currentGroup.sentences.map(s => s.id);
        const allCorrect = JSON.stringify(currentOrder) === JSON.stringify(correctOrder);
  
        if (allCorrect) {
          setMessage('כל הכבוד! סדר נכון!');
          setCheckButtonState("ready"); // הכפתור עובר למצב "ready" וממתין ללחיצה
  
          // חישוב ניקוד לפי המודל החדש
          const totalSentences = currentGroup.sentences.length;
          const lockedSentences = currentGroup.sentences.filter(s => !s.movable).length;
          const earnedScore = calculateScore({
            timer,
            attempts,
            difficulty,
            totalSentences,
            lockedSentences
          });
          setScore(s => s + earnedScore);
  
          // עצירת הטיימר
          if (timerInterval.current) {
            clearInterval(timerInterval.current);
            timerInterval.current = null;
          }
  
          // רטט הצלחה: [100, 50, 100]ms
          if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        } else {
          setMessage('נסה שוב!');
          setCheckButtonState("check");
          if (navigator.vibrate) navigator.vibrate(200);
        }
        return;
      }
  
      const isCorrect = currentGroup.sentences[i].id === correctOrder[i];
      setTimeout(() => {
        setCheckedResults(prev => {
          const newResults = prev ? [...prev] : new Array(currentGroup.sentences.length).fill(null);
          newResults[i] = isCorrect;
          return newResults;
        });
        updateBox(i + 1);
      }, 250);
    }
  
    updateBox(0);
  }  

  // מעבר לשלב הבא – מתבצע בלחיצה על כפתור כאשר מצבו "ready"
  function nextLevel() {
    setCheckedResults(undefined);
    setMessage('');
    setCheckButtonState("check");
    const newDiff = difficulty + 1;
    loadRandomGroupByDifficulty(groups, newDiff);
    setDifficulty(newDiff);
  }

  function renderSentence(sentence, index) {
    const classes = [
      'text-box',
      'my-2',
      'w-full',
      'max-w-md',
      'rounded-2xl',
      'relative'
    ];
    if (checkedResults !== undefined && checkedResults[index] !== null) {
      if (checkedResults[index]) classes.push('correct');
      else classes.push('wrong');
    }
    if (!sentence.movable) classes.push('fixed');
  
    const iconText = sentence.movable ? "↕️" : "🔒";
    const isRTL = document.documentElement.getAttribute('dir') === 'rtl';
  
    return createElement(
      'div',
      { key: sentence.id, 'data-id': sentence.id, className: classes.join(' ') },
      createElement(
        'div',
        null,
        isRTL
          ? [
              createElement('span', { className: 'icon' }, iconText),
              createElement('span', { className: 'sentence-text' }, sentence.text)
            ]
          : [
              createElement('span', { className: 'sentence-text' }, sentence.text),
              createElement('span', { className: 'icon' }, iconText)
            ]
      )
    );
  }  

  // כותרת – עליון עם שם המשחק ורמת קושי, ותחתון עם ניסיונות, זמן וניקוד
  const headerTop = createElement(
    'div',
    { className: 'header-top flex items-center justify-between w-full max-w-md' },
    createElement('h1', { className: 'title text-2xl sm:text-3xl font-bold' }, 'שרשרת סיבות ⛓️‍💥‏‏'),
    createElement('div', { className: 'difficulty text-sm sm:text-base', ref: difficultyRef }, `רמה: ${getDifficultyText(difficulty)}`)
  );
  
  const headerBottom = createElement(
    'div',
    { className: 'header-bottom flex justify-between w-full max-w-md text-sm sm:text-base' },
    createElement('div', null, `ניסיונות: ${attempts}`),
    createElement('div', null, `זמן: ${String(timer).padStart(3, '0')}`),
    createElement('div', { ref: scoreRef }, `ניקוד: ${String(displayedScore).padStart(5, '0')}`)
  );

  const messagesArea = createElement(
    'div',
    { className: 'message text-center mt-2' },
    message ? message : '\u00A0'
  );

  const buttonText = checkButtonState === "ready" ? "מוכן לאתגר הבא?" : 
                     checkButtonState === "checking" ? "בודק..." : "בדיקה";

  const buttonDisabled = checkButtonState === "checking";

  const actionButton = createElement(
    'button',
    {
      className: checkButtonState === "ready" ? "check-button ready" : "check-button mt-4",
      onClick: () => {
        if (checkButtonState === "check") checkOrder();
        else if (checkButtonState === "ready") nextLevel();
      },
      disabled: buttonDisabled
    },
    buttonText
  );

  return createElement(
    'div',
    { className: 'container flex flex-col items-center justify-center min-h-screen gap-4 p-4' },
    headerTop,
    headerBottom,
    createElement(
      'div',
      { id: 'sortable-container', ref: containerRef, className: 'flex flex-col items-center' },
      currentGroup
        ? currentGroup.sentences.map((s, index) => renderSentence(s, index))
        : (finished ? 'סיימת את כל התרגילים!' : 'טוען...')
    ),
    actionButton,
    messagesArea
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(createElement(App));
