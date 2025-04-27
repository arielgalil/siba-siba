const { createElement, useState, useEffect, useRef } = React;

// --- Firebase Setup ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
// Import auth functions needed
import { getAuth, onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";

// Firebase config (same as in admin.html)
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
const auth = getAuth(app); // Initialize Auth
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
  const [displayedScore, setDisplayedScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [checkButtonState, setCheckButtonState] = useState("check");
  const [checkedResults, setCheckedResults] = useState(undefined);
  const [currentUser, setCurrentUser] = useState(null);
  const [userName, setUserName] = useState(''); // Kept but not displayed
  const [isLoading, setIsLoading] = useState(true);

  // --- Refs ---
  const containerRef = useRef(null);
  const currentGroupRef = useRef(currentGroup);
  let timerInterval = useRef(null);
  const scoreRef = useRef(null);
  const difficultyRef = useRef(null);
  const isFirstRender = useRef(true);
  const initialGroupLoadDone = useRef(false);

  // --- useEffect Hooks ---

  // Update currentGroupRef when currentGroup changes
  useEffect(() => {
    currentGroupRef.current = currentGroup;
    if (currentGroup) {
      console.log('Current group updated. Order:', currentGroup.sentences.map(s => s.id));
      setCheckedResults(undefined); // Reset visual checks on new group
      setCheckButtonState("check"); // Reset button state
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
                    ...sentence,
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
                setCurrentGroup(null);
                setFinished(true);
                setIsLoading(false);
            } else {
                 // Data updated while playing? Update the list but don't disrupt the game.
                 console.log("Firebase data updated. Available groups list refreshed.");
            }
          } else {
            console.warn("No groups data found in Firebase or data is not an array.");
            setGroups([]);
            setMessage('לא נמצאו קבוצות משחק במסד הנתונים.');
            setCurrentGroup(null);
            setFinished(true);
            setIsLoading(false);
          }
        }, (error) => {
          console.error('Error fetching groups from Firebase:', error);
          setMessage(`שגיאה בטעינת הנתונים: ${error.code === 'PERMISSION_DENIED' ? 'יש לוודא שהרשאות הקריאה ב-Firebase תקינות.' : error.message}`);
          setGroups([]);
          setCurrentGroup(null);
          setFinished(true);
          setIsLoading(false);
          if (dataUnsubscribe) {
              dataUnsubscribe();
              dataUnsubscribe = null;
          }
        });

      } else {
        console.log("Auth state changed: User is signed out.");
        setUserName('');
        setGroups([]);
        setCurrentGroup(null);
        setFinished(false);
        setMessage('מתחבר באופן אנונימי...');
        setIsLoading(true);

        if (dataUnsubscribe) {
          console.log("User signed out, unsubscribing from data.");
          dataUnsubscribe();
          dataUnsubscribe = null;
        }

        signInAnonymously(auth).catch(error => {
            console.error("Anonymous sign-in failed:", error);
            setMessage('התחברות אנונימית נכשלה. נסה לרענן.');
            setIsLoading(false);
        });
      }
    });

    // Cleanup function
    return () => {
      console.log("Cleaning up listeners...");
      authUnsubscribe();
      if (dataUnsubscribe) {
        dataUnsubscribe();
      }
    };
  }, []); // Run only once on mount

  // Timer useEffect
  useEffect(() => {
    if (currentGroup && !isLoading) {
      const newStartTime = Date.now();
      setStartTime(newStartTime);
      setTimer(0);

      timerInterval.current = setInterval(() => {
        setTimer(prevTimer => prevTimer + 1);
      }, 1000);
    } else {
        if (timerInterval.current) {
            clearInterval(timerInterval.current);
            timerInterval.current = null;
        }
    }
    return () => {
      if (timerInterval.current) clearInterval(timerInterval.current);
    };
  }, [currentGroup, isLoading]);

  // Score Animation useEffect
  useEffect(() => {
    if (score === displayedScore) return;
    const duration = 1000;
    const start = displayedScore;
    const end = score;
    const startTimeAnim = performance.now();
    let lastVibrationTime = startTimeAnim;
    function animate(time) {
      const elapsed = time - startTimeAnim;
      const progress = Math.min(elapsed / duration, 1);
      const current = Math.floor(start + (end - start) * (progress * progress));
      setDisplayedScore(current);

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

  // Score Pulse Animation useEffect
  useEffect(() => {
    if (isFirstRender.current && score === 0) return;
    if (scoreRef.current) {
      scoreRef.current.classList.add('pulse');
      setTimeout(() => {
        scoreRef.current && scoreRef.current.classList.remove('pulse');
      }, 1000);
    }
  }, [score]);

  // Difficulty Pulse Animation useEffect
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

  // SortableJS Initialization useEffect
  useEffect(() => {
    let sortableInstance = null;
    // Initialize Sortable only when not loading AND a group is present
    if (containerRef.current && window.Sortable && !isLoading && currentGroup) {
        sortableInstance = new Sortable(containerRef.current, {
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
              if (navigator.vibrate) navigator.vibrate(30);
            },
            onUpdate: function (e) {
              // Prevent updates if checking order
              if (checkButtonState === 'checking') return;

              if (!currentGroupRef.current) return;
              const newOrder = Array.from(e.to.children).map(child =>
                child.getAttribute('data-id')
              );
              setCurrentGroup(prev => {
                 if (!prev) return prev;
                 const newSentences = newOrder
                   .map(id => prev.sentences.find(s => s.id === id))
                   .filter(Boolean);
                 if (newSentences.length !== prev.sentences.length) {
                    console.error("Sentence ID mismatch during sort update!");
                    return prev;
                 }
                 if (navigator.vibrate) navigator.vibrate(50);
                 return { ...prev, sentences: newSentences };
              });
            }
        });
    }
    // Cleanup Sortable instance if it was created
    return () => {
        if (sortableInstance) {
            sortableInstance.destroy();
        }
    };
    // Re-initialize if isLoading changes or currentGroup changes
  }, [isLoading, currentGroup]);

  // --- Helper Functions ---

  // Format time as MM:SS
  function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  function calculateScore({ timer, attempts, difficulty, totalSentences, lockedSentences }) {
    const baseScore = 100;
    const difficultyBonus = difficulty * 20;
    const lengthBonus = totalSentences * 15;
    const lockedPenalty = lockedSentences * 10;
    const timePenalty = timer * 2;
    const attemptsPenalty = Math.max(0, (attempts - 1) * 15);
    let currentScore = baseScore + difficultyBonus + lengthBonus - lockedPenalty - timePenalty - attemptsPenalty;
    return Math.max(0, Math.floor(currentScore));
  }

  function getDifficultyText(diff) {
    if (diff <= 2) return "קל";
    if (diff <= 4) return "בינוני";
    return "קשה";
  }

  function loadRandomGroupByDifficulty(groupsArray, diff) {
    // Removed isLoading check from here
    if (!groupsArray || groupsArray.length === 0) {
      console.log("Skipping group load due to empty groups array.");
       setMessage('לא נמצאו קבוצות משחק זמינות.');
       setCurrentGroup(null);
       setFinished(true);
      return;
    }

    const filtered = groupsArray.filter(g => g.difficulty === diff);
    let randomGroup = null;

    if (filtered.length > 0) {
        randomGroup = filtered[Math.floor(Math.random() * filtered.length)];
    } else {
        const availableGroups = groupsArray.filter(g => g.sentences && g.sentences.length > 0);
        if (availableGroups.length > 0) {
            randomGroup = availableGroups[Math.floor(Math.random() * availableGroups.length)];
            console.warn(`No groups at difficulty ${diff}. Loading random group from difficulty ${randomGroup.difficulty}`);
            setDifficulty(randomGroup.difficulty);
        }
    }

    if (randomGroup) {
         if (!randomGroup.sentences || !randomGroup.sentences.every(s => s && s.id !== undefined && s.text !== undefined && s.movable !== undefined)) {
             console.error("Selected group has invalid sentence structure:", randomGroup);
             setMessage("שגיאה בנתוני הקבוצה שנבחרה.");
             setCurrentGroup(null);
             setFinished(true);
             return;
         }
         const groupWithOrder = {
           ...randomGroup,
           originalOrder: randomGroup.sentences.map(s => s.id)
         };
         // Reset attempts and message for the new group
         setAttempts(0);
         setMessage('');
         // Set the new group, triggering timer restart etc.
         setCurrentGroup(shuffleGroup(groupWithOrder));
         setFinished(false); // Ensure game is not marked as finished
    } else {
        setMessage('לא נמצאו קבוצות משחק זמינות.');
        setFinished(true);
        setCurrentGroup(null);
    }
  }

  function shuffleGroup(group) {
    if (!group || !Array.isArray(group.sentences) || group.sentences.length === 0) {
        console.error("Cannot shuffle group with invalid sentences:", group);
        return group;
    }

    const sentencesCopy = [...group.sentences];
    const total = sentencesCopy.length;
    const result = new Array(total).fill(null);
    const originalMovable = [];
    const fixedPositions = {};

    for (let i = 0; i < total; i++) {
      const sentence = sentencesCopy[i];
      if (sentence && sentence.movable !== undefined) {
            if (!sentence.movable) {
                result[i] = sentence;
                fixedPositions[i] = sentence;
            } else {
                originalMovable.push(sentence);
            }
        } else {
            console.warn("Invalid sentence structure detected during shuffle:", sentence);
            result[i] = sentence;
            fixedPositions[i] = sentence;
        }
    }

    const movable = originalMovable.slice();
    // Fisher-Yates shuffle
    for (let i = movable.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [movable[i], movable[j]] = [movable[j], movable[i]];
    }

    // Ensure shuffled order is different if possible
    let same = movable.length > 0 && movable.every((item, i) => item.id === originalMovable[i].id);
    if (same && movable.length > 1) {
       // Simple swap of first two if order is identical and possible
       const firstMovableIndex = sentencesCopy.findIndex(s => s && s.movable);
       const secondMovableIndex = sentencesCopy.findIndex((s, idx) => s && s.movable && idx > firstMovableIndex);
       if (firstMovableIndex !== -1 && secondMovableIndex !== -1) {
          console.log("Shuffled order was same as original, swapping first two movable.");
          [movable[0], movable[1]] = [movable[1], movable[0]]; // Swap in the shuffled array
       }
    }

    let movableIndex = 0;
    for (let i = 0; i < total; i++) {
      if (result[i] === null) {
          if (movableIndex < movable.length) {
              result[i] = movable[movableIndex++];
          } else {
              console.error("Error in shuffle logic: Not enough movable items.");
              result[i] = sentencesCopy.find(s => s !== null) || {id:`error-${i}`, text:"שגיאת ערבוב", movable:true};
          }
      }
    }

     if (result.some(item => item === null)) {
        console.error("Shuffle result contains null values!", result);
        return group;
     }

    return { ...group, sentences: result };
  }


  // *** Modified checkOrder for sequential feedback ***
  function checkOrder() {
    if (isLoading || !currentGroup || finished || checkButtonState !== 'check') return;

    setAttempts(a => a + 1);
    setCheckButtonState("checking"); // Disable button during check
    setMessage("בודק..."); // Optional checking message

    const correctOrder = currentGroup.originalOrder;
    const currentSentences = currentGroupRef.current.sentences; // Use ref for current order
    const results = []; // Store results as we go
    const checkDelay = 350; // Delay between checking each sentence (in ms)

    // Reset visual state before starting sequential check
    setCheckedResults(new Array(currentSentences.length).fill(null));

    function checkSentenceAtIndex(index) {
      if (index >= currentSentences.length) {
        // Finished checking all sentences
        const allCorrect = results.every(res => res === true);
        finalizeCheck(allCorrect);
        return;
      }

      const sentence = currentSentences[index];
      const isCorrect = sentence.id === correctOrder[index];
      results[index] = isCorrect; // Store result

      // Update visual state for the current sentence only
      setCheckedResults(prev => {
          const newResults = [...(prev || new Array(currentSentences.length).fill(null))];
          newResults[index] = isCorrect;
          return newResults;
      });

       // Vibrate based on correctness for immediate feedback
       if (navigator.vibrate) {
            navigator.vibrate(isCorrect ? 50 : [80, 40, 80]); // Short buzz for correct, double for wrong
       }

      // Wait and then check the next sentence
      setTimeout(() => {
        checkSentenceAtIndex(index + 1);
      }, checkDelay);
    }

    // Function to run after all sentences are checked sequentially
    function finalizeCheck(allCorrect) {
        if (allCorrect) {
          setMessage('כל הכבוד! סדר נכון!');
          setCheckButtonState("ready"); // Set button to "Next Level" state

          const totalSentences = currentGroup.sentences.length;
          const lockedSentences = currentGroup.sentences.filter(s => !s.movable).length;
          const earnedScore = calculateScore({
            timer, attempts, difficulty, totalSentences, lockedSentences
          });
          setScore(s => s + earnedScore);

          if (timerInterval.current) {
            clearInterval(timerInterval.current);
            timerInterval.current = null;
          }
          // Success vibration pattern
          if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        } else {
          setMessage('נסה שוב!');
          setCheckButtonState("check"); // Allow checking again
          // Failure vibration pattern (longer single buzz)
          // if (navigator.vibrate) navigator.vibrate(200); // Already vibrated per item
        }
    }

    // Start the sequential check from the first sentence
    checkSentenceAtIndex(0);
  }
  // *** End of modified checkOrder ***


  function nextLevel() {
    if (isLoading || checkButtonState !== 'ready') return;
    setCheckedResults(undefined); // Clear results from previous level
    setMessage('');
    setCheckButtonState("check");

    // Find the next available difficulty level
    const availableDifficulties = Array.from(new Set(groups.map(g => g.difficulty))).sort((a, b) => a - b);
    const currentDifficultyIndex = availableDifficulties.indexOf(difficulty);
    let nextDiff;

    if (currentDifficultyIndex === -1 || currentDifficultyIndex >= availableDifficulties.length - 1) {
        // Wrap around to the first difficulty if at the end or current not found
        nextDiff = availableDifficulties[0] || 1; // Default to 1 if no difficulties exist
        console.log("Reached max difficulty or current not found, wrapping to first:", nextDiff);
    } else {
        nextDiff = availableDifficulties[currentDifficultyIndex + 1];
    }

    // Update difficulty state *before* loading the group
    setDifficulty(nextDiff);
    // Load a random group with the new difficulty
    // Pass the current `groups` state to ensure it uses the latest list
    loadRandomGroupByDifficulty(groups, nextDiff);
}


  function renderSentence(sentence, index) {
    // Corrected function
    const classes = [
      'text-box', 'my-2', 'w-full', 'max-w-md', 'rounded-2xl', 'relative', 'flex', 'items-center', 'p-3', 'transition-colors', 'duration-300' // Added transition
    ];
    // Apply visual feedback based on checkedResults state
    if (checkedResults !== undefined && checkedResults[index] !== null) {
      classes.push(checkedResults[index] ? 'correct' : 'wrong');
    }
    // Apply fixed class if not movable
    if (sentence && !sentence.movable) {
      classes.push('fixed');
    }

    const iconClass = sentence.movable ? 'bi-grip-vertical' : 'bi-lock-fill';
    const iconColor = sentence.movable ? 'text-gray-400 dark:text-gray-500' : 'text-blue-500 dark:text-blue-400';

    return createElement(
      'div',
      { key: sentence.id, 'data-id': sentence.id, className: classes.join(' ') },
      createElement('i', { className: `bi ${iconClass} ${iconColor} ml-3 text-xl flex-shrink-0` }), // Added flex-shrink-0
      createElement('span', { className: 'sentence-text flex-grow break-words' }, sentence.text) // Added break-words
    );
  }


  // --- JSX-like Rendering ---
  const headerTop = createElement(
    'div',
    { className: 'header-top flex items-center justify-between w-full max-w-md px-1' },
    createElement('h1', { className: 'title text-2xl sm:text-3xl font-bold' }, 'שרשרת סיבות ⛓️‍💥‏‏'),
    createElement('div', { className: 'difficulty text-sm sm:text-base', ref: difficultyRef }, `רמה: ${getDifficultyText(difficulty)}`)
  );

  const headerBottom = createElement(
    'div',
    { className: 'header-bottom flex justify-between w-full max-w-md text-sm sm:text-base px-1' },
    createElement('div', null, `ניסיונות: ${attempts}`),
    createElement('div', null, `זמן: ${formatTime(timer)}`),
    createElement('div', { ref: scoreRef }, `ניקוד: ${String(displayedScore).padStart(5, '0')}`)
  );

  const messagesArea = createElement(
    'div',
    // Ensure message area doesn't collapse when empty
    { className: 'message text-center my-2 min-h-[1.5em]' },
    message ? message : '\u00A0' // Use non-breaking space for height
  );

  const buttonText = checkButtonState === "ready" ? "מוכן לאתגר הבא?" :
                     checkButtonState === "checking" ? "בודק..." : "בדיקה";

  // Disable button if loading, checking, or finished without a group
  const buttonDisabled = isLoading || checkButtonState === "checking" || (finished && !currentGroup);

  const actionButton = createElement(
    'button',
    {
      className: `check-button mt-4 py-2 px-6 text-lg rounded-full font-semibold transition-opacity duration-300 ${checkButtonState === "ready" ? "ready" : ""} ${buttonDisabled ? "opacity-50 cursor-not-allowed" : "hover:opacity-90"}`, // Added rounded-full, font-semibold, hover effect
      onClick: () => {
        if (checkButtonState === "check") checkOrder();
        else if (checkButtonState === "ready") nextLevel();
      },
      disabled: buttonDisabled
    },
    buttonText
  );

  // --- Main Return ---
  return createElement(
    'div',
    { className: 'container flex flex-col items-center justify-start pt-5 min-h-screen gap-3 p-4' },
    headerTop,
    headerBottom,
    messagesArea,
    createElement(
      'div',
      // Add a minimum height while loading to prevent layout shifts
      { id: 'sortable-container', ref: containerRef, className: `flex flex-col items-center w-full max-w-md ${isLoading ? 'min-h-[200px]' : ''}` },
       isLoading
        ? createElement('div', { className: 'text-center p-4 text-gray-500 dark:text-gray-400' }, message || 'טוען...') // Loading indicator
        : currentGroup
          ? currentGroup.sentences.map((s, index) => renderSentence(s, index)) // Render sentences
          : createElement('div', { className: 'text-center p-4 text-gray-500 dark:text-gray-400' }, finished ? 'סיימת את כל התרגילים!' : message || 'לא נמצאו קבוצות.') // Finished or error message
    ),
    // Render button only if not loading AND (either a group is loaded OR the game is finished state is set)
    // This ensures the button shows even if loading the *next* group fails but we were finished.
    !isLoading && (currentGroup || finished) && actionButton
  );
}

// Render the App
ReactDOM.createRoot(document.getElementById('root')).render(createElement(App));