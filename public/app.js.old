const { createElement, useState, useEffect, useRef } = React;

// --- Firebase Setup ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";

// Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyAGFC_TB8iEMvS2PyxeASj1HH4i66AW4UA", // Make sure this is your correct key
    authDomain: "trivbio.firebaseapp.com",
    databaseURL: "https://trivbio-default-rtdb.firebaseio.com",
    projectId: "trivbio",
    storageBucket: "trivbio.appspot.com",
    messagingSenderId: "1097087574583",
    appId: "1:1097087574583:web:b36c0441537a1f596215b2",
    measurementId: "G-ZY245YB23E"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const groupsRef = ref(db, 'collections/groups');
// --- End of Firebase Setup ---


function App() {
  // --- State Variables ---
  const [groups, setGroups] = useState([]);
  const [currentGroup, setCurrentGroup] = useState(null);
  const [attempts, setAttempts] = useState(0);
  const [startTime, setStartTime] = useState(Date.now());
  const [timer, setTimer] = useState(0);
  const [difficulty, setDifficulty] = useState(1);
  const [message, setMessage] = useState('מאמת משתמש...');
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [checkButtonState, setCheckButtonState] = useState("check");
  const [checkedResults, setCheckedResults] = useState(undefined);
  const [currentUser, setCurrentUser] = useState(null);
  const [userName, setUserName] = useState(''); // Kept but not displayed
  const [isLoading, setIsLoading] = useState(true);
  // *** State for toast notifications ***
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // --- Refs ---
  const containerRef = useRef(null);
  const currentGroupRef = useRef(currentGroup);
  let timerInterval = useRef(null);
  const scoreRef = useRef(null); // Still used for score display pulse
  const difficultyRef = useRef(null);
  const isFirstRender = useRef(true);
  const initialGroupLoadDone = useRef(false);

  // --- useEffect Hooks ---

  // Update currentGroupRef when currentGroup changes
  useEffect(() => {
    currentGroupRef.current = currentGroup;
    if (currentGroup) {
      console.log('Current group updated. Order:', currentGroup.sentences.map(s => s.id));
      setCheckedResults(undefined);
      setCheckButtonState("check");
    }
  }, [currentGroup]);

  // Combined Auth and Data Loading useEffect
  useEffect(() => {
    setIsLoading(true);
    setMessage('מאמת משתמש...');
    let dataUnsubscribe = null;

    const authUnsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);

      if (user) {
        setUserName(user.displayName || user.email || 'אורח');
        console.log("Auth state changed: User is signed in:", user.uid);
        setMessage('טוען נתונים...');

        if (dataUnsubscribe) {
            dataUnsubscribe();
            dataUnsubscribe = null;
        }
        initialGroupLoadDone.current = false;

        dataUnsubscribe = onValue(groupsRef, (snapshot) => {
          const groupsData = snapshot.val() || [];
          console.log("Data received from Firebase:", groupsData);

          if (Array.isArray(groupsData) && groupsData.length > 0) {
            const processedGroups = groupsData.map((group, groupIndex) => ({
              ...group,
              sentences: Array.isArray(group.sentences)
                ? group.sentences.map((sentence, sentenceIndex) => ({
                    text: sentence.text || '',
                    movable: sentence.movable !== undefined ? sentence.movable : true,
                    id: String(sentence.id ?? `${groupIndex}-${sentenceIndex}`)
                  }))
                : []
            }));
            setGroups(processedGroups);

            if (!initialGroupLoadDone.current && processedGroups.length > 0) {
                loadRandomGroupByDifficulty(processedGroups, difficulty);
                initialGroupLoadDone.current = true;
                setMessage('');
                setIsLoading(false);
            } else if (processedGroups.length === 0) {
                setMessage('לא נמצאו קבוצות משחק במסד הנתונים.');
                setCurrentGroup(null); setFinished(true); setIsLoading(false);
            } else if (!initialGroupLoadDone.current && processedGroups.length === 0) {
                 setMessage('לא נמצאו קבוצות משחק במסד הנתונים.');
                 setCurrentGroup(null); setFinished(true); setIsLoading(false);
                 initialGroupLoadDone.current = true;
            } else {
                 console.log("Firebase data updated. Available groups list refreshed.");
            }
          } else {
            console.warn("No groups data found in Firebase or data is not an array.");
            setGroups([]); setMessage('לא נמצאו קבוצות משחק במסד הנתונים.');
            setCurrentGroup(null); setFinished(true); setIsLoading(false);
          }
        }, (error) => {
          console.error('Error fetching groups from Firebase:', error);
          setMessage(`שגיאה בטעינת הנתונים: ${error.code === 'PERMISSION_DENIED' ? 'יש לוודא שהרשאות הקריאה ב-Firebase תקינות.' : error.message}`);
          setGroups([]); setCurrentGroup(null); setFinished(true); setIsLoading(false);
          if (dataUnsubscribe) { dataUnsubscribe(); dataUnsubscribe = null; }
        });

      } else {
        console.log("Auth state changed: User is signed out.");
        setUserName(''); setGroups([]); setCurrentGroup(null); setFinished(false);
        setMessage('מתחבר באופן אנונימי...'); setIsLoading(true);
        if (dataUnsubscribe) { dataUnsubscribe(); dataUnsubscribe = null; }
        signInAnonymously(auth).catch(error => {
            console.error("Anonymous sign-in failed:", error);
            setMessage('התחברות אנונימית נכשלה. נסה לרענן.'); setIsLoading(false);
        });
      }
    });

    return () => {
      console.log("Cleaning up listeners...");
      authUnsubscribe();
      if (dataUnsubscribe) dataUnsubscribe();
    };
  }, []); // Run only once on mount

  // Timer useEffect
  useEffect(() => {
    if (currentGroup && !isLoading) {
      const newStartTime = Date.now();
      setStartTime(newStartTime);
      setTimer(0);
      if (timerInterval.current) clearInterval(timerInterval.current);
      timerInterval.current = setInterval(() => { setTimer(prevTimer => prevTimer + 1); }, 1000);
    } else {
        if (timerInterval.current) { clearInterval(timerInterval.current); timerInterval.current = null; }
    }
    return () => { if (timerInterval.current) clearInterval(timerInterval.current); };
  }, [currentGroup, isLoading]);


  // Score Pulse Animation useEffect (No animation for score value itself)
  useEffect(() => {
    if (isFirstRender.current && score === 0) return;
    if (scoreRef.current) {
      scoreRef.current.classList.remove('pulse');
      void scoreRef.current.offsetWidth;
      scoreRef.current.classList.add('pulse');
      const timeoutId = setTimeout(() => {
        scoreRef.current && scoreRef.current.classList.remove('pulse');
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [score]);

  // Difficulty Pulse Animation useEffect
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    if (difficultyRef.current) {
       difficultyRef.current.classList.remove('pulse');
       void difficultyRef.current.offsetWidth;
       difficultyRef.current.classList.add('pulse');
       const timeoutId = setTimeout(() => {
         difficultyRef.current && difficultyRef.current.classList.remove('pulse');
       }, 1000);
       return () => clearTimeout(timeoutId);
    }
  }, [difficulty]);

  // SortableJS Initialization useEffect - Vibration Adjusted
  useEffect(() => {
    let sortableInstance = null;
    if (containerRef.current && window.Sortable && !isLoading && currentGroup) {
        sortableInstance = new Sortable(containerRef.current, {
            animation: 150, swap: true, swapClass: 'swap-highlight',
            draggable: '.text-box:not(.fixed)', filter: '.fixed',
            onMove: (evt) => !evt.related?.classList.contains('fixed'),
            onStart: () => { if (navigator.vibrate) navigator.vibrate(10); }, // Subtle
            onUpdate: (e) => {
              if (checkButtonState === 'checking') return;
              if (!currentGroupRef.current) return;
              const newOrder = Array.from(e.to.children).map(child => child.getAttribute('data-id'));
              setCurrentGroup(prev => {
                 if (!prev) return prev;
                 const newSentences = newOrder.map(id => prev.sentences.find(s => s.id === id)).filter(Boolean);
                 if (newSentences.length !== prev.sentences.length) { console.error("ID mismatch!"); return prev; }
                 if (navigator.vibrate) navigator.vibrate(15); // Subtle
                 return { ...prev, sentences: newSentences };
              });
            }
        });
    }
    return () => { if (sortableInstance) sortableInstance.destroy(); };
  }, [isLoading, currentGroup, checkButtonState]);

  // useEffect for hiding toast automatically
  useEffect(() => {
    if (toast.show) {
      const timerId = setTimeout(() => {
        setToast(prev => ({ ...prev, show: false }));
      }, 3000); // Hide after 3 seconds
      return () => clearTimeout(timerId);
    }
  }, [toast]);

  // --- Helper Functions ---

  function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  function calculateScore({ timer, attempts, difficulty, totalSentences, lockedSentences }) {
    const baseScore = 100; const difficultyBonus = difficulty * 20;
    const lengthBonus = totalSentences * 15; const lockedPenalty = lockedSentences * 10;
    const timePenalty = timer * 2; const attemptsPenalty = Math.max(0, (attempts - 1) * 15);
    let currentScore = baseScore + difficultyBonus + lengthBonus - lockedPenalty - timePenalty - attemptsPenalty;
    return Math.max(0, Math.floor(currentScore));
  }

  function getDifficultyText(diff) {
    if (diff <= 2) return "קל"; if (diff <= 4) return "בינוני"; return "קשה";
  }

  function loadRandomGroupByDifficulty(groupsArray, diff) {
    if (!groupsArray || groupsArray.length === 0) {
      setMessage('לא נמצאו קבוצות משחק זמינות.'); setCurrentGroup(null); setFinished(true); return;
    }
    const filtered = groupsArray.filter(g => g.difficulty === diff); let randomGroup = null;
    if (filtered.length > 0) { randomGroup = filtered[Math.floor(Math.random() * filtered.length)]; }
    else {
        const availableGroups = groupsArray.filter(g => g.sentences && g.sentences.length > 0);
        if (availableGroups.length > 0) {
            randomGroup = availableGroups[Math.floor(Math.random() * availableGroups.length)];
            console.warn(`No groups at diff ${diff}. Loading random from diff ${randomGroup.difficulty}`);
            if (randomGroup.difficulty !== diff) setDifficulty(randomGroup.difficulty);
        }
    }
    if (randomGroup) {
         if (!randomGroup.sentences || !randomGroup.sentences.every(s => s && s.id !== undefined && s.text !== undefined && s.movable !== undefined)) {
             console.error("Invalid group structure:", randomGroup); setMessage("שגיאה בנתוני הקבוצה.");
             setCurrentGroup(null); setFinished(true); return;
         }
         const groupWithOrder = { ...randomGroup, originalOrder: randomGroup.sentences.map(s => s.id) };
         setAttempts(0); setMessage(''); setFinished(false);
         setCurrentGroup(shuffleGroup(groupWithOrder));
    } else {
        setMessage('לא נמצאו קבוצות משחק זמינות.'); setFinished(true); setCurrentGroup(null);
    }
  }

  function shuffleGroup(group) {
    if (!group || !Array.isArray(group.sentences) || group.sentences.length === 0) return group;
    const sentencesCopy = [...group.sentences]; const total = sentencesCopy.length;
    const result = new Array(total).fill(null); const originalMovable = [];
    for (let i = 0; i < total; i++) {
      const sentence = sentencesCopy[i];
      if (sentence && sentence.movable !== undefined) { if (!sentence.movable) result[i] = sentence; else originalMovable.push(sentence); }
      else { console.warn("Invalid sentence:", sentence); result[i] = sentence; }
    }
    const movable = originalMovable.slice();
    for (let i = movable.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [movable[i], movable[j]] = [movable[j], movable[i]]; }
    let same = movable.length > 0 && movable.every((item, i) => item.id === originalMovable[i].id);
    if (same && movable.length > 1) {
        const firstMovableIndex = sentencesCopy.findIndex(s => s && s.movable);
        const secondMovableIndex = sentencesCopy.findIndex((s, idx) => s && s.movable && idx > firstMovableIndex);
        if (firstMovableIndex !== -1 && secondMovableIndex !== -1) [movable[0], movable[1]] = [movable[1], movable[0]];
    }
    let movableIndex = 0;
    for (let i = 0; i < total; i++) {
      if (result[i] === null) {
          if (movableIndex < movable.length) result[i] = movable[movableIndex++];
          else result[i] = sentencesCopy.find(s => s !== null) || {id:`error-${i}`, text:"שגיאת ערבוב", movable:true};
      }
    }
     if (result.some(item => item === null)) { console.error("Shuffle result has nulls!"); return group; }
    return { ...group, sentences: result };
  }

  // Modified checkOrder for sequential feedback and TOASTS - Vibration Adjusted
  function checkOrder() {
    if (isLoading || !currentGroup || finished || checkButtonState !== 'check') return;
    setAttempts(a => a + 1); setCheckButtonState("checking"); setMessage("בודק...");
    const correctOrder = currentGroup.originalOrder; const currentSentences = currentGroupRef.current.sentences;
    const results = []; const checkDelay = 350;
    setCheckedResults(new Array(currentSentences.length).fill(null)); // Reset visuals

    function checkSentenceAtIndex(index) {
      if (index >= currentSentences.length) { const allCorrect = results.every(res => res === true); finalizeCheck(allCorrect); return; }
      const sentence = currentSentences[index]; const isCorrect = sentence && sentence.id === correctOrder[index];
      results[index] = isCorrect;
      setCheckedResults(prev => {
          const newResults = [...(prev || new Array(currentSentences.length).fill(null))]; newResults[index] = isCorrect; return newResults;
      });
       if (navigator.vibrate) navigator.vibrate(isCorrect ? 5 : 10); // Subtle vibration
      setTimeout(() => { checkSentenceAtIndex(index + 1); }, checkDelay);
    }

    function finalizeCheck(allCorrect) {
        if (allCorrect) {
          //setMessage('כל הכבוד! סדר נכון!'); // Message replaced by toast
          setCheckButtonState("ready");
          const totalSentences = currentGroup.sentences.length; const lockedSentences = currentGroup.sentences.filter(s => !s.movable).length;
          const earnedScore = calculateScore({ timer, attempts, difficulty, totalSentences, lockedSentences });
          setScore(s => s + earnedScore);
          setToast({ show: true, message: `✅ כל הכבוד! ${earnedScore}+ נק'`, type: 'success' }); // Success Toast
          if (timerInterval.current) { clearInterval(timerInterval.current); timerInterval.current = null; }
          if (navigator.vibrate) navigator.vibrate(15); // Subtle success vibration
        } else {
          setMessage('נסה שוב!'); // Keep main message for errors
          setCheckButtonState("check");
          // Optional error toast: setToast({ show: true, message: '❌ יש טעויות בסידור', type: 'error' });
        }
    }
    checkSentenceAtIndex(0);
  }

  // Modified nextLevel to show toast
  function nextLevel() {
    if (isLoading || checkButtonState !== 'ready') return;
    setCheckedResults(undefined); setMessage(''); setCheckButtonState("check");
    const availableDifficulties = Array.from(new Set(groups.map(g => g.difficulty))).sort((a, b) => a - b);
    const currentDifficultyIndex = availableDifficulties.indexOf(difficulty); let nextDiff;
    if (currentDifficultyIndex === -1 || currentDifficultyIndex >= availableDifficulties.length - 1) {
        nextDiff = availableDifficulties[0] || 1; console.log("Wrapping difficulty");
    } else { nextDiff = availableDifficulties[currentDifficultyIndex + 1]; }
    if (nextDiff !== difficulty) {
        setToast({ show: true, message: `🚀 עברת לרמה ${getDifficultyText(nextDiff)}!`, type: 'info' }); // Level up toast
    }
    setDifficulty(nextDiff); loadRandomGroupByDifficulty(groups, nextDiff);
}

  // Modified renderSentence for Emojis
  function renderSentence(sentence, index) {
    const classes = [
      'text-box', 'my-2', 'w-full', 'max-w-md', 'rounded-2xl', 'relative', 'flex', 'items-center', 'p-3', 'transition-colors', 'duration-300', 'shadow', 'no-select'
    ];
    if (checkedResults !== undefined && checkedResults[index] !== null) { classes.push(checkedResults[index] ? 'correct' : 'wrong'); }
    if (sentence && !sentence.movable) { classes.push('fixed'); }
    const iconText = sentence.movable ? "↕️" : "🔒";
    return createElement(
      'div', { key: sentence.id, 'data-id': sentence.id, className: classes.join(' ') },
      createElement('span', { className: 'icon ml-2 text-xl flex-shrink-0' }, iconText),
      createElement('span', { className: 'sentence-text flex-grow break-words select-text' }, sentence.text)
    );
  }

  // --- JSX-like Rendering ---

  // Simple Toast Component Definition
  const ToastComponent = toast.show ? createElement(
      'div', {
        className: `toast fixed top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 p-4 rounded-lg shadow-lg text-white text-base z-50 transition-all duration-300 ease-out ${
          toast.type === 'success' ? 'bg-green-500' : toast.type === 'info' ? 'bg-blue-500' : 'bg-red-500' // Error type added
          } ${toast.show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}` // Added slide-in effect
      }, toast.message
  ) : null;

  // Header without user name
  const headerTop = createElement(
    'div', { className: 'header-top flex items-center justify-between w-full max-w-md px-1' },
    createElement('h1', { className: 'title text-2xl sm:text-3xl font-bold text-center flex-grow' }, 'שרשרת סיבות ⛓️‍💥‏‏'),
    createElement('div', { className: 'difficulty text-sm sm:text-base', ref: difficultyRef }, `רמה: ${getDifficultyText(difficulty)}`)
  );

  // Header with formatted time and direct score
  const headerBottom = createElement(
    'div', { className: 'header-bottom flex justify-between w-full max-w-md text-sm sm:text-base px-1' },
    createElement('div', null, `ניסיונות: ${attempts}`),
    createElement('div', null, `זמן: ${formatTime(timer)}`),
    createElement('div', { ref: scoreRef }, `ניקוד: ${String(score).padStart(5, '0')}`)
  );

  const messagesArea = createElement(
    'div', { className: 'message text-center my-2 min-h-[1.5em]' }, message ? message : '\u00A0'
  );

  const gameInstructions = !isLoading && currentGroup ? createElement(
    'div', { className: 'instructions text-center w-full max-w-md mb-3 px-2' },
    createElement('h3', { className: 'text-lg font-semibold text-gray-800 dark:text-gray-200' }, `משפטים בנושא: ${currentGroup.topic || 'כללי'}`),
    createElement('p', { className: 'text-sm text-gray-600 dark:text-gray-400' }, 'סדר/י את המשפטים הבאים לפי שרשרת של סיבות ותוצאה')
  ) : null;

  const buttonText = checkButtonState === "ready" ? "מוכן לאתגר הבא?" : checkButtonState === "checking" ? "בודק..." : "בדיקה";
  const buttonDisabled = isLoading || checkButtonState === "checking" || (finished && !currentGroup);
  const actionButton = createElement(
    'button', {
      className: `check-button mt-4 py-2 px-6 text-lg rounded-full font-semibold transition-opacity duration-300 ${checkButtonState === "ready" ? "ready" : ""} ${buttonDisabled ? "opacity-50 cursor-not-allowed" : "hover:opacity-90"}`,
      onClick: () => { if (checkButtonState === "check") checkOrder(); else if (checkButtonState === "ready") nextLevel(); },
      disabled: buttonDisabled
    }, buttonText
  );

  // --- Main Return - Added Padding p-6 ---
  return createElement(
    'div', { className: 'container flex flex-col items-center justify-start pt-5 min-h-screen gap-3 p-6 relative' },
    headerTop,
    headerBottom,
    messagesArea,
    gameInstructions,
    createElement(
      'div', { id: 'sortable-container', ref: containerRef, className: `flex flex-col items-center w-full max-w-md ${isLoading ? 'min-h-[200px]' : ''}` },
       isLoading
        ? createElement('div', { className: 'text-center p-4 text-gray-500 dark:text-gray-400' }, message || 'טוען...')
        : currentGroup
          ? currentGroup.sentences.map((s, index) => renderSentence(s, index))
          : createElement('div', { className: 'text-center p-4 text-gray-500 dark:text-gray-400' }, finished ? 'סיימת את כל התרגילים!' : message || 'לא נמצאו קבוצות.')
    ),
    !isLoading && (currentGroup || finished) && actionButton,
    // Render Toast Component
    ToastComponent
  );
}

// Render the App
ReactDOM.createRoot(document.getElementById('root')).render(createElement(App));