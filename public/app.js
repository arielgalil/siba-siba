// public/app.js - Final Version (incorporating all changes)

const { createElement, useState, useEffect, useRef } = React;

// --- Firebase Setup ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInAnonymously, updateProfile } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
// Updated imports for database operations
import { getDatabase, ref, onValue, get, set, increment, query } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js"; // Removed unused orderByChild, equalTo for now

// Firebase config (Should be your trivbio project config)
const firebaseConfig = {
    apiKey: "AIzaSyAGFC_TB8iEMvS2PyxeASj1HH4i66AW4UA", // Replace with your trivbio API key
    authDomain: "trivbio.firebaseapp.com",
    databaseURL: "https://trivbio-default-rtdb.firebaseio.com", // trivbio DB URL
    projectId: "trivbio",
    storageBucket: "trivbio.appspot.com",
    messagingSenderId: "1097087574583",
    appId: "1:1097087574583:web:b36c0441537a1f596215b2",
    measurementId: "G-ZY245YB23E"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app); // Connection to trivbio DB
const groupsRef = ref(db, 'collections/groups'); // Ref to groups in trivbio DB
const statsRef = ref(db, 'stats/groupCountsByLevelTopic'); // Ref for counts in trivbio DB
// --- End of Firebase Setup ---


// --- Nickname Generation Data ---
const animalsMale = ["אריה", "נמר", "פיל", "זאב", "דוב", "שועל", "צבי", "סוס", "נשר", "ינשוף", "קוף", "גמל", "תנין", "צב", "קרנף", "היפופוטם", "יגואר", "ברדלס", "דולפין", "לוויתן", "פינגווין", "כלב ים", "אריה ים", "כריש", "גורילה", "שימפנזה", "פנדה", "קואלה", "דביבון", "בונה", "אייל", "יעל", "פלמינגו", "תוכי", "אלפקה", "למור", "עצלן", "גיבון", "דרקון קומודו"];
const animalsFemale = ["לביאה", "נמרה", "פילה", "זאבה", "דובה", "שועלה", "צביה", "סוסה", "ינשופה", "קופה", "גמלה", "תנינה", "צבה", "קרנפית", "דולפינה", "פינגווינית", "כלבת ים", "לביאת ים", "גורילה", "שימפנזה", "פנדה", "קואלה", "דביבונית", "בונה", "איילה", "יעלה", "פלמינגו", "תוכית", "אלפקה", "למור", "עצלנית", "ג'ירפה", "חתולה", "כלבה", "פרה", "כבשה", "ציפור", "נמלה", "דבורה", "פרפרית", "יענה"];
const attributesMale = ["אמיץ", "חכם", "מהיר", "שקט", "חזק", "סקרן", "נאמן", "פיקח", "נבון", "למדן", "מתמיד", "נחוש", "חרוץ", "שקדן", "איתן", "חקרן", "מתעניין", "פתוח", "יצירתי", "מנהיג", "אדיב", "רגוע", "ממוקד", "מגן", "מיוחד", "זוהר", "שמח", "אנרגטי", "נלהב", "אופטימי", "חיוני", "תוסס", "זריז", "מבין", "מהורהר", "נוצץ"];
const attributesFemale = ["אמיצה", "חכמה", "מהירה", "שקטה", "חזקה", "סקרנית", "נאמנה", "פיקחית", "נבונה", "למדנית", "מתמידה", "נחושה", "חרוצה", "שקדנית", "איתנה", "חקרנית", "מתעניינת", "פתוחה", "יצירתית", "מנהיגה", "אדיבה", "רגועה", "ממוקדת", "מגנה", "מיוחדת", "זוהרת", "שמחה", "אנרגטית", "נלהבת", "אופטימית", "חיונית", "תוססת", "זריזה", "מבינה", "מהורהרת", "נוצצת"];

/** Generates a random username. */
function generateRandomUsername() {
    const isMale = Math.random() < 0.5;
    const animals = isMale ? animalsMale : animalsFemale;
    const animal = animals[Math.floor(Math.random() * animals.length)];
    const attributes = isMale ? attributesMale : attributesFemale;
    const attribute = attributes[Math.floor(Math.random() * attributes.length)];
    return `${animal} ${attribute}`;
}
// --- End Nickname Generation ---

// #############################################
// ### Main App Component                    ###
// #############################################
function App() {
    // --- State Variables ---
    const [allGroupsData, setAllGroupsData] = useState(null); // Holds raw group data fetched ON DEMAND for the session
    const [currentGroup, setCurrentGroup] = useState(null);
    const [groupsForCurrentDifficulty, setGroupsForCurrentDifficulty] = useState([]);
    const [playedInCurrentDifficulty, setPlayedInCurrentDifficulty] = useState(new Set());
    const [currentPlayingDifficulty, setCurrentPlayingDifficulty] = useState(null);
    const [attempts, setAttempts] = useState(0);
    const [startTime, setStartTime] = useState(Date.now());
    const [timer, setTimer] = useState(0);
    const [finished, setFinished] = useState(false);
    const [checkButtonState, setCheckButtonState] = useState("check");
    const [checkedResults, setCheckedResults] = useState(undefined);
    const [lastCheckIncorrect, setLastCheckIncorrect] = useState(false);
    const [sessionExerciseCount, setSessionExerciseCount] = useState(0);
    const [totalSessionAttempts, setTotalSessionAttempts] = useState(0);
    const [totalSessionTime, setTotalSessionTime] = useState(0);
    const [sessionScore, setSessionScore] = useState(0);
    const [currentUser, setCurrentUser] = useState(null);
    const [userName, setUserName] = useState('');
    const [playerId, setPlayerId] = useState(null);
    const [cumulativeScore, setCumulativeScore] = useState(0); // Holds sibaSibaCumulativeScore
    const [isLoading, setIsLoading] = useState(true); // General loading (auth, initial player data)
    const [isFetchingGroups, setIsFetchingGroups] = useState(false); // Specific loading for game groups
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const [gameState, setGameState] = useState('setup');
    const [selectedDifficultyRange, setSelectedDifficultyRange] = useState({ min: 1, max: 2 });
    const [selectedTopics, setSelectedTopics] = useState(new Set(['מעבדה']));
    const [totalGroupsInSelection, setTotalGroupsInSelection] = useState(0);

    // --- Refs ---
    const containerRef = useRef(null);
    const currentGroupRef = useRef(currentGroup);
    let timerInterval = useRef(null);
    const scoreRef = useRef(null);
    const isFirstRender = useRef(true);

    // --- useEffect Hooks ---
    useEffect(() => { currentGroupRef.current = currentGroup; }, [currentGroup]);

    // *** Main useEffect for Auth, Player Data Loading ***
    useEffect(() => {
        console.log("Setting up auth listener...");
        setIsLoading(true);

        const authUnsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                const uid = user.uid;
                console.log("Auth state changed: User logged in", uid, user.isAnonymous);
                setCurrentUser(user);
                setPlayerId(uid);

                const playerRef = ref(db, `players/${uid}`);
                try {
                    const playerSnapshot = await get(playerRef);
                    const playerData = playerSnapshot.val() || {};

                    // Nickname Logic
                    let finalUsername = playerData.nickname;
                    if (!finalUsername) {
                        finalUsername = user.displayName || user.email;
                        if (!finalUsername) {
                            finalUsername = generateRandomUsername();
                            console.log("Generated new username:", finalUsername);
                            await set(ref(db, `players/${uid}/nickname`), finalUsername);
                             try { await updateProfile(user, { displayName: finalUsername }); } catch (e) { console.warn("Could not update profile.", e); }
                        } else {
                             await set(ref(db, `players/${uid}/nickname`), finalUsername);
                        }
                    }
                    setUserName(finalUsername || 'שחקן');

                    // Cumulative Score Logic
                    const currentCumulativeScore = playerData.sibaSibaCumulativeScore || 0;
                    setCumulativeScore(currentCumulativeScore);
                    console.log("Loaded cumulative score:", currentCumulativeScore);
                    setSessionScore(0); // Reset session score

                    // Save initial data if necessary
                    if (!playerSnapshot.exists() || typeof playerData.sibaSibaCumulativeScore === 'undefined') {
                        console.log("Saving initial player data / missing score field...");
                        const updates = {};
                        if (!playerData.nickname) updates.nickname = finalUsername;
                        if (typeof playerData.sibaSibaCumulativeScore === 'undefined') updates.sibaSibaCumulativeScore = 0;
                        if (typeof playerData.createdAt === 'undefined') updates.createdAt = Date.now(); // Add createdAt timestamp
                        if (Object.keys(updates).length > 0) {
                           await set(playerRef, { ...playerData, ...updates }, { merge: true }); // Use merge option
                        }
                    }

                } catch (error) {
                    console.error("Error fetching/setting player data:", error);
                    setUserName(user.displayName || user.email || 'שחקן');
                    setCumulativeScore(0); setSessionScore(0);
                    setToast({ show: true, message: 'שגיאה בטעינת נתוני שחקן.', type: 'error' });
                }

                setIsLoading(false); // Stop initial loading
                setGameState('setup');

            } else {
                // User logged out
                console.log("Auth state changed: User logged out.");
                setCurrentUser(null); setPlayerId(null); setUserName('');
                setCumulativeScore(0); setSessionScore(0);
                setAllGroupsData(null); setCurrentGroup(null);
                setFinished(false); setGameState('setup'); setIsLoading(true);
                signInAnonymously(auth).catch(error => {
                    console.error("Anon sign-in failed:", error); setIsLoading(false);
                    setToast({ show: true, message: 'שגיאה בהתחברות אנונימית.', type: 'error' });
                });
            }
        });
        return () => { console.log("Cleaning up auth listener."); authUnsubscribe(); };
    }, []);

    useEffect(() => { /* Timer */
        if (gameState === 'playing' && currentGroup && !isFetchingGroups && !finished) {
            const newStartTime = Date.now(); setStartTime(newStartTime); setTimer(0);
            if (timerInterval.current) { clearInterval(timerInterval.current); }
            timerInterval.current = setInterval(() => { setTimer(prevTimer => prevTimer + 1); }, 1000);
        } else {
            if (timerInterval.current) { clearInterval(timerInterval.current); timerInterval.current = null; }
        }
        return () => { if (timerInterval.current) { clearInterval(timerInterval.current); timerInterval.current = null; } };
    }, [gameState, finished, isFetchingGroups, currentGroup?.originalIndex]);

    useEffect(() => { /* Score Pulse */
        if (isFirstRender.current) { isFirstRender.current = false; return; }
         if (scoreRef.current) {
            scoreRef.current.classList.remove('pulse'); void scoreRef.current.offsetWidth; scoreRef.current.classList.add('pulse');
            const timeoutId = setTimeout(() => { if (scoreRef.current) scoreRef.current.classList.remove('pulse'); }, 800);
            return () => clearTimeout(timeoutId);
        }
    }, [cumulativeScore]);

    useEffect(() => { /* SortableJS */
        let sortableInstance = null;
        if (gameState === 'playing' && !isFetchingGroups && !finished && currentGroup && containerRef.current) {
            sortableInstance = new Sortable(containerRef.current, { /* ... sortable options ... */
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
        return () => { if (sortableInstance) sortableInstance.destroy(); };
    }, [gameState, finished, isFetchingGroups, currentGroup]);

    useEffect(() => { /* Toast Hiding */
        if (toast.show) {
            const timerId = setTimeout(() => { setToast(prev => ({ ...prev, show: false })); }, 3500);
            return () => clearTimeout(timerId);
        }
    }, [toast]);

    // --- Helper Functions ---
    function formatTime(totalSeconds) { /* ... as before ... */
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${String(minutes).padStart(1, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    function formatScore(scoreValue) { /* ... as before ... */
        if (typeof scoreValue !== 'number') return '0';
        return scoreValue.toLocaleString('en-US');
     }
    function calculateScore({ timer, attempts, difficultyRange, totalSentences, lockedSentences }) { /* ... as before ... */
        const difficultyValue = difficultyRange.max || 1; const baseScore = 100; const difficultyBonus = difficultyValue * 20;
        const lengthBonus = totalSentences * 15; const lockedPenalty = lockedSentences * 10; const timePenalty = timer * 2;
        const attemptsPenalty = Math.max(0, (attempts - 1) * 15);
        let currentScore = baseScore + difficultyBonus + lengthBonus - lockedPenalty - timePenalty - attemptsPenalty;
        return Math.max(0, Math.floor(currentScore));
     }
     function getDifficultyDisplayString(range) { /* ... as before ... */
        if (!range) return "לא ידוע";
        if (range.min === 1 && range.max === 2) return "קל 🍼 (⭐ ו-⭐⭐)";
        if (range.min === 2 && range.max === 4) return "בינוני 💪 (⭐⭐⭐ ו-⭐⭐⭐⭐)";
        if (range.min === 4 && range.max === 5) return "קשה 🤪 (⭐⭐⭐⭐⭐)";
        if (range.min === 1 && range.max === 5) return "הכל 👑 (⭐ עד ⭐⭐⭐⭐⭐)";
        return `מותאם אישית (${range.min}-${range.max})`;
     }
     function getTopicsDisplayString(topicsSet) { /* ... as before ... */
         const topicEmojiMap = { 'כללי': '⏳', 'מעבדה': '🧪', 'התא': '🦠', 'גוף האדם': '🫀', 'אקולוגיה': '🌍' };
         const topicsArray = Array.from(topicsSet);
         if (topicsArray.length === 0) return 'לא נבחרו נושאים';
         return topicsArray.map(topic => `${topic} ${topicEmojiMap[topic] || ''}`).join(' / ');
     }
    function shuffleGroup(group) { /* ... as before, ensure unique string IDs ... */
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
        // Ensure IDs are unique strings in the shuffled result
        const finalSentences = result.map((s, index) => ({ ...s, id: String(s.id ?? `${group.originalIndex}-shuffled-${index}`) }));
        return { ...group, sentences: finalSentences };
     }

    // --- Game Flow Functions ---
    const handleStartGame = (difficultyRange, topics, totalCount) => {
        setSelectedDifficultyRange(difficultyRange); setSelectedTopics(topics); setTotalGroupsInSelection(totalCount);
        setCurrentPlayingDifficulty(difficultyRange.min); setPlayedInCurrentDifficulty(new Set());
        setSessionExerciseCount(0); setSessionScore(0); setTotalSessionAttempts(0); setTotalSessionTime(0);
        setGameState('playing'); setIsLoading(false); setIsFetchingGroups(true); setLastCheckIncorrect(false); setFinished(false);
        // Start fetching group data for the first level
        loadGroupsForLevel(difficultyRange.min, topics);
    };

    const loadGroupsForLevel = async (level, topics) => {
        console.log(`Loading groups for level ${level}, topics:`, topics);
        setIsFetchingGroups(true); setCurrentGroup(null);

        try {
            // Fetch ALL groups data - consider optimization for very large datasets later
            const snapshot = await get(groupsRef);
            const groupsData = snapshot.val() || [];
             let allProcessedGroups = [];
             if (Array.isArray(groupsData)) {
                 allProcessedGroups = groupsData.map((group, groupIndex) => ({ /* ... process raw group ... */
                         ...group, originalIndex: groupIndex, topic: group.topic || 'כללי',
                         sentences: Array.isArray(group.sentences) ? group.sentences.map((sentence, sentenceIndex) => ({
                             text: sentence.text || '', movable: sentence.movable !== undefined ? sentence.movable : true, id: String(sentence.id ?? `${groupIndex}-${sentenceIndex}`)
                         })) : []
                     })).filter(g => g.sentences && g.sentences.length > 0 && g.difficulty);
             } else { /* ... handle object data source if necessary ... */
                 console.warn("Groups data is not an array, attempting object processing...");
                   allProcessedGroups = Object.entries(groupsData).map(([key, group]) => { /* ... process object entry ... */
                         const index = parseInt(key, 10);
                         return (group && !isNaN(index)) ? {
                             ...group, originalIndex: index, topic: group.topic || 'כללי',
                             sentences: Array.isArray(group.sentences) ? group.sentences.map((sentence, sentenceIndex) => ({
                                text: sentence.text || '', movable: sentence.movable !== undefined ? sentence.movable : true, id: String(sentence.id ?? `${index}-${sentenceIndex}`)
                             })) : [] } : null;
                   }).filter(g => g && g.sentences && g.sentences.length > 0 && g.difficulty);
             }
             setAllGroupsData(allProcessedGroups); // Store for potential filtering across levels if needed

            const filteredForLevel = allProcessedGroups.filter(g => g.difficulty === level && topics.has(g.topic || 'כללי'));
            console.log(`Found ${filteredForLevel.length} groups for level ${level}.`);
            setGroupsForCurrentDifficulty(filteredForLevel); setPlayedInCurrentDifficulty(new Set());
            loadNextUnplayedGroupFromLevel(filteredForLevel, new Set()); // Load the first exercise for this level
        } catch (error) {
            console.error("Error fetching groups data:", error);
            setToast({ show: true, message: 'שגיאה בטעינת התרגילים.', type: 'error' });
            setIsFetchingGroups(false); // Ensure loading stops on error
            handleReturnToSetup();
        }
        // Note: setIsFetchingGroups(false) is called inside loadNextUnplayedGroupFromLevel or on error
    };

    const loadNextUnplayedGroupFromLevel = (groupsInLevel, playedInLevel) => {
        const unplayed = groupsInLevel.filter((group) => !playedInLevel.has(group.originalIndex));
        if (unplayed.length > 0) {
            const randomIndexInUnplayed = Math.floor(Math.random() * unplayed.length); const nextGroup = unplayed[randomIndexInUnplayed];
            const updatedPlayedInLevel = new Set(playedInLevel).add(nextGroup.originalIndex); setPlayedInCurrentDifficulty(updatedPlayedInLevel);
            if (!nextGroup.sentences || nextGroup.sentences.length === 0) {
                console.error("Invalid next group selected (no sentences):", nextGroup);
                setToast({ show: true, message: 'שגיאה בטעינת תרגיל (ריק).', type: 'error' });
                setTimeout(() => loadNextUnplayedGroupFromLevel(groupsInLevel, updatedPlayedInLevel), 100); return; // Try next
            }
            const groupWithOrder = { ...nextGroup, originalOrder: nextGroup.sentences.map(s => s.id) };
            setAttempts(0); setCurrentGroup(shuffleGroup(groupWithOrder)); setSessionExerciseCount(prev => prev + 1);
            setIsFetchingGroups(false); setCheckButtonState("check"); setCheckedResults(undefined); setTimer(0); setLastCheckIncorrect(false);
        } else {
            const nextDifficulty = currentPlayingDifficulty + 1;
            if (nextDifficulty > selectedDifficultyRange.max) {
                console.log("Session complete! No more levels."); setFinished(true); setIsFetchingGroups(false); setCurrentGroup(null);
            } else {
                console.log(`Level ${currentPlayingDifficulty} complete. Moving to level ${nextDifficulty}.`);
                setCurrentPlayingDifficulty(nextDifficulty);
                // Fetch groups for the next level (will set isFetchingGroups=true again)
                loadGroupsForLevel(nextDifficulty, selectedTopics);
            }
        }
    };

    function checkOrder() { /* ... check order logic ... */
        if (isFetchingGroups || !currentGroup || finished || checkButtonState !== 'check') return;
        const currentAttempts = attempts + 1; setAttempts(currentAttempts); setTotalSessionAttempts(prev => prev + 1);
        setCheckButtonState("checking"); setLastCheckIncorrect(false);
        const correctOrder = currentGroup.originalOrder; const currentSentences = currentGroupRef.current.sentences;
        if (!correctOrder || !currentSentences || correctOrder.length !== currentSentences.length) { /* ... error handling ... */
            console.error("Order check mismatch - current data:", currentGroupRef.current, "original:", currentGroup?.originalOrder);
            setToast({show:true, message:'שגיאה בבדיקה', type: 'error'}); setCheckButtonState("check"); return;
        }
        const results = []; const checkDelay = 350; setCheckedResults(new Array(currentSentences.length).fill(null));
        function checkSentenceAtIndex(index) { /* ... sentence checking animation ... */
            if (index >= currentSentences.length) { const allCorrect = results.every(res => res === true); finalizeCheck(allCorrect); return; }
            const sentence = currentSentences[index]; const isCorrect = sentence && sentence.id === correctOrder[index]; results[index] = isCorrect;
            setCheckedResults(prev => { const newResults = [...(prev || new Array(currentSentences.length).fill(null))]; newResults[index] = isCorrect; return newResults; });
            if (navigator.vibrate) navigator.vibrate(isCorrect ? 5 : 10);
            setTimeout(() => { checkSentenceAtIndex(index + 1); }, checkDelay);
         }
        function finalizeCheck(allCorrect) { /* ... finalize logic ... */
            if (allCorrect) { /* ... correct answer logic ... */
                if (navigator.vibrate) navigator.vibrate(15);
                const earnedScore = calculateScore({ timer, attempts: currentAttempts, difficultyRange: selectedDifficultyRange, totalSentences: currentGroup.sentences.length, lockedSentences: currentGroup.sentences.filter(s => !s.movable).length });
                setSessionScore(prev => prev + earnedScore); // Update session score if needed
                // Update CUMULATIVE score atomically
                if(playerId) {
                     const userScoreRef = ref(db, `players/${playerId}/sibaSibaCumulativeScore`);
                     set(userScoreRef, increment(earnedScore))
                         .then(() => console.log(`Cumulative score updated by ${earnedScore}.`))
                         .catch(err => console.error("DB score update failed:", err));
                     // Update local state immediately for responsiveness
                     setCumulativeScore(prev => prev + earnedScore);
                } else {
                     console.warn("Cannot update cumulative score - playerId unknown.");
                     // Update local state anyway for visual feedback during session?
                     setCumulativeScore(prev => prev + earnedScore);
                }
                setTotalSessionTime(prev => prev + timer);
                if (timerInterval.current) { clearInterval(timerInterval.current); timerInterval.current = null; }
                const isLastExerciseOfSelection = sessionExerciseCount === totalGroupsInSelection;
                if (isLastExerciseOfSelection) { /* ... finish session ... */
                    console.log("Session complete! (Last exercise solved)");
                    if (typeof confetti === 'function') { confetti({ particleCount: 50, angle: 60, spread: 55, origin: { x: 0 } }); confetti({ particleCount: 50, angle: 120, spread: 55, origin: { x: 1 } }); }
                    setFinished(true); setCheckButtonState("check");
                 } else { /* ... prepare next level ... */
                    if (typeof confetti === 'function') { confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } }); }
                    setCheckButtonState("ready");
                 }
            } else { /* ... incorrect answer logic ... */
                setCheckButtonState("check"); setLastCheckIncorrect(true); if (navigator.vibrate) navigator.vibrate([10, 5, 10]);
            }
         }
        checkSentenceAtIndex(0);
    }

    function nextLevel() { /* ... load next group ... */
        if (isFetchingGroups || checkButtonState !== 'ready') return;
        setCheckedResults(undefined); setCheckButtonState("check"); setIsFetchingGroups(true); setLastCheckIncorrect(false); setCurrentGroup(null);
        loadNextUnplayedGroupFromLevel(groupsForCurrentDifficulty, playedInCurrentDifficulty);
     }
    function handleReturnToSetup() { /* ... reset state ... */
        console.log("Returning to setup.");
        setGameState('setup'); setCurrentGroup(null); setGroupsForCurrentDifficulty([]); setPlayedInCurrentDifficulty(new Set());
        setCurrentPlayingDifficulty(null); setTotalGroupsInSelection(0); setAttempts(0); setTimer(0); setSessionScore(0);
        setFinished(false); setCheckButtonState('check'); setCheckedResults(undefined); setLastCheckIncorrect(false);
        setSessionExerciseCount(0); setTotalSessionAttempts(0); setTotalSessionTime(0);
        setAllGroupsData(null); setIsFetchingGroups(false);
        if (timerInterval.current) { clearInterval(timerInterval.current); timerInterval.current = null; }
    }
    async function handleShare() { /* ... share logic ... */
        const difficultyText = getDifficultyDisplayString(selectedDifficultyRange);
        const topicsText = getTopicsDisplayString(selectedTopics);
        const timeText = formatTime(totalSessionTime);
        const gameUrl = window.location.origin + window.location.pathname;
        const shareText = `שרשרת סיבות - התוצאה שלי 🏆\n` +
                          `כל הכבוד ${userName}! 🎉\n` +
                          `שיחקתי ברמה: ${difficultyText} בנושא/י: ${topicsText}.\n` +
                          `שיחקתי ${timeText} דקות, פתרתי על כל התרגילים במהלך ${totalSessionAttempts} ניסיונות והשגתי ${formatScore(cumulativeScore)} נקודות מצטבר! 👏\n\n` +
                          `שחקו גם אתם:`;
        if (navigator.share) {
            try { await navigator.share({ title: 'שרשרת סיבות - התוצאה שלי', text: shareText, url: gameUrl }); }
            catch (error) { console.error('Share failed:', error); copyToClipboardFallback(shareText + '\n' + gameUrl); }
        } else { console.log('Navigator.share not supported.'); copyToClipboardFallback(shareText + '\n' + gameUrl); }
     }
    function copyToClipboardFallback(textToCopy) { /* ... copy fallback ... */
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(textToCopy)
                .then(() => setToast({ show: true, message: 'הטקסט הועתק ללוח!', type: 'success' }))
                .catch(err => { console.error('Failed to copy text: ', err); setToast({ show: true, message: 'שגיאה בהעתקה ללוח', type: 'error' }); });
        } else { setToast({ show: true, message: 'העתקה אוטומטית אינה נתמכת', type: 'info' }); }
     }
    const handleUpdateUsername = async (newName) => { /* ... update username logic ... */
        const trimmedName = newName.trim();
        if (!trimmedName || trimmedName.length > 25) {
             setToast({ show: true, message: trimmedName.length > 25 ? 'השם ארוך מדי (עד 25 תווים)' : 'השם אינו יכול להיות ריק', type: 'error' }); return;
        }
        if (trimmedName === userName) return;
        if (currentUser && playerId) {
             const playerNicknameRef = ref(db, `players/${playerId}/nickname`);
             try {
                 await set(playerNicknameRef, trimmedName);
                 try { await updateProfile(currentUser, { displayName: trimmedName }); } catch (e) { console.warn("Could not update profile.", e); }
                 setUserName(trimmedName); setToast({ show: true, message: 'שם המשתמש עודכן!', type: 'success' });
             } catch (error) { console.error("Error updating nickname:", error); setToast({ show: true, message: 'שגיאה בעדכון שם המשתמש', type: 'error' }); }
        } else { console.error("Cannot update username: user/playerId missing."); setToast({ show: true, message: 'שגיאה: לא ניתן לעדכן שם כרגע', type: 'error' }); }
    };

    // --- UI Components ---
    const LoadingIndicator = ({ isActive, message = "טוען..." }) => { /* ... as before ... */
         if (!isActive) return null;
         return createElement('div', { className: 'text-center p-4 text-gray-500 dark:text-gray-400' }, message);
     };
    const ToastComponent = toast.show ? /* ... as before ... */
        createElement('div', { className: `toast fixed top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 p-4 rounded-lg shadow-lg text-white text-base z-50 transition-all duration-300 ease-out ${toast.type === 'success' ? 'bg-green-500' : toast.type === 'info' ? 'bg-blue-500' : 'bg-red-500'} ${toast.show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}` }, toast.message) : null;
    function Footer() { /* ... as before ... */
        const linkClass = 'hover:text-gray-700 dark:hover:text-gray-300 underline mx-1'; const separatorClass = 'opacity-50 mx-1';
        return React.createElement('footer', { className: 'w-full text-center text-xs text-gray-500 dark:text-gray-400 pt-4 pb-2 mt-auto' }, 'פותח על ידי אריאל מ', React.createElement('a', { href: 'https://galilbio.wordpress.com', target: '_blank', rel: 'noopener noreferrer', className: linkClass }, 'הביולוגים של גליל'), ' בעזרת ', React.createElement('a', { href: 'https://grok.com', target: '_blank', rel: 'noopener noreferrer', className: linkClass }, 'Grok'), ', ', React.createElement('a', { href: 'https://chatgpt.com/', target: '_blank', rel: 'noopener noreferrer', className: linkClass }, 'Chat GPT'), ' וגם ', React.createElement('a', { href: 'https://gemini.google.com/', target: '_blank', rel: 'noopener noreferrer', className: linkClass }, 'Gemini'), React.createElement('span', { className: separatorClass }, '|'), React.createElement('a', { href: './admin.html', target: '_blank', rel: 'noopener noreferrer', className: linkClass }, 'ניהול'));
     }
    function GameHeader() { /* ... header with left alignment ... */
        const handleEditUsername = () => { const newName = prompt("הכנס שם משתמש חדש (עד 25 תווים):", userName); if (newName !== null) { handleUpdateUsername(newName); } };
        return createElement('div', {className: 'flex items-center w-full max-w-4xl mx-auto px-4 pt-2'},
            createElement('div', {className: 'text-left w-auto flex flex-col items-start min-w-[80px]'},
                createElement('div', { className: 'flex items-center cursor-pointer group', title:"לחץ לעריכת שם המשתמש", onClick: handleEditUsername },
                    createElement('span', { className: 'mr-1 text-xs text-gray-500 dark:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity' }, '✏️'),
                    createElement('span', { className: 'text-sm font-medium text-gray-700 dark:text-gray-300 truncate' }, userName || 'טוען...')
                ),
                createElement('div', { className: 'text-xs text-gray-500 dark:text-gray-400 mt-0.5', ref: scoreRef }, `ניקוד: ${formatScore(cumulativeScore)}`) ),
            createElement('h1', { className: 'title text-xl sm:text-2xl font-bold text-center text-gray-900 dark:text-gray-100 flex-1 px-2' }, 'שרשרת סיבות ⛓️‍💥‏‏') );
    }
    function ScoreboardComponent({ userName, cumulativeScore, totalAttempts, totalTime, difficultyRange, topics, onPlayAgain, onShare }) { /* ... scoreboard with updated text ... */
        const difficultyText = getDifficultyDisplayString(difficultyRange); const topicsText = getTopicsDisplayString(topics); const timeText = formatTime(totalTime); const formattedCumulativeScore = formatScore(cumulativeScore);
        const buttonBaseClass = "py-2 px-4 rounded-full font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 text-sm sm:text-base";
        const playAgainButtonClass = `${buttonBaseClass} bg-green-500 text-white hover:bg-green-600 focus:ring-green-500`; const shareButtonClass = `${buttonBaseClass} bg-blue-500 text-white hover:bg-blue-600 focus:ring-blue-500`;
        return createElement('div', { className: 'flex flex-col items-center text-center p-4 sm:p-6 w-full' },
            createElement('h2', { className: 'text-2xl sm:text-3xl font-bold mb-3 text-gray-900 dark:text-gray-100' }, 'סיימת את הסבב! 🏆'),
            createElement('p', { className: 'text-lg sm:text-xl mb-4 text-gray-800 dark:text-gray-200' }, `כל הכבוד ${userName}! 🎉`),
            createElement('p', { className: 'mb-4 text-base sm:text-lg text-gray-700 dark:text-gray-300' }, `שיחקת ברמה: ${difficultyText} בנושא/י: ${topicsText}.`),
            createElement('p', { className: 'mb-1 text-base sm:text-lg text-gray-700 dark:text-gray-300' }, `בסבב זה שיחקת ${timeText} דקות וביצעת ${totalAttempts} ${totalAttempts === 1 ? 'ניסיון' : 'ניסיונות'}.`),
            createElement('p', { className: 'mb-6 text-lg sm:text-xl font-semibold text-gray-800 dark:text-gray-200' }, `הניקוד המצטבר שלך: ${formattedCumulativeScore} נקודות! 👏`),
            createElement('div', { className: 'flex flex-row justify-center items-center gap-3 w-full' }, // Buttons in a row
                createElement('button', { className: shareButtonClass, onClick: onShare }, 'שתף תוצאות'),
                createElement('button', { className: playAgainButtonClass, onClick: onPlayAgain }, 'שחק שוב') ) );
    }
    function GameSetup({ initialDifficultyRange, initialTopics, onStartGame }) { /* ... game setup with counts fetching ... */
         const [difficultyKey, setDifficultyKey] = useState(() => { /* ... set initial key ... */
            if (initialDifficultyRange.min === 1 && initialDifficultyRange.max === 2) return 'easy';
            if (initialDifficultyRange.min === 2 && initialDifficultyRange.max === 4) return 'medium';
            if (initialDifficultyRange.min === 4 && initialDifficultyRange.max === 5) return 'hard';
            return 'all';
         });
         const [selectedTopicsInternal, setSelectedTopicsInternal] = useState(new Set(initialTopics));
         const [topicCounts, setTopicCounts] = useState({}); const [countsLoading, setCountsLoading] = useState(false); const [totalAvailableInSelection, setTotalAvailableInSelection] = useState(0);
         const actualAvailableTopics = ['כללי', 'מעבדה', 'התא', 'אקולוגיה', 'גוף האדם'];
         const difficultyOptions = { easy: { label: 'קל', range: { min: 1, max: 2 } }, medium: { label: 'בינוני', range: { min: 2, max: 4 } }, hard: { label: 'קשה', range: { min: 4, max: 5 } }, all: { label: 'הכל', range: { min: 1, max: 5 } } };
         const currentRange = difficultyOptions[difficultyKey].range;

         useEffect(() => { /* Fetch counts when difficulty changes */
             const fetchCounts = async () => {
                 setCountsLoading(true); setTopicCounts({}); setTotalAvailableInSelection(0);
                 console.log(`Workspaceing counts for levels ${currentRange.min} to ${currentRange.max}`);
                 const countsPromises = []; const levelsToFetch = [];
                 for (let level = currentRange.min; level <= currentRange.max; level++) { levelsToFetch.push(level); countsPromises.push(get(ref(db, `stats/groupCountsByLevelTopic/${level}`))); }
                 try {
                     const snapshots = await Promise.all(countsPromises); const combinedCounts = {};
                     snapshots.forEach(snapshot => { const levelCounts = snapshot.val(); if (levelCounts) { for (const topic in levelCounts) { combinedCounts[topic] = (combinedCounts[topic] || 0) + levelCounts[topic]; } } });
                     setTopicCounts(combinedCounts); console.log("Fetched counts:", combinedCounts);
                 } catch (error) { console.error("Error fetching topic counts:", error); setTopicCounts({}); setToast({ show: true, message: 'שגיאה בטעינת מספרי תרגילים', type: 'error' });
                 } finally { setCountsLoading(false); }
             };
             if (db) fetchCounts(); // Fetch only if db is initialized
         }, [difficultyKey]);

          useEffect(() => { /* Calculate total available count */
             let total = 0;
             if (selectedTopicsInternal.size > 0 && Object.keys(topicCounts).length > 0) { selectedTopicsInternal.forEach(topic => { total += topicCounts[topic] || 0; }); }
             setTotalAvailableInSelection(total);
          }, [selectedTopicsInternal, topicCounts]);

         const handleDifficultyChange = (event) => { setDifficultyKey(event.target.value); };
         const handleTopicToggle = (event) => { /* ... toggle topic ... */
             const topic = event.target.value;
             setSelectedTopicsInternal(prevTopics => { const newTopics = new Set(prevTopics); if (event.target.checked) { newTopics.add(topic); } else { newTopics.delete(topic); } return newTopics; });
          };
         const handleSelectAllTopics = (event) => { /* ... select/deselect all ... */
             if (event.target.checked) { setSelectedTopicsInternal(new Set(actualAvailableTopics)); } else { setSelectedTopicsInternal(new Set()); }
          };
         const handleStartClick = () => { /* ... start game validation ... */
             if (selectedTopicsInternal.size === 0) { alert('יש לבחור לפחות נושא אחד'); return; }
             if (totalAvailableInSelection === 0 && !countsLoading) { alert('לא נמצאו תרגילים התואמים לבחירה זו.'); return; } // Check countsLoading too
             onStartGame(currentRange, selectedTopicsInternal, totalAvailableInSelection);
          };
         const renderSelectionButton = ({ type, id, name, value, checked, onChange, labelText, count }) => { /* ... render button with count ... */
            const labelBaseClasses = "flex items-center justify-between w-full p-3 border rounded-lg cursor-pointer transition-all duration-200 shadow-sm text-right";
            const labelSelectedClasses = "bg-blue-100 border-blue-500 ring-2 ring-blue-300 dark:bg-blue-900 dark:border-blue-500 dark:ring-blue-600";
            const labelUnselectedClasses = "bg-white border-gray-300 hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600";
            const inputClasses = `ml-3 h-5 w-5 accent-blue-600 focus:ring-0 focus:ring-offset-0`;
            return createElement('label', { htmlFor: id, className: `${labelBaseClasses} ${checked ? labelSelectedClasses : labelUnselectedClasses}` },
                 createElement('div', { className: 'flex flex-col items-end' },
                      createElement('span', { className: 'text-sm sm:text-base text-gray-900 dark:text-gray-100' }, labelText),
                      (type === 'checkbox' && value !== 'all' && !countsLoading && typeof count === 'number') &&
                      createElement('span', { className: 'text-xs text-gray-500 dark:text-gray-400 mt-1' }, `[${count} ${count === 1 ? 'תרגיל' : 'תרגילים'}]`) // Updated text
                 ), createElement('input', { type: type, id: id, name: name, value: value, checked: checked, onChange: onChange, className: inputClasses }) );
          };

         return createElement( /* ... setup structure ... */
             'div', { className: 'w-full' },
             createElement('h2', { className: 'text-xl sm:text-2xl font-semibold text-center mb-5 text-gray-900 dark:text-gray-100' }, 'הגדרות משחק'),
             createElement('div', { className: 'mb-6' }, /* Difficulty selection */
                 createElement('h3', { className: 'text-base font-medium mb-3 text-gray-800 dark:text-gray-200' }, 'בחר רמת קושי:'),
                 createElement('div', { className: 'grid grid-cols-2 sm:grid-cols-4 gap-3' }, Object.entries(difficultyOptions).map(([key, { label }]) => renderSelectionButton({ type: 'radio', id: `difficulty-${key}`, name: 'difficulty', value: key, checked: difficultyKey === key, onChange: handleDifficultyChange, labelText: label }) ) ) ),
             createElement('div', { className: 'mb-6 relative' }, /* Topic selection */
                 createElement('h3', { className: 'text-base font-medium mb-3 text-gray-800 dark:text-gray-200' }, 'בחר נושאים (אחד או יותר):'),
                 countsLoading && createElement('div', {className: 'absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-gray-800/50 z-10 rounded-lg'}, createElement('span',{className: 'text-gray-600 dark:text-gray-300'}, 'טוען ספירות...') ),
                 createElement('div', { className: `grid grid-cols-2 sm:grid-cols-3 gap-3 ${countsLoading ? 'opacity-50 pointer-events-none' : ''}` }, // Disable interaction while loading
                      renderSelectionButton({ type: 'checkbox', id: 'topic-all', name: 'topic-all', value: 'all', checked: selectedTopicsInternal.size === actualAvailableTopics.length && actualAvailableTopics.length > 0, onChange: handleSelectAllTopics, labelText: 'הכל', count: null }),
                      actualAvailableTopics.map(topic => renderSelectionButton({ type: 'checkbox', id: `topic-${topic.replace(/\s+/g, '-')}`, name: `topic-${topic.replace(/\s+/g, '-')}`, value: topic, checked: selectedTopicsInternal.has(topic), onChange: handleTopicToggle, labelText: topic, count: topicCounts[topic] }) ) ) ),
             createElement('button', { /* Start game button */
                  className: `w-full py-2.5 px-5 text-base rounded-full font-semibold transition-opacity duration-300 flex items-center justify-center ${selectedTopicsInternal.size === 0 || totalAvailableInSelection === 0 || countsLoading ? 'bg-gray-400 text-gray-700 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400' : 'bg-green-500 text-white hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:focus:ring-offset-gray-800`,
                  onClick: handleStartClick, disabled: selectedTopicsInternal.size === 0 || totalAvailableInSelection === 0 || countsLoading },
                  createElement('span', null, 'התחל משחק'),
                  selectedTopicsInternal.size > 0 && !countsLoading &&
                  createElement('span', { className: 'text-xs font-normal opacity-80 mr-2' }, `[${totalAvailableInSelection} ${totalAvailableInSelection === 1 ? 'תרגול' : 'תרגולים'}]`) ) );
    } // --- End GameSetup ---

    // --- Main Return of App Component ---
    return createElement(
        'div', { className: 'container flex flex-col items-center justify-start pt-2 pb-1 gap-0 px-4 sm:px-8 relative flex-grow min-h-full' }, // Removed gap, reduced pb

        createElement(GameHeader, { currentUsername: userName, onEditUsername: handleUpdateUsername }),

        // Main Content Area - Removed margin (my-4)
        createElement('div', { className: 'w-full max-w-lg mx-auto p-4 sm:p-6 bg-white dark:bg-gray-800 shadow-md rounded-lg flex flex-col items-center' },
            // Conditional Rendering based on game state
            isLoading ? createElement(LoadingIndicator, { isActive: true, message: "טוען נתוני משתמש..."}) : // Show during initial auth/player load
            gameState === 'setup' ? createElement(GameSetup, { initialDifficultyRange: selectedDifficultyRange, initialTopics: selectedTopics, onStartGame: handleStartGame }) :
            gameState === 'playing' && finished ? createElement(ScoreboardComponent, { userName: userName, cumulativeScore: cumulativeScore, totalAttempts: totalSessionAttempts, totalTime: totalSessionTime, difficultyRange: selectedDifficultyRange, topics: selectedTopics, onPlayAgain: handleReturnToSetup, onShare: handleShare }) :
            gameState === 'playing' && !finished ? createElement(React.Fragment, null, /* Game Area Elements */
                 createElement('h2', { className: 'text-lg sm:text-xl font-semibold text-center mb-1 text-gray-800 dark:text-gray-200' }, currentGroup ? `נושא: ${currentGroup.topic || 'כללי'}` : (isFetchingGroups ? 'טוען תרגילים...' : '') ),
                 createElement('div', { className: 'flex justify-center items-center space-x-3 space-x-reverse text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2 w-full' }, currentGroup ? [ /* Stats display */ createElement('span', { key: 'count' }, `תרגול: ${sessionExerciseCount}/${totalGroupsInSelection}`), createElement('span', { key: 'sep1', className: 'opacity-50'}, '|'), createElement('span', { key: 'attempts' }, `ניסיונות: ${attempts}`), createElement('span', { key: 'sep2', className: 'opacity-50'}, '|'), createElement('span', { key: 'timer' }, `זמן: ${formatTime(timer)}`) ] : !isFetchingGroups ? createElement('span', {key: 'error'}, '') : null ), // Hide stats if no group or fetching
                 createElement('p', { className: 'text-center text-sm text-gray-500 dark:text-gray-400 mb-3' }, currentGroup ? 'סדר/י את המשפטים הבאים לפי שרשרת של סיבות ותוצאה' : '' ),
                 createElement( 'div', { id: 'sortable-container', ref: containerRef, className: `flex flex-col items-center w-full min-h-[200px]` }, // Sortable area or loading
                      isFetchingGroups ? createElement(LoadingIndicator, { isActive: true, message: "טוען תרגילים..."}) :
                      currentGroup ? currentGroup.sentences.map((s, index) => renderSentence(s, index)) :
                      createElement(LoadingIndicator, { isActive: true, message: "מכין תרגיל..."}) ),
                 actionButton ) :
            createElement(LoadingIndicator, { isActive: true, message: "טוען אפליקציה..."}) // Fallback loading
        ), // End Main Content Area div

        createElement(Footer, null), // Footer
        ToastComponent // Toast Messages
    ); // End App main div
} // End of App Component

// Render the App to the DOM
ReactDOM.createRoot(document.getElementById('root')).render(createElement(App));
