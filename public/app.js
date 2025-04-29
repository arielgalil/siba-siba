const { createElement, useState, useEffect, useRef } = React;

// --- Firebase Setup ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";

// Firebase config (כפי שהיה)
const firebaseConfig = {
    apiKey: "AIzaSyAGFC_TB8iEMvS2PyxeASj1HH4i66AW4UA", authDomain: "trivbio.firebaseapp.com", databaseURL: "https://trivbio-default-rtdb.firebaseio.com", projectId: "trivbio", storageBucket: "trivbio.appspot.com", messagingSenderId: "1097087574583", appId: "1:1097087574583:web:b36c0441537a1f596215b2", measurementId: "G-ZY245YB23E"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const groupsRef = ref(db, 'collections/groups');
// --- End of Firebase Setup ---

// #############################################
// ### GameSetup Component Definition        ###
// #############################################
const { useState: useStateSetup, useEffect: useEffectSetup } = React; // Alias useState and useEffect

// GameSetup Component - מקבלת allGroups כ-prop
function GameSetup({ initialDifficultyRange, initialTopics, onStartGame, allGroups }) {
  const [difficultyKey, setDifficultyKey] = useStateSetup(() => { /* ... קביעת ברירת מחדל ... */ if (initialDifficultyRange.min === 1 && initialDifficultyRange.max === 2) return 'easy'; if (initialDifficultyRange.min === 2 && initialDifficultyRange.max === 4) return 'medium'; if (initialDifficultyRange.min === 4 && initialDifficultyRange.max === 5) return 'hard'; return 'all'; });
  const [selectedTopicsInternal, setSelectedTopicsInternal] = useStateSetup(new Set(initialTopics));
  const [availableCount, setAvailableCount] = useStateSetup(0); // לספירת תרגולים

  const difficultyOptions = { easy: { label: 'קל', range: { min: 1, max: 2 } }, medium: { label: 'בינוני', range: { min: 2, max: 4 } }, hard: { label: 'קשה', range: { min: 4, max: 5 } }, all: { label: 'הכל', range: { min: 1, max: 5 } } };
  const availableTopics = ['כללי', 'מעבדה', 'התא', 'אקולוגיה', 'גוף האדם'];

  // useEffect לספירת תרגולים זמינים
  useEffectSetup(() => {
      if (!allGroups || allGroups.length === 0) { setAvailableCount(0); return; }
      const currentRange = difficultyOptions[difficultyKey].range;
      const filtered = allGroups.filter(g => { const difficultyMatch = g.difficulty >= currentRange.min && g.difficulty <= currentRange.max; if (selectedTopicsInternal.size === 0) return false; const topicMatch = selectedTopicsInternal.has(g.topic || 'כללי'); return difficultyMatch && topicMatch; });
      setAvailableCount(filtered.length);
  }, [difficultyKey, selectedTopicsInternal, allGroups, difficultyOptions]);

  const handleDifficultyChange = (key) => { setDifficultyKey(key); };
  const handleTopicToggle = (topic) => { setSelectedTopicsInternal(prevTopics => { const newTopics = new Set(prevTopics); if (newTopics.has(topic)) { newTopics.delete(topic); } else { newTopics.add(topic); } return newTopics; }); };
  const handleStartClick = () => { if (selectedTopicsInternal.size === 0) { alert('יש לבחור לפחות נושא אחד'); return; } onStartGame(difficultyOptions[difficultyKey].range, selectedTopicsInternal); };

  // ======================================================
  // === הגדרה מלאה ומתוקנת של SelectionButton ===
  // ======================================================
  const SelectionButton = ({ text, isSelected, type, onClick }) => {
    const baseClasses = "flex items-center justify-center space-x-2 space-x-reverse px-4 py-2 border rounded-lg cursor-pointer transition-colors duration-200 w-full text-center text-sm sm:text-base";
    const selectedClasses = "bg-blue-500 border-blue-700 text-white dark:bg-blue-600 dark:border-blue-800";
    const unselectedClasses = "bg-gray-100 border-gray-300 text-gray-800 hover:bg-gray-200 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-600";

    return createElement(
      'button',
      { type: 'button', className: `${baseClasses} ${isSelected ? selectedClasses : unselectedClasses}`, onClick: onClick },
      // אינדיקטור ויזואלי (רדיו/צ'קבוקס) - עם תיקון יישור
      createElement('span', {
          // *** ה-Parent הוא flex שממרכז ***
          className: `inline-flex items-center justify-center w-4 h-4 border rounded-${type === 'radio' ? 'full' : 'sm'} mr-2 flex-shrink-0 ${
              isSelected
                ? 'bg-white border-blue-500 dark:bg-gray-200 dark:border-blue-600'
                : 'border-gray-400 dark:border-gray-500'
          } ring-1 ring-inset ${isSelected ? 'ring-blue-300 dark:ring-blue-700' : 'ring-transparent'}`
      },
        // סימון פנימי אם נבחר
        isSelected && createElement('span', {
             // *** ה-className כאן קובע את צורת הסימון הפנימי (עיגול או ריבוע) ***
            className: `block w-2 h-2 rounded-${type === 'radio' ? 'full' : 'sm'} ${ // <--- זה החלק שהיה חסר לך?
                isSelected ? 'bg-blue-500 dark:bg-blue-600' : ''
            }`
        })
      ),
      // טקסט הכפתור
      createElement('span', { className: 'flex-grow' }, text)
    );
  };
  // ======================================================
  // === סוף הגדרת SelectionButton ===
  // ======================================================


  // --- Render Setup Screen ---
  return createElement('div', { className: 'w-full max-w-lg mx-auto p-4 sm:p-6 bg-white dark:bg-gray-800 shadow-md rounded-lg' },
    createElement('h2', { className: 'text-xl sm:text-2xl font-semibold text-center mb-4 text-gray-900 dark:text-gray-100' }, 'הגדרות משחק'),
    createElement('div', { className: 'mb-6' }, createElement('h3', { className: 'text-lg font-medium mb-2 text-gray-800 dark:text-gray-200' }, 'בחר רמת קושי:'), createElement('div', { className: 'grid grid-cols-2 sm:grid-cols-4 gap-3' }, Object.entries(difficultyOptions).map(([key, { label }]) => createElement(SelectionButton, { key: key, text: label, isSelected: difficultyKey === key, type: 'radio', onClick: () => handleDifficultyChange(key) })))),
    createElement('div', { className: 'mb-6' }, createElement('h3', { className: 'text-lg font-medium mb-2 text-gray-800 dark:text-gray-200' }, 'בחר נושאים (אחד או יותר):'), createElement('div', { className: 'grid grid-cols-2 sm:grid-cols-3 gap-3' }, availableTopics.map(topic => createElement(SelectionButton, { key: topic, text: topic, isSelected: selectedTopicsInternal.has(topic), type: 'checkbox', onClick: () => handleTopicToggle(topic) })))),
    // --- כפתור התחלה עם מספר תרגולים (ותיקון רווח) ---
    createElement('button', {
        className: `w-full py-3 px-6 text-lg font-semibold rounded-lg transition-opacity duration-300 flex items-center justify-center ${ selectedTopicsInternal.size === 0 || availableCount === 0 ? 'bg-gray-400 text-gray-700 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400' : 'bg-green-500 text-white hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700' }`,
        onClick: handleStartClick,
        disabled: selectedTopicsInternal.size === 0 || availableCount === 0
      },
      createElement('span', null, 'התחל משחק'),
      availableCount > 0 && createElement('span', { className: 'text-xs font-normal opacity-80 mr-2' }, `[${availableCount} ${availableCount === 1 ? 'תרגול' : 'תרגולים'}]`) // שימוש ב-mr-2 לרווח
    )
    // ---------------------------------
  );
}
// #############################################
// ### End of GameSetup Component Definition ###
// #############################################


// #############################################
// ### Main App Component                    ###
// #############################################
function App() {
  // --- State Variables ---
  const [groups, setGroups] = useState([]);
  const [currentGroup, setCurrentGroup] = useState(null);
  const [attempts, setAttempts] = useState(0);
  const [startTime, setStartTime] = useState(Date.now());
  const [timer, setTimer] = useState(0);
  const [message, setMessage] = useState('מאמת משתמש...');
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [checkButtonState, setCheckButtonState] = useState("check");
  const [checkedResults, setCheckedResults] = useState(undefined);
  const [currentUser, setCurrentUser] = useState(null);
  const [userName, setUserName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [gameState, setGameState] = useState('setup');
  const [selectedDifficultyRange, setSelectedDifficultyRange] = useState({ min: 1, max: 2 });
  const [selectedTopics, setSelectedTopics] = useState(new Set(['מעבדה']));
  const [availableGameGroups, setAvailableGameGroups] = useState([]);
  const [currentGroupIndex, setCurrentGroupIndex] = useState(-1);

  // --- Refs ---
  const containerRef = useRef(null);
  const currentGroupRef = useRef(currentGroup);
  let timerInterval = useRef(null);
  const scoreRef = useRef(null);
  const isFirstRender = useRef(true);
  const initialGroupLoadDone = useRef(false);

  // --- useEffect Hooks (ללא שינוי) ---
  useEffect(() => { currentGroupRef.current = currentGroup; }, [currentGroup]);
  useEffect(() => { // Auth and Data Loading
    setIsLoading(true); setMessage('מאמת משתמש...'); let dataUnsubscribe = null;
    const authUnsubscribe = onAuthStateChanged(auth, (user) => { setCurrentUser(user); if (user) { setUserName(user.displayName || user.email || 'אורח'); if (groups.length === 0 || !initialGroupLoadDone.current) { setMessage('טוען נתונים...'); setIsLoading(true); if (dataUnsubscribe) dataUnsubscribe(); dataUnsubscribe = onValue(groupsRef, (snapshot) => { const groupsData = snapshot.val() || []; if (Array.isArray(groupsData)) { const processedGroups = groupsData.map((group, groupIndex) => ({ ...group, topic: group.topic || 'כללי', sentences: Array.isArray(group.sentences) ? group.sentences.map((sentence, sentenceIndex) => ({ text: sentence.text || '', movable: sentence.movable !== undefined ? sentence.movable : true, id: String(sentence.id ?? `${groupIndex}-${sentenceIndex}`) })) : [] })).filter(g => g.sentences && g.sentences.length > 0 && g.difficulty); setGroups(processedGroups); initialGroupLoadDone.current = true; setIsLoading(false); setMessage(''); if (gameState === 'playing' && processedGroups.length === 0) { setGameState('setup'); setToast({ show: true, message: '🤔 אין נתונים למשחק, חזרנו להגדרות.', type: 'info' }); } else if (processedGroups.length === 0) { setToast({ show: true, message: '🤷‍♀️ אין קבוצות משחק.', type: 'info' }); } } else { setGroups([]); initialGroupLoadDone.current = true; setIsLoading(false); setMessage(''); setToast({ show: true, message: '🤷‍♀️ לא הצלחנו לטעון נתונים.', type: 'error' }); setGameState('setup'); } }, (error) => { console.error('Error fetching groups:', error); setMessage(`שגיאה בטעינה: ${error.message}`); setGroups([]); setCurrentGroup(null); setFinished(true); setIsLoading(false); initialGroupLoadDone.current = true; setGameState('setup'); if (dataUnsubscribe) dataUnsubscribe(); }); } else { setIsLoading(false); setMessage(''); } } else { setUserName(''); setGroups([]); setCurrentGroup(null); setFinished(false); setGameState('setup'); setMessage('מתחבר אנונימי...'); setIsLoading(true); initialGroupLoadDone.current = false; if (dataUnsubscribe) dataUnsubscribe(); signInAnonymously(auth).catch(error => { console.error("Anon sign-in failed:", error); setMessage('התחברות אנונימית נכשלה.'); setIsLoading(false); }); } });
    return () => { console.log("Cleaning up listeners..."); authUnsubscribe(); if (dataUnsubscribe) dataUnsubscribe(); };
  }, []);
  useEffect(() => { // Timer
    if (gameState === 'playing' && currentGroup && !isLoading) { const newStartTime = Date.now(); setStartTime(newStartTime); setTimer(0); if (timerInterval.current) clearInterval(timerInterval.current); timerInterval.current = setInterval(() => { setTimer(prevTimer => prevTimer + 1); }, 1000); } else { if (timerInterval.current) { clearInterval(timerInterval.current); timerInterval.current = null; } } return () => { if (timerInterval.current) clearInterval(timerInterval.current); }; }, [gameState, currentGroup, isLoading]);
  useEffect(() => { /* Score Pulse ... */ if (isFirstRender.current && score === 0) return; if (scoreRef.current) { scoreRef.current.classList.remove('pulse'); void scoreRef.current.offsetWidth; scoreRef.current.classList.add('pulse'); const timeoutId = setTimeout(() => { scoreRef.current && scoreRef.current.classList.remove('pulse'); }, 1000); return () => clearTimeout(timeoutId); } }, [score]);
  useEffect(() => { /* SortableJS ... */ let sortableInstance = null; if (gameState === 'playing' && containerRef.current && window.Sortable && !isLoading && currentGroup) { sortableInstance = new Sortable(containerRef.current, { animation: 150, swap: true, swapClass: 'swap-highlight', draggable: '.text-box:not(.fixed)', filter: '.fixed', onMove: (evt) => !evt.related?.classList.contains('fixed'), onStart: () => { if (navigator.vibrate) navigator.vibrate(10); }, onUpdate: (e) => { if (checkButtonState === 'checking') return; if (!currentGroupRef.current) return; const newOrder = Array.from(e.to.children).map(child => child.getAttribute('data-id')); setCurrentGroup(prev => { if (!prev) return prev; const newSentences = newOrder.map(id => prev.sentences.find(s => s.id === id)).filter(Boolean); if (newSentences.length !== prev.sentences.length || newSentences.some(s => !s)) { console.error("ID mismatch!"); return prev; } if (navigator.vibrate) navigator.vibrate(15); return { ...prev, sentences: newSentences }; }); } }); } return () => { if (sortableInstance) sortableInstance.destroy(); }; }, [gameState, isLoading, currentGroup, checkButtonState]);
  useEffect(() => { /* Toast Hiding ... */ if (toast.show) { const timerId = setTimeout(() => { setToast(prev => ({ ...prev, show: false })); }, 3500); return () => clearTimeout(timerId); } }, [toast]);


  // --- Helper Functions (ללא שינוי) ---
  function formatTime(totalSeconds) { /* ... */ const minutes = Math.floor(totalSeconds / 60); const seconds = totalSeconds % 60; return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`; }
  function calculateScore({ timer, attempts, difficultyRange, totalSentences, lockedSentences }) { /* ... */ const difficultyValue = difficultyRange.max || 1; const baseScore = 100; const difficultyBonus = difficultyValue * 20; const lengthBonus = totalSentences * 15; const lockedPenalty = lockedSentences * 10; const timePenalty = timer * 2; const attemptsPenalty = Math.max(0, (attempts - 1) * 15); let currentScore = baseScore + difficultyBonus + lengthBonus - lockedPenalty - timePenalty - attemptsPenalty; return Math.max(0, Math.floor(currentScore)); }
  function getDifficultyText(range) { /* ... */ if (!range) return "לא ידוע"; if (range.min === 1 && range.max === 2) return "קל"; if (range.min === 2 && range.max === 4) return "בינוני"; if (range.min === 4 && range.max === 5) return "קשה"; if (range.min === 1 && range.max === 5) return "הכל"; return `${range.min}-${range.max}`; }
  function shuffleGroup(group) { /* ... */ if (!group || !Array.isArray(group.sentences) || group.sentences.length === 0) return group; const sentencesCopy = [...group.sentences]; const total = sentencesCopy.length; const result = new Array(total).fill(null); const originalMovable = []; for (let i = 0; i < total; i++) { const sentence = sentencesCopy[i]; if (sentence && sentence.movable !== undefined) { if (!sentence.movable) result[i] = sentence; else originalMovable.push(sentence); } else { console.warn("Invalid sentence:", sentence); result[i] = sentence; } } const movable = originalMovable.slice(); for (let i = movable.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [movable[i], movable[j]] = [movable[j], movable[i]]; } let same = movable.length > 0 && movable.every((item, i) => item.id === originalMovable[i].id); if (same && movable.length > 1) { [movable[0], movable[1]] = [movable[1], movable[0]]; } let movableIndex = 0; for (let i = 0; i < total; i++) { if (result[i] === null) { if (movableIndex < movable.length) { result[i] = movable[movableIndex++]; } else { console.error("Shuffle error!"); const fallbackSentence = sentencesCopy.find(s => !result.includes(s)) || {id:`error-${i}`, text:"שגיאת ערבוב", movable:true}; result[i] = fallbackSentence; } } } if (result.some(item => item === null)) { console.error("Shuffle nulls!"); return group; } return { ...group, sentences: result }; }


   // --- UPDATED Functions for Game Flow ---
   const handleStartGame = (difficultyRange, topics) => { /* ... */ console.log("Starting game. Difficulty:", difficultyRange, "Topics:", Array.from(topics)); setSelectedDifficultyRange(difficultyRange); setSelectedTopics(topics); setGameState('playing'); setIsLoading(true); setMessage('מחפש תרגיל מתאים...'); setAvailableGameGroups([]); setCurrentGroupIndex(-1); loadFilteredGroup(difficultyRange, topics, true); };
   const loadFilteredGroup = (difficultyRange, topics, isInitialLoad = false) => {
      if (!groups || groups.length === 0) { /* ... */ setMessage(''); setToast({ show: true, message: '🤷‍♀️ מצטערים, לא הוגדרו כרגע קבוצות משחק.', type: 'info' }); setCurrentGroup(null); setFinished(true); setIsLoading(false); setGameState('setup'); return; }
      console.log('Filtering groups. Range:', difficultyRange, 'Topics:', Array.from(topics)); const filtered = groups.filter(g => { const difficultyMatch = g.difficulty >= difficultyRange.min && g.difficulty <= difficultyRange.max; if (topics.size === 0) return false; const topicMatch = topics.has(g.topic || 'כללי'); return difficultyMatch && topicMatch; }); console.log(`Found ${filtered.length} matching groups after full filter.`);
      if (filtered.length > 0) { if (isInitialLoad) { setAvailableGameGroups(filtered); } const randomIndex = Math.floor(Math.random() * filtered.length); const randomGroup = filtered[randomIndex]; if (!randomGroup.sentences || !Array.isArray(randomGroup.sentences) || randomGroup.sentences.length === 0 || !randomGroup.sentences.every(s => s && s.id !== undefined && s.text !== undefined && s.movable !== undefined)) { /* ... */ console.error("Invalid group structure chosen:", randomGroup); setMessage(''); setToast({ show: true, message: '🤕 אופס! נתקלנו בבעיה בנתוני המשחק שנבחר. נסה בחירה אחרת.', type: 'error' }); setCurrentGroup(null); setFinished(false); setIsLoading(false); setGameState('setup'); return; } const groupWithOrder = { ...randomGroup, originalOrder: randomGroup.sentences.map(s => s.id) }; setAttempts(0); setMessage(''); setFinished(false); setCurrentGroup(shuffleGroup(groupWithOrder)); const currentList = isInitialLoad ? filtered : availableGameGroups; const actualIndex = currentList.findIndex(g => g.originalIndex === randomGroup.originalIndex); setCurrentGroupIndex(actualIndex >= 0 ? actualIndex : 0); setIsLoading(false); setCheckButtonState("check"); setCheckedResults(undefined); setTimer(0); }
      else { /* ... */ const anyMatchDifficulty = groups.some(g => g.difficulty >= difficultyRange.min && g.difficulty <= difficultyRange.max); const anyMatchTopic = groups.some(g => topics.has(g.topic || 'כללי')); let toastMessage = '🤔 לא מצאנו תרגילים בדיוק לפי הבחירה שלך.'; const topicsStr = Array.from(topics).join(', '); const levelStr = `${difficultyRange.min}-${difficultyRange.max}`; if (anyMatchDifficulty && !anyMatchTopic) { toastMessage = `🧐 לא מצאנו תרגילים בנושאים "${topicsStr}" ברמת הקושי ${levelStr}. נסה נושאים אחרים או רמה שונה.`; } else if (!anyMatchDifficulty && anyMatchTopic) { toastMessage = `😲 לא מצאנו תרגילים ברמת קושי ${levelStr}. יש תרגילים בנושאים "${topicsStr}" ברמות אחרות.`; } else if (!anyMatchDifficulty && !anyMatchTopic && groups.length > 0) { toastMessage = `🤷 לא מצאנו תרגילים שמתאימים *גם* לרמת הקושי ו*גם* לנושאים שבחרת. נסה בחירה אחרת לגמרי.`; } setMessage(''); setToast({ show: true, message: toastMessage, type: 'info' }); setCurrentGroup(null); setFinished(false); setIsLoading(false); setGameState('setup'); setAvailableGameGroups([]); setCurrentGroupIndex(-1); }
  };
  function checkOrder() { /* ... עם קונפטי ... */ if (isLoading || !currentGroup || finished || checkButtonState !== 'check') return; setAttempts(a => a + 1); setCheckButtonState("checking"); setMessage("בודק..."); const correctOrder = currentGroup.originalOrder; const currentSentences = currentGroupRef.current.sentences; if (!correctOrder || !currentSentences || correctOrder.length !== currentSentences.length) { console.error("Data mismatch!"); setMessage("שגיאה בבדיקה."); setToast({ show: true, message: '🤕 אופס! שגיאה בנתוני הבדיקה.', type: 'error' }); setCheckButtonState("check"); return; } const results = []; const checkDelay = 350; setCheckedResults(new Array(currentSentences.length).fill(null)); function checkSentenceAtIndex(index) { if (index >= currentSentences.length) { const allCorrect = results.every(res => res === true); finalizeCheck(allCorrect); return; } const sentence = currentSentences[index]; const isCorrect = sentence && sentence.id === correctOrder[index]; results[index] = isCorrect; setCheckedResults(prev => { const newResults = [...(prev || new Array(currentSentences.length).fill(null))]; newResults[index] = isCorrect; return newResults; }); if (navigator.vibrate) navigator.vibrate(isCorrect ? 5 : 10); setTimeout(() => { checkSentenceAtIndex(index + 1); }, checkDelay); } function finalizeCheck(allCorrect) { if (allCorrect) { if (typeof confetti === 'function') { confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } }); } setCheckButtonState("ready"); const totalSentences = currentGroup.sentences.length; const lockedSentences = currentGroup.sentences.filter(s => !s.movable).length; const earnedScore = calculateScore({ timer, attempts, difficultyRange: selectedDifficultyRange, totalSentences, lockedSentences }); setScore(s => s + earnedScore); setToast({ show: true, message: `✅ כל הכבוד! ${earnedScore}+ נק'`, type: 'success' }); if (timerInterval.current) { clearInterval(timerInterval.current); timerInterval.current = null; } if (navigator.vibrate) navigator.vibrate(15); } else { setMessage('נסה שוב!'); setCheckButtonState("check"); } } checkSentenceAtIndex(0); }
  function nextLevel() { /* ... */ if (isLoading || checkButtonState !== 'ready') return; setCheckedResults(undefined); setMessage('טוען תרגיל הבא...'); setCheckButtonState("check"); setIsLoading(true); loadFilteredGroup(selectedDifficultyRange, selectedTopics, false); }
  function renderSentence(sentence, index) { /* ... */ const classes = [ 'text-box', 'my-2', 'w-full', 'max-w-md', 'rounded-2xl', 'relative', 'flex', 'items-center', 'p-3', 'transition-colors', 'duration-300', 'shadow', 'no-select', 'text-sm sm:text-base' ]; if (checkedResults !== undefined && checkedResults[index] !== null) { classes.push(checkedResults[index] ? 'correct' : 'wrong'); } if (sentence && !sentence.movable) { classes.push('fixed'); } const iconText = sentence.movable ? "↕️" : "🔒"; return createElement( 'div', { key: sentence.id, 'data-id': sentence.id, className: classes.join(' ') }, createElement('span', { className: 'icon ml-2 text-xl sm:text-2xl flex-shrink-0 cursor-default' }, iconText), createElement('span', { className: 'sentence-text flex-grow break-words select-text' }, sentence.text) ); }


  // --- JSX-like Rendering ---
  const ToastComponent = toast.show ? createElement( /* ... */ 'div', { className: `toast fixed top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 p-4 rounded-lg shadow-lg text-white text-base z-50 transition-all duration-300 ease-out ${ toast.type === 'success' ? 'bg-green-500' : toast.type === 'info' ? 'bg-blue-500' : 'bg-red-500' } ${toast.show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}` }, toast.message) : null;
  const headerTop = createElement( /* ... */ 'div', { className: 'header-top flex items-center justify-between w-full max-w-md px-1 mb-1' }, createElement('h1', { className: 'title text-2xl sm:text-3xl font-bold text-center flex-grow' }, 'שרשרת סיבות ⛓️‍💥‏‏'), gameState === 'playing' && createElement('div', { className: 'difficulty text-sm sm:text-base' }, `רמה: ${getDifficultyText(selectedDifficultyRange)}`) );
  const headerBottom = gameState === 'playing' ? createElement( /* ... */ 'div', { className: 'header-bottom flex justify-between w-full max-w-md text-sm sm:text-base px-1' }, createElement('div', null, `ניסיונות: ${attempts}`), createElement('div', null, `זמן: ${formatTime(timer)}`), createElement('div', { ref: scoreRef }, `ניקוד: ${String(score).padStart(5, '0')}`) ) : null;
  const messagesArea = (gameState === 'playing' || isLoading) ? createElement( /* ... */ 'div', { className: 'message text-center my-2 min-h-[1.5em] text-gray-700 dark:text-gray-300' }, message || '\u00A0' ) : null;
  const gameProgressIndicator = gameState === 'playing' && !isLoading && currentGroup && availableGameGroups.length > 0 && currentGroupIndex !== -1 ? createElement( 'div', { className: 'text-center text-sm text-gray-500 dark:text-gray-400 mb-2' }, `תרגול ${currentGroupIndex + 1} מתוך ${availableGameGroups.length}` ) : null; // ודא שגם האינדקס תקין
  const gameInstructions = gameState === 'playing' && !isLoading && currentGroup ? createElement( /* ... */ 'div', { className: 'instructions text-center w-full max-w-md mb-3 px-2' }, createElement('h3', { className: 'text-lg font-semibold text-gray-800 dark:text-gray-200' }, `משפטים בנושא: ${currentGroup.topic || 'כללי'}`), createElement('p', { className: 'text-sm text-gray-600 dark:text-gray-400' }, 'סדר/י את המשפטים הבאים לפי שרשרת של סיבות ותוצאה') ) : null;
  const getButtonClasses = () => { /* ... כפי שהיה ... */ let base = 'mt-4 py-2 px-6 text-lg rounded-full font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800'; let stateClasses = ''; if (checkButtonState === "ready") { stateClasses = 'bg-yellow-400 text-black hover:bg-yellow-500 focus:ring-yellow-400'; } else if (checkButtonState === "checking") { stateClasses = 'bg-gray-500 text-white opacity-75 cursor-wait'; } else { stateClasses = 'bg-green-500 text-white hover:bg-green-600 focus:ring-green-500'; } if (isLoading || (finished && !currentGroup)) { stateClasses = 'bg-gray-400 text-gray-700 opacity-50 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400'; } else if (checkButtonState !== 'checking' && !isLoading && (!currentGroup || currentGroup.sentences.length === 0)) { stateClasses = 'bg-gray-400 text-gray-700 opacity-50 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400'; } return `${base} ${stateClasses}`; };
  const buttonText = checkButtonState === "ready" ? "מוכן לאתגר הבא?" : checkButtonState === "checking" ? "בודק..." : "בדיקה";
  const buttonDisabled = isLoading || checkButtonState === "checking" || (finished && !currentGroup) || (!currentGroup && gameState === 'playing');
  const actionButton = gameState === 'playing' ? createElement( 'button', { className: getButtonClasses(), onClick: () => { if (checkButtonState === "check") checkOrder(); else if (checkButtonState === "ready") nextLevel(); }, disabled: buttonDisabled }, buttonText ) : null;

  // --- Main Return ---
  return createElement(
    'div', { className: 'container flex flex-col items-center justify-start pt-5 min-h-screen gap-3 p-4 sm:p-6 relative' },
    headerTop,
    gameState === 'setup'
      ? createElement(GameSetup, { initialDifficultyRange: selectedDifficultyRange, initialTopics: selectedTopics, onStartGame: handleStartGame, allGroups: groups })
      : createElement(React.Fragment, null, headerBottom, messagesArea, gameProgressIndicator, gameInstructions,
          createElement( 'div', { id: 'sortable-container', ref: containerRef, className: `flex flex-col items-center w-full max-w-md ${isLoading ? 'min-h-[200px]' : ''}` },
            isLoading && gameState === 'playing' ? createElement('div', { className: 'text-center p-4 text-gray-500 dark:text-gray-400' }, message || 'טוען...')
            : currentGroup ? currentGroup.sentences.map((s, index) => renderSentence(s, index))
            : createElement('div', { className: 'text-center p-4 text-gray-500 dark:text-gray-400' }, finished ? 'סיימת את כל התרגילים בבחירה זו!' : message || 'לא נמצאו קבוצות.') ),
          !isLoading && (currentGroup || finished) && actionButton, ),
    ToastComponent
  );
}
// #############################################
// ### End of Main App Component             ###
// #############################################

// Render the App
ReactDOM.createRoot(document.getElementById('root')).render(createElement(App));