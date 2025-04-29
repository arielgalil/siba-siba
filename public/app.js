const { createElement, useState, useEffect, useRef } = React; // <-- ודא ששורה זו קיימת וזהה בתחילת הקובץ

// --- Firebase Setup ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";

// Firebase config
const firebaseConfig = { apiKey: "AIzaSyAGFC_TB8iEMvS2PyxeASj1HH4i66AW4UA", authDomain: "trivbio.firebaseapp.com", databaseURL: "https://trivbio-default-rtdb.firebaseio.com", projectId: "trivbio", storageBucket: "trivbio.appspot.com", messagingSenderId: "1097087574583", appId: "1:1097087574583:web:b36c0441537a1f596215b2", measurementId: "G-ZY245YB23E" };
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const groupsRef = ref(db, 'collections/groups');
// --- End of Firebase Setup ---

// #############################################
// ### Main App Component                    ###
// #############################################
function App() {
  // --- State Variables ---
  const [groups, setGroups] = useState([]); const [currentGroup, setCurrentGroup] = useState(null); const [attempts, setAttempts] = useState(0); const [startTime, setStartTime] = useState(Date.now()); const [timer, setTimer] = useState(0); const [score, setScore] = useState(0); const [finished, setFinished] = useState(false); const [checkButtonState, setCheckButtonState] = useState("check"); const [checkedResults, setCheckedResults] = useState(undefined); const [currentUser, setCurrentUser] = useState(null); const [userName, setUserName] = useState(''); const [isLoading, setIsLoading] = useState(true); const [toast, setToast] = useState({ show: false, message: '', type: 'success' }); const [gameState, setGameState] = useState('setup'); const [selectedDifficultyRange, setSelectedDifficultyRange] = useState({ min: 1, max: 2 }); const [selectedTopics, setSelectedTopics] = useState(new Set(['מעבדה']));
  const [totalGroupsInSelection, setTotalGroupsInSelection] = useState(0); const [currentPlayingDifficulty, setCurrentPlayingDifficulty] = useState(null); const [groupsForCurrentDifficulty, setGroupsForCurrentDifficulty] = useState([]); const [playedInCurrentDifficulty, setPlayedInCurrentDifficulty] = useState(new Set());
  const [lastCheckIncorrect, setLastCheckIncorrect] = useState(false);
  const [sessionExerciseCount, setSessionExerciseCount] = useState(0);

  // --- Refs ---
  const containerRef = useRef(null); const currentGroupRef = useRef(currentGroup); let timerInterval = useRef(null); const scoreRef = useRef(null); const isFirstRender = useRef(true); const initialGroupLoadDone = useRef(false);

  // --- useEffect Hooks ---
  useEffect(() => { currentGroupRef.current = currentGroup; }, [currentGroup]);
  useEffect(() => { /* Auth and Data Loading */ setIsLoading(true); let dataUnsubscribe = null; const authUnsubscribe = onAuthStateChanged(auth, (user) => { setCurrentUser(user); if (user) { setUserName(user.displayName || user.email || 'אורח'); if (groups.length === 0 || !initialGroupLoadDone.current) { setIsLoading(true); if (dataUnsubscribe) dataUnsubscribe(); dataUnsubscribe = onValue(groupsRef, (snapshot) => { const groupsData = snapshot.val() || []; if (Array.isArray(groupsData)) { const processedGroups = groupsData.map((group, groupIndex) => ({ ...group, originalIndex: groupIndex, topic: group.topic || 'כללי', sentences: Array.isArray(group.sentences) ? group.sentences.map((sentence, sentenceIndex) => ({ text: sentence.text || '', movable: sentence.movable !== undefined ? sentence.movable : true, id: String(sentence.id ?? `${groupIndex}-${sentenceIndex}`) })) : [] })).filter(g => g.sentences && g.sentences.length > 0 && g.difficulty); setGroups(processedGroups); initialGroupLoadDone.current = true; setIsLoading(false); if (gameState === 'playing' && processedGroups.length === 0) { setGameState('setup'); setToast({ show: true, message: '🤔 אין נתונים למשחק, חזרנו להגדרות.', type: 'info' }); } else if (processedGroups.length === 0) { setToast({ show: true, message: '🤷‍♀️ אין קבוצות משחק.', type: 'info' }); } } else { setGroups([]); initialGroupLoadDone.current = true; setIsLoading(false); setToast({ show: true, message: '🤷‍♀️ לא הצלחנו לטעון נתונים.', type: 'error' }); setGameState('setup'); } }, (error) => { console.error('Error fetching groups:', error); setGroups([]); setCurrentGroup(null); setFinished(true); setIsLoading(false); initialGroupLoadDone.current = true; setGameState('setup'); if (dataUnsubscribe) dataUnsubscribe(); }); } else { setIsLoading(false); } } else { setUserName(''); setGroups([]); setCurrentGroup(null); setFinished(false); setGameState('setup'); setIsLoading(true); initialGroupLoadDone.current = false; if (dataUnsubscribe) dataUnsubscribe(); signInAnonymously(auth).catch(error => { console.error("Anon sign-in failed:", error); setIsLoading(false); }); } }); return () => { console.log("Cleaning up listeners..."); authUnsubscribe(); if (dataUnsubscribe) dataUnsubscribe(); }; }, []);
  useEffect(() => { /* Timer */ if (gameState === 'playing' && currentGroup && !isLoading && !finished) { console.log(`Timer Effect: Starting/Resetting timer for group originalIndex: ${currentGroup?.originalIndex}`); const newStartTime = Date.now(); setStartTime(newStartTime); setTimer(0); if (timerInterval.current) { clearInterval(timerInterval.current); } timerInterval.current = setInterval(() => { setTimer(prevTimer => prevTimer + 1); }, 1000); } else { if (timerInterval.current) { console.log("Timer Effect: Clearing timer interval"); clearInterval(timerInterval.current); timerInterval.current = null; } } return () => { if (timerInterval.current) { console.log("Timer Effect Cleanup: Clearing timer interval on unmount/dependency change"); clearInterval(timerInterval.current); timerInterval.current = null; } }; }, [gameState, finished, isLoading, currentGroup?.originalIndex]);
  useEffect(() => { /* Score Pulse */ if (isFirstRender.current && score === 0) return; if (scoreRef.current) { scoreRef.current.classList.remove('pulse'); void scoreRef.current.offsetWidth; scoreRef.current.classList.add('pulse'); const timeoutId = setTimeout(() => { scoreRef.current && scoreRef.current.classList.remove('pulse'); }, 1000); return () => clearTimeout(timeoutId); } }, [score]);
  useEffect(() => { /* SortableJS */ let sortableInstance = null; if (gameState === 'playing' && !finished && !isLoading && currentGroup && containerRef.current) { console.log("Initializing SortableJS"); sortableInstance = new Sortable(containerRef.current, { animation: 150, swap: true, swapClass: 'swap-highlight', draggable: '.sentence-box:not(.fixed)', filter: '.fixed', onMove: (evt) => !evt.related?.classList.contains('fixed'), onStart: () => { if (navigator.vibrate) navigator.vibrate(10); }, onUpdate: (e) => { if (checkButtonState === 'checking') return; if (!currentGroupRef.current) return; setLastCheckIncorrect(false); setCheckedResults(undefined); const newOrder = Array.from(e.to.children).map(child => child.getAttribute('data-id')); setCurrentGroup(prev => { if (!prev) return prev; const newSentences = newOrder.map(id => prev.sentences.find(s => s.id === id)).filter(Boolean); if (newSentences.length !== prev.sentences.length || newSentences.some(s => !s)) { console.error("ID mismatch!"); return prev; } if (navigator.vibrate) navigator.vibrate(15); return { ...prev, sentences: newSentences }; }); } }); } else { console.log("Skipping SortableJS init or destroying."); } return () => { if (sortableInstance) { console.log("Destroying SortableJS instance"); sortableInstance.destroy(); } }; }, [gameState, finished, isLoading, currentGroup]);
  useEffect(() => { /* Toast Hiding */ if (toast.show) { const timerId = setTimeout(() => { setToast(prev => ({ ...prev, show: false })); }, 3500); return () => clearTimeout(timerId); } }, [toast]);

  // --- Helper Functions ---
  function formatTime(totalSeconds) { const minutes = Math.floor(totalSeconds / 60); const seconds = totalSeconds % 60; return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`; }
  function calculateScore({ timer, attempts, difficultyRange, totalSentences, lockedSentences }) { const difficultyValue = difficultyRange.max || 1; const baseScore = 100; const difficultyBonus = difficultyValue * 20; const lengthBonus = totalSentences * 15; const lockedPenalty = lockedSentences * 10; const timePenalty = timer * 2; const attemptsPenalty = Math.max(0, (attempts - 1) * 15); let currentScore = baseScore + difficultyBonus + lengthBonus - lockedPenalty - timePenalty - attemptsPenalty; return Math.max(0, Math.floor(currentScore)); }
  function getDifficultyText(range) { if (!range) return "לא ידוע"; if (range.min === 1 && range.max === 2) return "קל"; if (range.min === 2 && range.max === 4) return "בינוני"; if (range.min === 4 && range.max === 5) return "קשה"; if (range.min === 1 && range.max === 5) return "הכל"; return `${range.min}-${range.max}`; }
  function shuffleGroup(group) { if (!group || !Array.isArray(group.sentences) || group.sentences.length === 0) return group; const sentencesCopy = [...group.sentences]; const total = sentencesCopy.length; const result = new Array(total).fill(null); const originalMovable = []; for (let i = 0; i < total; i++) { const sentence = sentencesCopy[i]; if (sentence && sentence.movable !== undefined) { if (!sentence.movable) result[i] = sentence; else originalMovable.push(sentence); } else { console.warn("Invalid sentence:", sentence); result[i] = sentence; } } const movable = originalMovable.slice(); for (let i = movable.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [movable[i], movable[j]] = [movable[j], movable[i]]; } let same = movable.length > 0 && movable.every((item, i) => item.id === originalMovable[i].id); if (same && movable.length > 1) { [movable[0], movable[1]] = [movable[1], movable[0]]; } let movableIndex = 0; for (let i = 0; i < total; i++) { if (result[i] === null) { if (movableIndex < movable.length) { result[i] = movable[movableIndex++]; } else { console.error("Shuffle error!"); const fallbackSentence = sentencesCopy.find(s => !result.includes(s)) || {id:`error-${i}`, text:"שגיאת ערבוב", movable:true}; result[i] = fallbackSentence; } } } if (result.some(item => item === null)) { console.error("Shuffle nulls!"); return group; } return { ...group, sentences: result }; }
  const handleStartGame = (difficultyRange, topics, totalCount) => { console.log("Starting game. Difficulty:", difficultyRange, "Topics:", Array.from(topics), "Total:", totalCount); setSelectedDifficultyRange(difficultyRange); setSelectedTopics(topics); setTotalGroupsInSelection(totalCount); setCurrentPlayingDifficulty(difficultyRange.min); setPlayedInCurrentDifficulty(new Set()); setSessionExerciseCount(0); setGameState('playing'); setIsLoading(true); setLastCheckIncorrect(false); loadGroupsForLevel(difficultyRange.min, topics); };
  const loadGroupsForLevel = (level, topics) => { console.log(`Loading groups for level ${level}`); if (!groups || groups.length === 0) { console.error("No base groups"); setToast({ show: true, message: 'שגיאה: לא נמצאו קבוצות.', type: 'error' }); handleReturnToSetup(); return; } const filteredForLevel = groups.filter(g => g.difficulty === level && topics.has(g.topic || 'כללי')); console.log(`Found ${filteredForLevel.length} groups for level ${level}`); setGroupsForCurrentDifficulty(filteredForLevel); setPlayedInCurrentDifficulty(new Set()); loadNextUnplayedGroupFromLevel(filteredForLevel, new Set()); };
  const loadNextUnplayedGroupFromLevel = (groupsInLevel, playedInLevel) => { const unplayed = groupsInLevel.filter((group) => !playedInLevel.has(group.originalIndex)); console.log(`Loading next unplayed. Available: ${groupsInLevel.length}, Played: ${playedInLevel.size}, Unplayed: ${unplayed.length}`); if (unplayed.length > 0) { const randomIndexInUnplayed = Math.floor(Math.random() * unplayed.length); const nextGroup = unplayed[randomIndexInUnplayed]; const updatedPlayedInLevel = new Set(playedInLevel).add(nextGroup.originalIndex); setPlayedInCurrentDifficulty(updatedPlayedInLevel); if (!nextGroup.sentences ) { console.error("Invalid next group structure:", nextGroup); handleReturnToSetup(); return; } const groupWithOrder = { ...nextGroup, originalOrder: nextGroup.sentences.map(s => s.id) }; setAttempts(0); setFinished(false); setCurrentGroup(shuffleGroup(groupWithOrder)); setSessionExerciseCount(prev => prev + 1); setIsLoading(false); setCheckButtonState("check"); setCheckedResults(undefined); setTimer(0); setLastCheckIncorrect(false); } else { console.log(`Finished level ${currentPlayingDifficulty}. Moving to next.`); const nextDifficulty = currentPlayingDifficulty + 1; if (nextDifficulty > selectedDifficultyRange.max) { handleSessionComplete(); } else { setCurrentPlayingDifficulty(nextDifficulty); loadGroupsForLevel(nextDifficulty, selectedTopics); } } };
  function checkOrder() { if (isLoading || !currentGroup || finished || checkButtonState !== 'check') return; setAttempts(a => a + 1); setCheckButtonState("checking"); setLastCheckIncorrect(false); const correctOrder = currentGroup.originalOrder; const currentSentences = currentGroupRef.current.sentences; if (!correctOrder || !currentSentences || correctOrder.length !== currentSentences.length) { console.error("Order check mismatch"); setToast({show:true, message:'שגיאה בבדיקה', type: 'error'}); setCheckButtonState("check"); return; } const results = []; const checkDelay = 350; setCheckedResults(new Array(currentSentences.length).fill(null)); function checkSentenceAtIndex(index) { if (index >= currentSentences.length) { const allCorrect = results.every(res => res === true); finalizeCheck(allCorrect); return; } const sentence = currentSentences[index]; const isCorrect = sentence && sentence.id === correctOrder[index]; results[index] = isCorrect; setCheckedResults(prev => { const newResults = [...(prev || new Array(currentSentences.length).fill(null))]; newResults[index] = isCorrect; return newResults; }); if (navigator.vibrate) navigator.vibrate(isCorrect ? 5 : 10); setTimeout(() => { checkSentenceAtIndex(index + 1); }, checkDelay); } function finalizeCheck(allCorrect) { if (allCorrect) { if (typeof confetti === 'function') { confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } }); } setCheckButtonState("ready"); const totalSentences = currentGroup.sentences.length; const lockedSentences = currentGroup.sentences.filter(s => !s.movable).length; const earnedScore = calculateScore({ timer, attempts, difficultyRange: selectedDifficultyRange, totalSentences, lockedSentences }); setScore(s => s + earnedScore); if (timerInterval.current) { clearInterval(timerInterval.current); timerInterval.current = null; } if (navigator.vibrate) navigator.vibrate(15); } else { setCheckButtonState("check"); setLastCheckIncorrect(true); } } checkSentenceAtIndex(0); }
  function nextLevel() { if (isLoading || checkButtonState !== 'ready') return; setCheckedResults(undefined); setCheckButtonState("check"); setIsLoading(true); setLastCheckIncorrect(false); loadNextUnplayedGroupFromLevel(groupsForCurrentDifficulty, playedInCurrentDifficulty); }
  function handleSessionComplete() { console.log("Session complete!"); if (typeof confetti === 'function') { confetti({ particleCount: 50, angle: 60, spread: 55, origin: { x: 0 } }); confetti({ particleCount: 50, angle: 120, spread: 55, origin: { x: 1 } }); } setToast({show: true, message: "כל הכבוד!", type: "success"}); setCheckButtonState("session_finished"); setFinished(true); setIsLoading(false); if (timerInterval.current) { clearInterval(timerInterval.current); timerInterval.current = null; } }
  function handleReturnToSetup() { console.log("Returning to setup."); setGameState('setup'); setCurrentGroup(null); setGroupsForCurrentDifficulty([]); setPlayedInCurrentDifficulty(new Set()); setCurrentPlayingDifficulty(null); setTotalGroupsInSelection(0); setAttempts(0); setTimer(0); setScore(0); setFinished(false); setCheckButtonState('check'); setCheckedResults(undefined); setLastCheckIncorrect(false); setSessionExerciseCount(0); }

  // renderSentence עם פונט מוגדל
  function renderSentence(sentence, index) {
      const baseClasses = [ 'my-1', 'w-full', 'max-w-md', 'rounded-xl', 'relative', 'flex', 'items-center', 'p-3', 'transition-colors', 'duration-300', 'shadow-sm', 'border' ];
      let stateClasses = 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100';
      let cursorClass = 'cursor-grab';
      if (checkedResults !== undefined && checkedResults[index] !== null) {
          if(checkedResults[index]) { stateClasses = 'bg-green-100 dark:bg-green-900 border-green-400 dark:border-green-600 text-green-800 dark:text-green-200'; cursorClass = 'cursor-default'; }
          else { stateClasses = 'bg-red-100 dark:bg-red-900 border-red-400 dark:border-red-600 text-red-800 dark:text-red-200'; }
      }
      let fixedSpecificClasses = '';
      if (sentence && !sentence.movable) { fixedSpecificClasses = 'fixed border-dashed border-gray-400 dark:border-gray-500'; cursorClass = 'cursor-default'; }
      const iconText = sentence.movable ? "↕️" : "🔒";
      return createElement( 'div', { key: sentence.id, 'data-id': sentence.id, className: [...baseClasses, stateClasses, cursorClass, fixedSpecificClasses, (!sentence.movable ? '' : 'hover:shadow-md'), 'sentence-box'].join(' ') },
          createElement('span', { className: 'icon ml-2 text-xl flex-shrink-0 cursor-default text-gray-500 dark:text-gray-400' }, iconText),
          createElement('span', { className: 'sentence-text flex-grow break-words select-text text-base' }, sentence.text) // פונט מוגדל
      );
  }

  // --- Action Button Logic ---
  const getButtonClasses = () => {
      let base = 'mt-4 py-1.5 px-5 text-base rounded-full font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800'; // גודל מוקטן
      let stateClasses = '';
      if (checkButtonState === "session_finished") { stateClasses = 'bg-blue-500 text-white hover:bg-blue-600 focus:ring-blue-500'; }
      else if (checkButtonState === "ready") { stateClasses = 'bg-yellow-400 text-black hover:bg-yellow-500 focus:ring-yellow-400'; }
      else if (checkButtonState === "checking") { stateClasses = 'bg-gray-500 text-white opacity-75 cursor-wait'; }
      else { if(lastCheckIncorrect) { stateClasses = 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500'; } else { stateClasses = 'bg-green-500 text-white hover:bg-green-600 focus:ring-green-500'; } }
      if (isLoading || (!currentGroup && gameState === 'playing' && !finished)) { stateClasses = 'bg-gray-400 text-gray-700 opacity-50 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400'; }
      return `${base} ${stateClasses}`;
  };

  // *** משתנים עבור כפתור הפעולה ***
  let buttonText;
  let buttonOnClick;
  let buttonDisabled = isLoading;

  if (checkButtonState === "session_finished") {
      buttonText = "חזרה לבחירת תרגילים";
      buttonOnClick = handleReturnToSetup;
      buttonDisabled = false;
  } else if (checkButtonState === "ready") {
      buttonText = "מוכן לאתגר הבא?";
      buttonOnClick = nextLevel;
      buttonDisabled = isLoading;
  } else if (checkButtonState === "checking") {
      buttonText = "בודק...";
      buttonOnClick = () => {};
      buttonDisabled = true;
  } else { // Default "check" or "try again" state
      if (lastCheckIncorrect) {
          buttonText = "נסה שוב!";
      } else {
          buttonText = "בדיקה";
      }
      buttonOnClick = checkOrder;
      buttonDisabled = isLoading || (!currentGroup && gameState === 'playing');
  }
  // *** סוף הגדרת המשתנים ***

  // --- JSX-like Rendering Elements ---
  const ToastComponent = toast.show ? createElement( 'div', { className: `toast fixed top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 p-4 rounded-lg shadow-lg text-white text-base z-50 transition-all duration-300 ease-out ${ toast.type === 'success' ? 'bg-green-500' : toast.type === 'info' ? 'bg-blue-500' : 'bg-red-500' } ${toast.show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}` }, toast.message) : null;
  const actionButton = gameState === 'playing' ? createElement( 'button', { className: `${getButtonClasses()} self-center`, onClick: buttonOnClick, disabled: buttonDisabled }, buttonText ) : null;

  // GameHeader (רק שורה עליונה)
  const GameHeader = () => {
      const topRow = createElement('div', {className: 'flex justify-between items-center w-full max-w-4xl mx-auto px-4 pt-2'},
          createElement('div', {className: 'w-20 min-w-[0px]'}),
          createElement('h1', { className: 'title text-xl sm:text-2xl font-bold text-center text-gray-900 dark:text-gray-100 flex-1 px-2' }, 'שרשרת סיבות ⛓️‍💥‏‏'),
          createElement('div', {className: 'text-right w-20'},
              createElement('div', {className: 'text-sm font-medium text-gray-700 dark:text-gray-300 truncate'}, userName || 'אורח'),
              createElement('div', {className: 'text-xs text-gray-500 dark:text-gray-400 mt-0.5', ref: scoreRef}, `ניקוד: ${String(score).padStart(5, '0')}`)
          )
      );
      return topRow;
  };

  // Footer עם קישורים מעודכנים
  function Footer() {
    const linkClass = 'hover:text-gray-700 dark:hover:text-gray-300 underline mx-1';
    const separatorClass = 'opacity-50 mx-1';

    return createElement('footer', { className: 'w-full text-center text-xs text-gray-500 dark:text-gray-400 mt-auto pt-4 pb-2' },
      'פותח על ידי אריאל מ',
      createElement('a', { href: 'https://galilbio.wordpress.com', target: '_blank', rel: 'noopener noreferrer', className: linkClass }, 'הביולוגים של גליל'),
      ' בעזרת ',
      createElement('a', { href: 'https://grok.com', target: '_blank', rel: 'noopener noreferrer', className: linkClass }, 'Grok'),
      ', ',
      createElement('a', { href: 'https://chatgpt.com/', target: '_blank', rel: 'noopener noreferrer', className: linkClass }, 'Chat GPT'),
      ' וגם ',
      createElement('a', { href: 'https://gemini.google.com/', target: '_blank', rel: 'noopener noreferrer', className: linkClass }, 'Gemini'),
      createElement('span', { className: separatorClass }, '|'),
      createElement('a', { href: './admin.html', target: '_blank', rel: 'noopener noreferrer', className: linkClass }, 'ניהול')
    );
  }


  // GameSetup עם גדלי פונט מעודכנים וצבע שונה ל'הכל'
  function GameSetup({ initialDifficultyRange, initialTopics, onStartGame, allGroups }) {
      const [difficultyKey, setDifficultyKey] = useState(() => { if (initialDifficultyRange.min === 1 && initialDifficultyRange.max === 2) return 'easy'; if (initialDifficultyRange.min === 2 && initialDifficultyRange.max === 4) return 'medium'; if (initialDifficultyRange.min === 4 && initialDifficultyRange.max === 5) return 'hard'; return 'all'; });
      const [selectedTopicsInternal, setSelectedTopicsInternal] = useState(new Set(initialTopics));
      const [availableCount, setAvailableCount] = useState(0);
      const actualAvailableTopics = ['כללי', 'מעבדה', 'התא', 'אקולוגיה', 'גוף האדם'];
      const difficultyOptions = { easy: { label: 'קל', range: { min: 1, max: 2 } }, medium: { label: 'בינוני', range: { min: 2, max: 4 } }, hard: { label: 'קשה', range: { min: 4, max: 5 } }, all: { label: 'הכל', range: { min: 1, max: 5 } } };

      useEffect(() => { if (!allGroups || allGroups.length === 0) { setAvailableCount(0); return; } const currentRange = difficultyOptions[difficultyKey].range; const filtered = allGroups.filter(g => { const difficultyMatch = g.difficulty >= currentRange.min && g.difficulty <= currentRange.max; if (selectedTopicsInternal.size === 0) return false; const topicMatch = selectedTopicsInternal.has(g.topic || 'כללי'); return difficultyMatch && topicMatch; }); setAvailableCount(filtered.length); }, [difficultyKey, selectedTopicsInternal, allGroups, difficultyOptions]);

      const handleDifficultyChange = (key) => { setDifficultyKey(key); };
      const handleTopicToggle = (topic) => { setSelectedTopicsInternal(prevTopics => { const newTopics = new Set(prevTopics); if (newTopics.has(topic)) { newTopics.delete(topic); } else { newTopics.add(topic); } return newTopics; }); };
      const handleSelectAllTopics = () => { setSelectedTopicsInternal(prevTopics => { if (prevTopics.size === actualAvailableTopics.length) { return new Set(); } else { return new Set(actualAvailableTopics); } }); };
      const handleStartClick = () => { if (selectedTopicsInternal.size === 0) { alert('יש לבחור לפחות נושא אחד'); return; } onStartGame(difficultyOptions[difficultyKey].range, selectedTopicsInternal, availableCount); };

      const SelectionButton = ({ text, isSelected, type, onClick, isAllOption = false }) => {
          const baseClasses = "flex items-center justify-center space-x-2 space-x-reverse px-3 py-2 border rounded-xl cursor-pointer transition-colors duration-200 w-full text-center text-sm sm:text-base";
          const isAllSelectedStyle = isAllOption && isSelected;
          const colorTheme = isAllSelectedStyle ? 'teal' : 'blue';
          let buttonStateClasses; if (isSelected) { buttonStateClasses = `bg-${colorTheme}-500 border-${colorTheme}-700 text-white dark:bg-${colorTheme}-600 dark:border-${colorTheme}-800`; } else { buttonStateClasses = "bg-gray-100 border-gray-300 text-gray-800 hover:bg-gray-200 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-600"; }
          const radioCheckboxBase = `inline-flex items-center justify-center w-4 h-4 border rounded-${type === 'radio' ? 'full' : 'md'} mr-2 flex-shrink-0 ring-1 ring-inset`;
          let radioCheckboxSelectedClasses; if (isSelected) { radioCheckboxSelectedClasses = `bg-white border-${colorTheme}-500 dark:bg-gray-200 dark:border-${colorTheme}-600 ring-${colorTheme}-300 dark:ring-${colorTheme}-700`; } else { radioCheckboxSelectedClasses = 'border-gray-400 dark:border-gray-500 ring-transparent'; }
          const innerMark = isSelected ? createElement('span', { className: `block w-2 h-2 rounded-${type === 'radio' ? 'full' : 'sm'} bg-${colorTheme}-500 dark:bg-${colorTheme}-600` }) : null;
          return createElement( 'button', { type: 'button', className: `${baseClasses} ${buttonStateClasses}`, onClick: onClick }, createElement('span', { className: `${radioCheckboxBase} ${radioCheckboxSelectedClasses}` }, innerMark), createElement('span', { className: 'flex-grow' }, text) );
      };

      return createElement( 'div', { className: 'w-full' },
          // גודל כותרת מאוחד
          createElement('h2', { className: 'text-xl sm:text-2xl font-semibold text-center mb-4 text-gray-900 dark:text-gray-100' }, 'הגדרות משחק'),
          createElement('div', { className: 'mb-6' },
              // גודל תווית מוקטן
              createElement('h3', { className: 'text-base font-medium mb-2 text-gray-800 dark:text-gray-200' }, 'בחר רמת קושי:'),
              createElement('div', { className: 'grid grid-cols-2 sm:grid-cols-4 gap-3' },
                  Object.entries(difficultyOptions).map(([key, { label }]) => createElement(SelectionButton, { key: key, text: label, isSelected: difficultyKey === key, type: 'radio', onClick: () => handleDifficultyChange(key), isAllOption: key === 'all' }))
              )
          ),
          createElement('div', { className: 'mb-6' },
               // גודל תווית מוקטן
              createElement('h3', { className: 'text-base font-medium mb-2 text-gray-800 dark:text-gray-200' }, 'בחר נושאים (אחד או יותר):'),
              createElement('div', { className: 'grid grid-cols-2 sm:grid-cols-3 gap-3' },
                   createElement(SelectionButton, { key: 'all-topics', text: 'הכל', isSelected: selectedTopicsInternal.size === actualAvailableTopics.length && actualAvailableTopics.length > 0, type: 'checkbox', onClick: handleSelectAllTopics, isAllOption: true }),
                   actualAvailableTopics.map(topic => createElement(SelectionButton, { key: topic, text: topic, isSelected: selectedTopicsInternal.has(topic), type: 'checkbox', onClick: () => handleTopicToggle(topic), isAllOption: false }))
              )
          ),
          createElement('button', { // כפתור התחלה - מוקטן
              className: `w-full py-2 px-5 text-base rounded-full font-semibold transition-opacity duration-300 flex items-center justify-center ${ selectedTopicsInternal.size === 0 || availableCount === 0 ? 'bg-gray-400 text-gray-700 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400' : 'bg-green-500 text-white hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700' } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:focus:ring-offset-gray-800`,
              onClick: handleStartClick,
              disabled: selectedTopicsInternal.size === 0 || availableCount === 0
          },
              createElement('span', null, 'התחל משחק'),
              selectedTopicsInternal.size > 0 && availableCount >= 0 && createElement('span', { className: 'text-xs font-normal opacity-80 mr-2' }, `[${availableCount} ${availableCount === 1 ? 'תרגול' : 'תרגולים'}]`)
          )
      );
  } // סוף GameSetup

  // --- Main Return ---
  return createElement(
    'div', { className: 'container flex flex-col items-center justify-start pt-2 pb-6 min-h-screen gap-3 px-4 sm:px-8 relative' }, // Container חיצוני

    createElement(GameHeader, null), // הדר (רק שורה עליונה)

    // Container מרכזי עם רקע, עוטף את התוכן המשתנה
    createElement('div', { className: 'w-full max-w-lg mx-auto my-4 p-4 sm:p-6 bg-white dark:bg-gray-800 shadow-md rounded-lg flex flex-col items-center flex-grow' },

        gameState === 'setup'
        ? // תוכן מסך ההגדרות
          createElement(GameSetup, {
              initialDifficultyRange: selectedDifficultyRange,
              initialTopics: selectedTopics,
              onStartGame: handleStartGame,
              allGroups: groups
          })
        : // תוכן מסך המשחק (בתוך הקופסה)
          createElement(React.Fragment, null,
              // כותרת משנה (גודל מאוחד)
              createElement('h2', {
                  className: 'text-xl sm:text-2xl font-semibold text-center mb-2 text-gray-800 dark:text-gray-200'
                 },
                  gameState === 'playing' && !finished && currentGroup ? `תרגול בנושא: ${currentGroup.topic || 'כללי'} | רמה: ${getDifficultyText(selectedDifficultyRange)}` : ''
              ),
              // שורת סטטוס
              createElement('div', { className: 'flex justify-center items-center space-x-4 space-x-reverse text-sm text-gray-600 dark:text-gray-400 mb-2 w-full' },
                  gameState === 'playing' && !finished && currentGroup ? [
                      createElement('span', { key: 'count' }, `תרגול: ${sessionExerciseCount > 0 ? sessionExerciseCount : '?'}/${totalGroupsInSelection > 0 ? totalGroupsInSelection : '?'}`),
                      createElement('span', { key: 'sep1', className: 'opacity-50'}, '|'),
                      createElement('span', { key: 'attempts' }, `ניסיונות: ${attempts}`),
                      createElement('span', { key: 'sep2', className: 'opacity-50'}, '|'),
                      createElement('span', { key: 'timer' }, `זמן: ${formatTime(timer)}`)
                  ] : null
              ),
               // הוראות
              createElement('p', { className: 'text-center text-sm text-gray-500 dark:text-gray-400 mb-3' },
                  gameState === 'playing' && !finished && currentGroup ? 'סדר/י את המשפטים הבאים לפי שרשרת של סיבות ותוצאה' : ''
              ),
              // אזור המשפטים
              createElement( 'div', {
                  id: 'sortable-container',
                  ref: containerRef,
                  className: `flex flex-col items-center w-full ${isLoading || finished ? 'min-h-[200px]' : ''}`
                 },
                  isLoading ? createElement('div', { className: 'text-center p-4 text-gray-500 dark:text-gray-400' }, 'טוען...')
                  : !finished && currentGroup ? currentGroup.sentences.map((s, index) => renderSentence(s, index))
                  : null
              ),
              // כפתור פעולה (ממורכז)
              actionButton,
               // הודעת סיום
              createElement('div', { className: 'text-center mt-4' },
                  gameState === 'playing' && finished ? [
                      createElement('h2', { key:'fin-h2', className: 'text-2xl font-bold text-green-600 dark:text-green-400'}, '🎉 כל הכבוד! 🎉'),
                      createElement('p', { key:'fin-p', className: 'text-lg text-gray-700 dark:text-gray-300 mt-1'}, `סיימת את כל ${totalGroupsInSelection} התרגולים בבחירה זו!`)
                  ] : null
              )
          ) // סוף פרגמנט משחק
    ), // סוף Container מרכזי

    createElement(Footer, null), // פוטר

    ToastComponent // הודעות קופצות
  );
} // סוף קומפוננטת App

// Render the App (ללא שינוי)
ReactDOM.createRoot(document.getElementById('root')).render(createElement(App));