const { createElement, useState, useEffect, useRef } = React;

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
  const [groups, setGroups] = useState([]);
  const [currentGroup, setCurrentGroup] = useState(null);
  const [attempts, setAttempts] = useState(0); // Attempts for the current exercise
  const [startTime, setStartTime] = useState(Date.now());
  const [timer, setTimer] = useState(0); // Timer for the current exercise
  const [score, setScore] = useState(0); // Total score for the session
  const [finished, setFinished] = useState(false); // Is the entire selected session finished?
  const [checkButtonState, setCheckButtonState] = useState("check"); // 'check', 'checking', 'ready'
  const [checkedResults, setCheckedResults] = useState(undefined); // Visual feedback for sentences
  const [currentUser, setCurrentUser] = useState(null);
  const [userName, setUserName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [gameState, setGameState] = useState('setup'); // 'setup', 'playing'
  const [selectedDifficultyRange, setSelectedDifficultyRange] = useState({ min: 1, max: 2 });
  const [selectedTopics, setSelectedTopics] = useState(new Set(['מעבדה']));
  const [totalGroupsInSelection, setTotalGroupsInSelection] = useState(0); // How many exercises in total for this selection
  const [currentPlayingDifficulty, setCurrentPlayingDifficulty] = useState(null); // Current difficulty level being played
  const [groupsForCurrentDifficulty, setGroupsForCurrentDifficulty] = useState([]); // Groups filtered for the current level
  const [playedInCurrentDifficulty, setPlayedInCurrentDifficulty] = useState(new Set()); // Indices played in current level
  const [lastCheckIncorrect, setLastCheckIncorrect] = useState(false); // Was the last check incorrect?
  const [sessionExerciseCount, setSessionExerciseCount] = useState(0); // Counter for exercises played in this session
  // --- NEW State Variables for Scoreboard ---
  const [totalSessionAttempts, setTotalSessionAttempts] = useState(0); // Total attempts across all exercises in session
  const [totalSessionTime, setTotalSessionTime] = useState(0); // Total time across all *correctly completed* exercises

  // --- Refs ---
  const containerRef = useRef(null);
  const currentGroupRef = useRef(currentGroup);
  let timerInterval = useRef(null);
  const scoreRef = useRef(null);
  const isFirstRender = useRef(true);
  const initialGroupLoadDone = useRef(false);

  // --- useEffect Hooks ---
  useEffect(() => { currentGroupRef.current = currentGroup; }, [currentGroup]);

  useEffect(() => { /* Auth and Data Loading */
    setIsLoading(true);
    let dataUnsubscribe = null;
    const authUnsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        setUserName(user.displayName || user.email || 'אורח');
        if (groups.length === 0 || !initialGroupLoadDone.current) {
          setIsLoading(true);
          if (dataUnsubscribe) dataUnsubscribe();
          dataUnsubscribe = onValue(groupsRef, (snapshot) => {
            const groupsData = snapshot.val() || [];
            if (Array.isArray(groupsData)) {
              const processedGroups = groupsData
                .map((group, groupIndex) => ({
                  ...group,
                  originalIndex: groupIndex,
                  topic: group.topic || 'כללי',
                  sentences: Array.isArray(group.sentences) ? group.sentences.map((sentence, sentenceIndex) => ({
                    text: sentence.text || '',
                    movable: sentence.movable !== undefined ? sentence.movable : true,
                    id: String(sentence.id ?? `${groupIndex}-${sentenceIndex}`)
                  })) : []
                }))
                .filter(g => g.sentences && g.sentences.length > 0 && g.difficulty);
              setGroups(processedGroups);
              initialGroupLoadDone.current = true;
              setIsLoading(false);
              if (gameState === 'playing' && processedGroups.length === 0) {
                setGameState('setup');
                setToast({ show: true, message: '🤔 אין נתונים למשחק, חזרנו להגדרות.', type: 'info' });
              } else if (processedGroups.length === 0) {
                setToast({ show: true, message: '🤷‍♀️ אין קבוצות משחק.', type: 'info' });
              }
            } else {
              setGroups([]);
              initialGroupLoadDone.current = true;
              setIsLoading(false);
              setToast({ show: true, message: '🤷‍♀️ לא הצלחנו לטעון נתונים.', type: 'error' });
              setGameState('setup');
            }
          }, (error) => {
            console.error('Error fetching groups:', error);
            setGroups([]); setCurrentGroup(null); setFinished(true); setIsLoading(false); initialGroupLoadDone.current = true; setGameState('setup');
            if (dataUnsubscribe) dataUnsubscribe();
          });
        } else { setIsLoading(false); }
      } else {
        setUserName(''); setGroups([]); setCurrentGroup(null); setFinished(false); setGameState('setup'); setIsLoading(true);
        initialGroupLoadDone.current = false; if (dataUnsubscribe) dataUnsubscribe();
        signInAnonymously(auth).catch(error => { console.error("Anon sign-in failed:", error); setIsLoading(false); });
      }
    });
    return () => { console.log("Cleaning up listeners..."); authUnsubscribe(); if (dataUnsubscribe) dataUnsubscribe(); };
  }, []);

  useEffect(() => { /* Timer */
    if (gameState === 'playing' && currentGroup && !isLoading && !finished) {
      const newStartTime = Date.now(); setStartTime(newStartTime); setTimer(0);
      if (timerInterval.current) { clearInterval(timerInterval.current); }
      timerInterval.current = setInterval(() => { setTimer(prevTimer => prevTimer + 1); }, 1000);
    } else {
      if (timerInterval.current) { clearInterval(timerInterval.current); timerInterval.current = null; }
    }
    return () => { if (timerInterval.current) { clearInterval(timerInterval.current); timerInterval.current = null; } };
  }, [gameState, finished, isLoading, currentGroup?.originalIndex]);


  useEffect(() => { /* Score Pulse */
    if (isFirstRender.current && score === 0) { isFirstRender.current = false; return; }
    if (scoreRef.current) {
      scoreRef.current.classList.remove('pulse'); void scoreRef.current.offsetWidth; scoreRef.current.classList.add('pulse');
      const timeoutId = setTimeout(() => { scoreRef.current && scoreRef.current.classList.remove('pulse'); }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [score]);

  useEffect(() => { /* SortableJS */
    let sortableInstance = null;
    if (gameState === 'playing' && !finished && !isLoading && currentGroup && containerRef.current) {
      sortableInstance = new Sortable(containerRef.current, {
        animation: 150, swap: true, swapClass: 'swap-highlight', draggable: '.sentence-box:not(.fixed)', filter: '.fixed',
        onMove: (evt) => !evt.related?.classList.contains('fixed'),
        onStart: () => { if (navigator.vibrate) navigator.vibrate(10); },
        onUpdate: (e) => {
          if (checkButtonState === 'checking') return; if (!currentGroupRef.current) return;
          setLastCheckIncorrect(false); setCheckedResults(undefined);
          const newOrder = Array.from(e.to.children).map(child => child.getAttribute('data-id'));
          setCurrentGroup(prev => {
            if (!prev) return prev;
            const newSentences = newOrder.map(id => prev.sentences.find(s => s.id === id)).filter(Boolean);
            if (newSentences.length !== prev.sentences.length || newSentences.some(s => !s)) { console.error("ID mismatch!"); return prev; }
            if (navigator.vibrate) navigator.vibrate(15);
            return { ...prev, sentences: newSentences };
          });
        }
      });
    }
    return () => { if (sortableInstance) { sortableInstance.destroy(); } };
  }, [gameState, finished, isLoading, currentGroup]);

  useEffect(() => { /* Toast Hiding */
    if (toast.show) {
      const timerId = setTimeout(() => { setToast(prev => ({ ...prev, show: false })); }, 3500);
      return () => clearTimeout(timerId);
    }
  }, [toast]);

  // --- Helper Functions ---
  function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(1, '0')}:${String(seconds).padStart(2, '0')}`; // Changed minutes padding
  }

  function calculateScore({ timer, attempts, difficultyRange, totalSentences, lockedSentences }) {
    const difficultyValue = difficultyRange.max || 1; const baseScore = 100; const difficultyBonus = difficultyValue * 20;
    const lengthBonus = totalSentences * 15; const lockedPenalty = lockedSentences * 10; const timePenalty = timer * 2;
    const attemptsPenalty = Math.max(0, (attempts - 1) * 15);
    let currentScore = baseScore + difficultyBonus + lengthBonus - lockedPenalty - timePenalty - attemptsPenalty;
    return Math.max(0, Math.floor(currentScore));
  }

  function getDifficultyTextAndIcon(range) { // Modified to return text and icon
      if (!range) return { text: "לא ידוע", icon: "" };
      if (range.min === 1 && range.max === 2) return { text: "קל", icon: "⭐" };
      if (range.min === 2 && range.max === 4) return { text: "בינוני", icon: "⭐⭐" };
      if (range.min === 4 && range.max === 5) return { text: "קשה", icon: "⭐⭐⭐" };
      if (range.min === 1 && range.max === 5) return { text: "הכל", icon: "👑" };
      return { text: `${range.min}-${range.max}`, icon: "" }; // Fallback
  }


  function shuffleGroup(group) {
    if (!group || !Array.isArray(group.sentences) || group.sentences.length === 0) return group;
    const sentencesCopy = [...group.sentences]; const total = sentencesCopy.length;
    const result = new Array(total).fill(null); const originalMovable = [];
    for (let i = 0; i < total; i++) { const sentence = sentencesCopy[i];
      if (sentence && sentence.movable !== undefined) { if (!sentence.movable) { result[i] = sentence; } else { originalMovable.push(sentence); }
      } else { console.warn("Invalid sentence:", sentence); result[i] = sentence; }
    }
    const movable = originalMovable.slice();
    for (let i = movable.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [movable[i], movable[j]] = [movable[j], movable[i]]; }
    let same = movable.length > 0 && movable.every((item, i) => item.id === originalMovable[i].id);
    if (same && movable.length > 1) { [movable[0], movable[1]] = [movable[1], movable[0]]; }
    let movableIndex = 0;
    for (let i = 0; i < total; i++) { if (result[i] === null) { if (movableIndex < movable.length) { result[i] = movable[movableIndex++]; }
        else { console.error("Shuffle error!"); const fallbackSentence = sentencesCopy.find(s => !result.includes(s)) || {id:`error-${i}`, text:"שגיאת ערבוב", movable:true}; result[i] = fallbackSentence; } }
    }
    if (result.some(item => item === null)) { console.error("Shuffle nulls!"); return group; }
    return { ...group, sentences: result };
  }

  const handleStartGame = (difficultyRange, topics, totalCount) => {
    setSelectedDifficultyRange(difficultyRange); setSelectedTopics(topics); setTotalGroupsInSelection(totalCount);
    setCurrentPlayingDifficulty(difficultyRange.min); setPlayedInCurrentDifficulty(new Set());
    // --- Reset Session Stats ---
    setSessionExerciseCount(0); setScore(0); setTotalSessionAttempts(0); setTotalSessionTime(0);
    // -------------------------
    setGameState('playing'); setIsLoading(true); setLastCheckIncorrect(false); setFinished(false); // Ensure finished is false
    loadGroupsForLevel(difficultyRange.min, topics);
  };

  const loadGroupsForLevel = (level, topics) => {
     if (!groups || groups.length === 0) { console.error("No base groups"); setToast({ show: true, message: 'שגיאה: לא נמצאו קבוצות.', type: 'error' }); handleReturnToSetup(); return; }
     const filteredForLevel = groups.filter(g => g.difficulty === level && topics.has(g.topic || 'כללי'));
     setGroupsForCurrentDifficulty(filteredForLevel); setPlayedInCurrentDifficulty(new Set());
     loadNextUnplayedGroupFromLevel(filteredForLevel, new Set());
  };


  const loadNextUnplayedGroupFromLevel = (groupsInLevel, playedInLevel) => {
      const unplayed = groupsInLevel.filter((group) => !playedInLevel.has(group.originalIndex));
      if (unplayed.length > 0) {
        const randomIndexInUnplayed = Math.floor(Math.random() * unplayed.length); const nextGroup = unplayed[randomIndexInUnplayed];
        const updatedPlayedInLevel = new Set(playedInLevel).add(nextGroup.originalIndex); setPlayedInCurrentDifficulty(updatedPlayedInLevel);
        if (!nextGroup.sentences ) { console.error("Invalid next group:", nextGroup); setToast({ show: true, message: 'שגיאה בטעינת תרגיל.', type: 'error' }); handleReturnToSetup(); return; }
        const groupWithOrder = { ...nextGroup, originalOrder: nextGroup.sentences.map(s => s.id) };
        setAttempts(0); // Reset attempts for the new exercise
        setCurrentGroup(shuffleGroup(groupWithOrder)); setSessionExerciseCount(prev => prev + 1);
        setIsLoading(false); setCheckButtonState("check"); setCheckedResults(undefined); setTimer(0); setLastCheckIncorrect(false);
      } else {
         const nextDifficulty = currentPlayingDifficulty + 1;
         if (nextDifficulty > selectedDifficultyRange.max) {
             // This case should now be handled by checkOrder setting finished=true
             // If we reach here, it might mean the last level had 0 exercises.
             console.log("No more groups in level and no higher levels selected.");
             if (!finished) { // Ensure we don't call redundantly
                 setFinished(true); // Mark as finished to show scoreboard
                 setIsLoading(false); // Ensure loading is off
             }
         } else {
             setCurrentPlayingDifficulty(nextDifficulty); loadGroupsForLevel(nextDifficulty, selectedTopics);
         }
      }
  };

  // --- Updated checkOrder function ---
  function checkOrder() {
    if (isLoading || !currentGroup || finished || checkButtonState !== 'check') return;

    setAttempts(a => a + 1);
    // --- Increment Total Session Attempts ---
    setTotalSessionAttempts(prev => prev + 1);
    // -------------------------------------
    setCheckButtonState("checking");
    setLastCheckIncorrect(false);
    const correctOrder = currentGroup.originalOrder;
    const currentSentences = currentGroupRef.current.sentences;
    if (!correctOrder || !currentSentences || correctOrder.length !== currentSentences.length) {
        console.error("Order check mismatch"); setToast({show:true, message:'שגיאה בבדיקה', type: 'error'}); setCheckButtonState("check"); return;
    }
    const results = []; const checkDelay = 350;
    setCheckedResults(new Array(currentSentences.length).fill(null));

    function checkSentenceAtIndex(index) {
        if (index >= currentSentences.length) { const allCorrect = results.every(res => res === true); finalizeCheck(allCorrect); return; }
        const sentence = currentSentences[index]; const isCorrect = sentence && sentence.id === correctOrder[index]; results[index] = isCorrect;
        setCheckedResults(prev => { const newResults = [...(prev || new Array(currentSentences.length).fill(null))]; newResults[index] = isCorrect; return newResults; });
        if (navigator.vibrate) navigator.vibrate(isCorrect ? 5 : 10);
        setTimeout(() => { checkSentenceAtIndex(index + 1); }, checkDelay);
    }

    function finalizeCheck(allCorrect) {
        if (allCorrect) {
            if (navigator.vibrate) navigator.vibrate(15);
            const isLastExerciseOfSelection = sessionExerciseCount === totalGroupsInSelection;
            const totalSentences = currentGroup.sentences.length;
            const lockedSentences = currentGroup.sentences.filter(s => !s.movable).length;
            const earnedScore = calculateScore({ timer, attempts, difficultyRange: selectedDifficultyRange, totalSentences, lockedSentences });
            setScore(s => s + earnedScore);

             // --- Accumulate Session Time ---
            setTotalSessionTime(prev => prev + timer);
            // -----------------------------

            if (timerInterval.current) { clearInterval(timerInterval.current); timerInterval.current = null; }

            if (isLastExerciseOfSelection) {
                console.log("Session complete!");
                if (typeof confetti === 'function') { confetti({ particleCount: 50, angle: 60, spread: 55, origin: { x: 0 } }); confetti({ particleCount: 50, angle: 120, spread: 55, origin: { x: 1 } }); }
                // --- REMOVED Toast ---
                setCheckButtonState("check"); // No button needed, will show scoreboard
                setFinished(true); // Mark game as finished - triggers scoreboard render
            } else {
                if (typeof confetti === 'function') { confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } }); }
                setCheckButtonState("ready"); // State for "Next Challenge" button
            }
          } else {
            setCheckButtonState("check"); setLastCheckIncorrect(true);
            if (navigator.vibrate) navigator.vibrate([10, 5, 10]);
          }
    }
    checkSentenceAtIndex(0);
  }
  // --- END: Updated checkOrder function ---

  function nextLevel() {
    if (isLoading || checkButtonState !== 'ready') return;
    setCheckedResults(undefined); setCheckButtonState("check"); setIsLoading(true); setLastCheckIncorrect(false);
    loadNextUnplayedGroupFromLevel(groupsForCurrentDifficulty, playedInCurrentDifficulty);
  }

  // This function is mainly for resetting the state
  function handleReturnToSetup() {
    console.log("Returning to setup.");
    setGameState('setup'); setCurrentGroup(null); setGroupsForCurrentDifficulty([]); setPlayedInCurrentDifficulty(new Set());
    setCurrentPlayingDifficulty(null); setTotalGroupsInSelection(0); setAttempts(0); setTimer(0); setScore(0);
    setFinished(false); setCheckButtonState('check'); setCheckedResults(undefined); setLastCheckIncorrect(false);
    setSessionExerciseCount(0); setTotalSessionAttempts(0); setTotalSessionTime(0); // Reset session stats
    if (timerInterval.current) { clearInterval(timerInterval.current); timerInterval.current = null; }
  }

  // --- START: Share Functionality ---
  async function handleShare() {
      const difficultyInfo = getDifficultyTextAndIcon(selectedDifficultyRange);
      const topicsText = Array.from(selectedTopics).join(', ');
      const timeText = formatTime(totalSessionTime);
      const gameUrl = window.location.origin + window.location.pathname; // Get base URL without query params or hash

      const shareText = `לוח תוצאות 🏆\nכל הכבוד ${userName}! 🎉\nשיחקת ברמה ${difficultyInfo.text} ${difficultyInfo.icon} בנושא/י ${topicsText}.\nהשגת ${score} נקודות, ב${totalSessionAttempts} ניסיונות ובמשך ${timeText} דקות.\n\nשחק גם אתה:`;

      if (navigator.share) {
          try {
              await navigator.share({
                  title: 'שרשרת סיבות - התוצאה שלי',
                  text: shareText,
                  url: gameUrl
              });
              console.log('Shared successfully');
          } catch (error) {
              console.error('Share failed:', error);
              // Optional: Fallback to copy if share fails? Or just log error.
              copyToClipboardFallback(shareText + '\n' + gameUrl);
          }
      } else {
          // Fallback for browsers that don't support navigator.share
          console.log('Navigator.share not supported, using fallback.');
          copyToClipboardFallback(shareText + '\n' + gameUrl);
      }
  }

  function copyToClipboardFallback(textToCopy) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(textToCopy)
              .then(() => {
                  setToast({ show: true, message: 'הטקסט הועתק ללוח!', type: 'success' });
              })
              .catch(err => {
                  console.error('Failed to copy text: ', err);
                  setToast({ show: true, message: 'שגיאה בהעתקה ללוח', type: 'error' });
              });
      } else {
          // Very basic fallback for really old browsers? Unlikely needed.
          setToast({ show: true, message: 'העתקה אוטומטית אינה נתמכת', type: 'info' });
      }
  }
  // --- END: Share Functionality ---


  // --- START: Scoreboard Component ---
  function ScoreboardComponent({ userName, score, totalAttempts, totalTime, difficultyRange, topics, onPlayAgain, onShare }) {
      const difficultyInfo = getDifficultyTextAndIcon(difficultyRange);
      const topicsText = Array.from(topics).join(', ');
      const timeText = formatTime(totalTime);

      const buttonBaseClass = "py-2 px-4 rounded-full font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 text-sm sm:text-base";
      const playAgainButtonClass = `${buttonBaseClass} bg-green-500 text-white hover:bg-green-600 focus:ring-green-500`;
      const shareButtonClass = `${buttonBaseClass} bg-blue-500 text-white hover:bg-blue-600 focus:ring-blue-500`;

      return createElement('div', { className: 'flex flex-col items-center text-center p-4 sm:p-6 w-full' },
          createElement('h2', { className: 'text-2xl sm:text-3xl font-bold mb-3 text-gray-900 dark:text-gray-100' }, 'לוח תוצאות 🏆'),
          createElement('p', { className: 'text-lg sm:text-xl mb-4 text-gray-800 dark:text-gray-200' }, `כל הכבוד ${userName}! 🎉`),
          createElement('div', { className: 'mb-4 text-base sm:text-lg text-gray-700 dark:text-gray-300 space-y-1' },
              createElement('p', null, `שיחקת ברמה ${difficultyInfo.text} ${difficultyInfo.icon}`),
              createElement('p', null, `בנושא/י ${topicsText}.`)
          ),
          createElement('div', { className: 'mb-6 text-base sm:text-lg text-gray-700 dark:text-gray-300 space-y-1' },
              createElement('p', null, `השגת ${score} נקודות`),
              createElement('p', null, `ב-${totalAttempts} ${totalAttempts === 1 ? 'ניסיון' : 'ניסיונות'}`),
              createElement('p', null, `ובמשך ${timeText} דקות.`)
          ),
          createElement('div', { className: 'flex flex-col sm:flex-row justify-center items-center gap-3 w-full' },
              createElement('button', { className: shareButtonClass, onClick: onShare }, 'שתף תוצאות'),
              createElement('button', { className: playAgainButtonClass, onClick: onPlayAgain }, 'שחק שוב')
          )
      );
  }
  // --- END: Scoreboard Component ---


  // renderSentence - No changes needed
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
          createElement('span', { className: 'sentence-text flex-grow break-words select-text text-base' }, sentence.text)
      );
  }


  // Action Button Logic - No changes needed to class generation
  const getButtonClasses = () => {
      let base = 'mt-4 py-1.5 px-5 text-base rounded-full font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800';
      let stateClasses = '';
      // Note: session_finished state is no longer used for this button, scoreboard handles it.
      if (checkButtonState === "ready") { stateClasses = 'bg-yellow-400 text-black hover:bg-yellow-500 focus:ring-yellow-400'; }
      else if (checkButtonState === "checking") { stateClasses = 'bg-gray-500 text-white opacity-75 cursor-wait'; }
      else { if(lastCheckIncorrect) { stateClasses = 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500'; }
             else { stateClasses = 'bg-green-500 text-white hover:bg-green-600 focus:ring-green-500'; } }
      if (isLoading || (!currentGroup && gameState === 'playing' && !finished)) { stateClasses = 'bg-gray-400 text-gray-700 opacity-50 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400'; }
      return `${base} ${stateClasses}`;
  };

  // --- Updated Action Button Variables ---
  // (Defines text/onClick based on state, excluding finished state)
  let buttonText = '';
  let buttonOnClick = () => {};
  let buttonDisabled = isLoading; // Start with isLoading

  if (gameState === 'playing' && !finished) { // Only define if actively playing
      if (checkButtonState === "ready") {
          buttonText = "מוכן לאתגר הבא?"; buttonOnClick = nextLevel; buttonDisabled = isLoading;
      } else if (checkButtonState === "checking") {
          buttonText = "בודק..."; buttonOnClick = () => {}; buttonDisabled = true;
      } else { // 'check' state
          if (lastCheckIncorrect) { buttonText = "הסדר לא נכון - נסה שוב!"; }
          else { buttonText = "בדיקה"; }
          buttonOnClick = checkOrder; buttonDisabled = isLoading || !currentGroup;
      }
  }
  // --- END Updated Action Button Variables ---


  // --- JSX-like Rendering Elements ---
  const ToastComponent = toast.show ?
    createElement('div', { className: `toast fixed top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 p-4 rounded-lg shadow-lg text-white text-base z-50 transition-all duration-300 ease-out ${toast.type === 'success' ? 'bg-green-500' : toast.type === 'info' ? 'bg-blue-500' : 'bg-red-500'} ${toast.show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}` }, toast.message)
    : null;

  // Only render the action button if playing and not finished
  const actionButton = (gameState === 'playing' && !finished) ?
    createElement('button', { className: `${getButtonClasses()} self-center`, onClick: buttonOnClick, disabled: buttonDisabled }, buttonText )
    : null;

  // GameHeader Component - No changes needed
  const GameHeader = () => {
      const topRow = createElement('div', {className: 'flex justify-between items-center w-full max-w-4xl mx-auto px-4 pt-2'},
          createElement('div', {className: 'w-20 min-w-[0px]'}), // Spacer
          createElement('h1', { className: 'title text-xl sm:text-2xl font-bold text-center text-gray-900 dark:text-gray-100 flex-1 px-2' }, 'שרשרת סיבות ⛓️‍💥‏‏'),
          createElement('div', {className: 'text-right w-20'},
              createElement('div', {className: 'text-sm font-medium text-gray-700 dark:text-gray-300 truncate'}, userName || 'אורח'),
              createElement('div', {className: 'text-xs text-gray-500 dark:text-gray-400 mt-0.5', ref: scoreRef}, `ניקוד: ${String(score).padStart(5, '0')}`)
          )
      ); return topRow;
  };

  // Footer Component - No changes needed
  function Footer() {
    const linkClass = 'hover:text-gray-700 dark:hover:text-gray-300 underline mx-1';
    const separatorClass = 'opacity-50 mx-1';
    return React.createElement('footer', { className: 'w-full text-center text-xs text-gray-500 dark:text-gray-400 pt-4 pb-2' },
      'פותח על ידי אריאל מ', React.createElement('a', { href: 'https://galilbio.wordpress.com', target: '_blank', rel: 'noopener noreferrer', className: linkClass }, 'הביולוגים של גליל'), ' בעזרת ',
      React.createElement('a', { href: 'https://grok.com', target: '_blank', rel: 'noopener noreferrer', className: linkClass }, 'Grok'), ', ',
      React.createElement('a', { href: 'https://chatgpt.com/', target: '_blank', rel: 'noopener noreferrer', className: linkClass }, 'Chat GPT'), ' וגם ',
      React.createElement('a', { href: 'https://gemini.google.com/', target: '_blank', rel: 'noopener noreferrer', className: linkClass }, 'Gemini'),
      React.createElement('span', { className: separatorClass }, '|'), React.createElement('a', { href: './admin.html', target: '_blank', rel: 'noopener noreferrer', className: linkClass }, 'ניהול')
    );
  }

  // GameSetup Component - No changes needed
  
// public/app.js - Updated GameSetup Component (Label as Button with Input Inside)

function GameSetup({ initialDifficultyRange, initialTopics, onStartGame, allGroups }) {
    // State management remains the same as the previous version
    const [difficultyKey, setDifficultyKey] = useState(() => {
        if (initialDifficultyRange.min === 1 && initialDifficultyRange.max === 2) return 'easy';
        if (initialDifficultyRange.min === 2 && initialDifficultyRange.max === 4) return 'medium';
        if (initialDifficultyRange.min === 4 && initialDifficultyRange.max === 5) return 'hard';
        return 'all';
    });
    const [selectedTopicsInternal, setSelectedTopicsInternal] = useState(new Set(initialTopics));
    const [availableCount, setAvailableCount] = useState(0);

    const actualAvailableTopics = ['כללי', 'מעבדה', 'התא', 'אקולוגיה', 'גוף האדם'];
    const difficultyOptions = {
        easy: { label: 'קל', range: { min: 1, max: 2 } },
        medium: { label: 'בינוני', range: { min: 2, max: 4 } },
        hard: { label: 'קשה', range: { min: 4, max: 5 } },
        all: { label: 'הכל', range: { min: 1, max: 5 } }
    };

    // Effect to update available count (same as before)
    useEffect(() => {
        if (!allGroups || allGroups.length === 0) {
            setAvailableCount(0);
            return;
        }
        const currentRange = difficultyOptions[difficultyKey].range;
        const filtered = allGroups.filter(g => {
            const difficultyMatch = g.difficulty >= currentRange.min && g.difficulty <= currentRange.max;
            if (selectedTopicsInternal.size === 0) return false;
            const topicMatch = selectedTopicsInternal.has(g.topic || 'כללי');
            return difficultyMatch && topicMatch;
        });
        setAvailableCount(filtered.length);
    }, [difficultyKey, selectedTopicsInternal, allGroups]);

    // --- Handlers (same as before) ---
    const handleDifficultyChange = (event) => {
        setDifficultyKey(event.target.value);
    };
    const handleTopicToggle = (event) => {
        const topic = event.target.value;
        setSelectedTopicsInternal(prevTopics => {
            const newTopics = new Set(prevTopics);
            if (event.target.checked) {
                newTopics.add(topic);
            } else {
                newTopics.delete(topic);
            }
            return newTopics;
        });
    };
    const handleSelectAllTopics = (event) => {
        if (event.target.checked) {
            setSelectedTopicsInternal(new Set(actualAvailableTopics));
        } else {
            setSelectedTopicsInternal(new Set());
        }
    };
    const handleStartClick = () => {
        if (selectedTopicsInternal.size === 0) { alert('יש לבחור לפחות נושא אחד'); return; }
        if (availableCount === 0) { alert('לא נמצאו תרגילים התואמים לבחירה זו.'); return; }
        onStartGame(difficultyOptions[difficultyKey].range, selectedTopicsInternal, availableCount);
    };

    // --- Helper function to render the new button-like label with input ---
    const renderSelectionButton = ({ type, id, name, value, checked, onChange, labelText }) => {
        // Base classes for the label (acting as the button)
        const labelBaseClasses = "flex items-center justify-between w-full p-3 border rounded-lg cursor-pointer transition-all duration-200 shadow-sm";
        // Classes for the selected state (brighter look)
        const labelSelectedClasses = "bg-blue-100 border-blue-500 ring-2 ring-blue-300 dark:bg-blue-900 dark:border-blue-500 dark:ring-blue-600";
        // Classes for the unselected state
        const labelUnselectedClasses = "bg-white border-gray-300 hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600";
        // Classes for the input element itself
        const inputClasses = `h-5 w-5 accent-blue-600 focus:ring-0 focus:ring-offset-0`; // accent-* colors the check/dot

        return createElement('label', {
            htmlFor: id,
            className: `${labelBaseClasses} ${checked ? labelSelectedClasses : labelUnselectedClasses}`
        },
            // Text part of the button
            createElement('span', { className: 'text-sm sm:text-base text-gray-900 dark:text-gray-100' }, labelText),
            // Input element (radio or checkbox) placed inside the label
            createElement('input', {
                type: type,
                id: id,
                name: name,
                value: value,
                checked: checked,
                onChange: onChange,
                className: inputClasses // Apply input specific styles
            })
        );
    };

    // --- Component Render Structure ---
    return createElement(
        'div', { className: 'w-full' }, // Main container
        createElement('h2', { className: 'text-xl sm:text-2xl font-semibold text-center mb-5 text-gray-900 dark:text-gray-100' }, 'הגדרות משחק'),

        // Difficulty Selection Section
        createElement('div', { className: 'mb-6' },
            createElement('h3', { className: 'text-base font-medium mb-3 text-gray-800 dark:text-gray-200' }, 'בחר רמת קושי:'),
            createElement('div', { className: 'grid grid-cols-2 sm:grid-cols-4 gap-3' }, // Grid layout
                // Map through difficulty options
                Object.entries(difficultyOptions).map(([key, { label }]) =>
                    renderSelectionButton({
                        type: 'radio',
                        id: `difficulty-${key}`,
                        name: 'difficulty', // Same name groups radio buttons
                        value: key,
                        checked: difficultyKey === key, // Check if this is the selected difficulty
                        onChange: handleDifficultyChange,
                        labelText: label
                    })
                )
            )
        ),

        // Topic Selection Section
        createElement('div', { className: 'mb-6' },
            createElement('h3', { className: 'text-base font-medium mb-3 text-gray-800 dark:text-gray-200' }, 'בחר נושאים (אחד או יותר):'),
            createElement('div', { className: 'grid grid-cols-2 sm:grid-cols-3 gap-3' }, // Grid layout
                 // "Select All" checkbox
                 renderSelectionButton({
                     type: 'checkbox',
                     id: 'topic-all',
                     name: 'topic-all', // Unique name
                     value: 'all',
                     checked: selectedTopicsInternal.size === actualAvailableTopics.length && actualAvailableTopics.length > 0,
                     onChange: handleSelectAllTopics,
                     labelText: 'הכל'
                 }),
                 // Map through available topics
                 actualAvailableTopics.map(topic =>
                     renderSelectionButton({
                         type: 'checkbox',
                         id: `topic-${topic.replace(/\s+/g, '-')}`, // Create a unique ID
                         name: `topic-${topic.replace(/\s+/g, '-')}`, // Unique name
                         value: topic,
                         checked: selectedTopicsInternal.has(topic), // Check if this topic is selected
                         onChange: handleTopicToggle,
                         labelText: topic
                     })
                 )
            )
        ),

        // Start Game Button (remains the same)
        createElement('button', {
             className: `w-full py-2.5 px-5 text-base rounded-full font-semibold transition-opacity duration-300 flex items-center justify-center ${selectedTopicsInternal.size === 0 || availableCount === 0 ? 'bg-gray-400 text-gray-700 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400' : 'bg-green-500 text-white hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:focus:ring-offset-gray-800`,
             onClick: handleStartClick,
             disabled: selectedTopicsInternal.size === 0 || availableCount === 0
         },
             createElement('span', null, 'התחל משחק'),
             selectedTopicsInternal.size > 0 && availableCount >= 0 &&
             createElement('span', { className: 'text-xs font-normal opacity-80 mr-2' }, `[${availableCount} ${availableCount === 1 ? 'תרגול' : 'תרגולים'}]`)
         )
    ); // End of GameSetup container
}

  // End of GameSetup


  // --- Main Return of App Component ---
  // (Handles rendering Setup, Game, or Scoreboard)
  return createElement(
    'div', { className: 'container flex flex-col items-center justify-start pt-2 pb-6 gap-3 px-4 sm:px-8 relative flex-grow' },

    createElement(GameHeader, null), // Always show header

    // Main Content Area changes based on gameState and finished status
    createElement('div', { className: 'w-full max-w-lg mx-auto my-4 p-4 sm:p-6 bg-white dark:bg-gray-800 shadow-md rounded-lg flex flex-col items-center' },

        // --- State 1: Setup Screen ---
        gameState === 'setup' ?
          createElement(GameSetup, { initialDifficultyRange: selectedDifficultyRange, initialTopics: selectedTopics, onStartGame: handleStartGame, allGroups: groups })

        // --- State 2: Playing Screen (Session Finished) -> Show Scoreboard ---
        : gameState === 'playing' && finished ?
          createElement(ScoreboardComponent, {
              userName: userName, score: score, totalAttempts: totalSessionAttempts, totalTime: totalSessionTime,
              difficultyRange: selectedDifficultyRange, topics: selectedTopics,
              onPlayAgain: handleReturnToSetup, // Pass reset function
              onShare: handleShare // Pass share function
          })

        // --- State 3: Playing Screen (In Progress) -> Show Game Area ---
        : gameState === 'playing' && !finished ?
          createElement(React.Fragment, null, // Use Fragment for multiple elements
              // Game title/info
              createElement('h2', { className: 'text-xl sm:text-2xl font-semibold text-center mb-2 text-gray-800 dark:text-gray-200' },
                  currentGroup ? `תרגול בנושא: ${currentGroup.topic || 'כללי'} | רמה: ${getDifficultyTextAndIcon(selectedDifficultyRange).text}` : ''
              ),
              // Stats display
              createElement('div', { className: 'flex justify-center items-center space-x-4 space-x-reverse text-sm text-gray-600 dark:text-gray-400 mb-2 w-full' },
                   currentGroup ? [
                      createElement('span', { key: 'count' }, `תרגול: ${sessionExerciseCount}/${totalGroupsInSelection}`),
                      createElement('span', { key: 'sep1', className: 'opacity-50'}, '|'),
                      createElement('span', { key: 'attempts' }, `ניסיונות: ${attempts}`),
                      createElement('span', { key: 'sep2', className: 'opacity-50'}, '|'),
                      createElement('span', { key: 'timer' }, `זמן: ${formatTime(timer)}`)
                  ] : null
              ),
              // Instructions
              createElement('p', { className: 'text-center text-sm text-gray-500 dark:text-gray-400 mb-3' },
                  currentGroup ? 'סדר/י את המשפטים הבאים לפי שרשרת של סיבות ותוצאה' : ''
              ),
              // Sortable sentences container
              createElement( 'div', { id: 'sortable-container', ref: containerRef, className: `flex flex-col items-center w-full ${isLoading ? 'min-h-[200px]' : ''}` },
                  isLoading ? createElement('div', { className: 'text-center p-4 text-gray-500 dark:text-gray-400' }, 'טוען...')
                  : currentGroup ? currentGroup.sentences.map((s, index) => renderSentence(s, index))
                  : null // Should not happen if !isLoading
              ),
              // Action button (Check/Next Challenge)
              actionButton
          ) // End Fragment for Game Area
        // --- Fallback (Should ideally not be reached) ---
        : createElement('div', null, 'טוען אפליקציה...') // Fallback if state is unexpected

    ), // End Main Content Area div

    createElement(Footer, null), // Always show footer
    ToastComponent // Always render Toast container (visibility controlled by state)
  ); // End App main div
} // End of App Component

// Render the App to the DOM
ReactDOM.createRoot(document.getElementById('root')).render(createElement(App));

