// public/app.js - Final Version with All Discussed Changes

const { createElement, useState, useEffect, useRef } = React;

// --- Firebase Setup ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInAnonymously, updateProfile } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
// Updated imports for database operations
import { getDatabase, ref, onValue, get, set, increment, query, orderByChild, equalTo } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";

// Firebase config (Replace with your actual config)
const firebaseConfig = {
    apiKey: "AIzaSyAGFC_TB8iEMvS2PyxeASj1HH4i66AW4UA",
    authDomain: "trivbio.firebaseapp.com",
    databaseURL: "https://trivbio-default-rtdb.firebaseio.com",
    projectId: "trivbio",
    storageBucket: "trivbio.appspot.com",
    messagingSenderId: "1097087574583",
    appId: "1:1097087574583:web:b36c0441537a1f596215b2",
    measurementId: "G-ZY245YB23E"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const groupsRef = ref(db, 'collections/groups'); // Ref to all groups (used for loading specific game)
const statsRef = ref(db, 'stats/groupCountsByLevelTopic'); // Ref for pre-calculated counts
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
    // Game structure related
    const [allGroupsData, setAllGroupsData] = useState(null); // Holds raw data fetched ON DEMAND
    const [currentGroup, setCurrentGroup] = useState(null); // Current exercise object
    const [groupsForCurrentDifficulty, setGroupsForCurrentDifficulty] = useState([]); // Groups filtered for the current level being played
    const [playedInCurrentDifficulty, setPlayedInCurrentDifficulty] = useState(new Set()); // Indices played in current level
    const [currentPlayingDifficulty, setCurrentPlayingDifficulty] = useState(null); // Current difficulty level being played

    // Session state
    const [attempts, setAttempts] = useState(0);
    const [startTime, setStartTime] = useState(Date.now());
    const [timer, setTimer] = useState(0);
    const [finished, setFinished] = useState(false); // Is the entire selected *session* finished?
    const [checkButtonState, setCheckButtonState] = useState("check"); // 'check', 'checking', 'ready', 'loading-groups'
    const [checkedResults, setCheckedResults] = useState(undefined);
    const [lastCheckIncorrect, setLastCheckIncorrect] = useState(false);
    const [sessionExerciseCount, setSessionExerciseCount] = useState(0);
    const [totalSessionAttempts, setTotalSessionAttempts] = useState(0);
    const [totalSessionTime, setTotalSessionTime] = useState(0);
    const [sessionScore, setSessionScore] = useState(0); // Score for the current session

    // Persistent player state
    const [currentUser, setCurrentUser] = useState(null);
    const [userName, setUserName] = useState(''); // Player's nickname
    const [playerId, setPlayerId] = useState(null);
    const [cumulativeScore, setCumulativeScore] = useState(0); // Holds sibaSibaCumulativeScore

    // UI / General state
    const [isLoading, setIsLoading] = useState(true); // General loading (auth, initial player data)
    const [isFetchingGroups, setIsFetchingGroups] = useState(false); // Specific loading for game groups
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const [gameState, setGameState] = useState('setup'); // 'setup', 'playing'

    // Setup screen state
    const [selectedDifficultyRange, setSelectedDifficultyRange] = useState({ min: 1, max: 2 });
    const [selectedTopics, setSelectedTopics] = useState(new Set(['מעבדה']));
    const [totalGroupsInSelection, setTotalGroupsInSelection] = useState(0); // Calculated from fetched counts

    // --- Refs ---
    const containerRef = useRef(null);
    const currentGroupRef = useRef(currentGroup);
    let timerInterval = useRef(null);
    const scoreRef = useRef(null);
    const isFirstRender = useRef(true);
    // const initialGroupLoadDone = useRef(false); // No longer needed, groups load on demand

    // --- useEffect Hooks ---
    useEffect(() => { currentGroupRef.current = currentGroup; }, [currentGroup]);

    // *** Main useEffect for Auth, Player Data Loading ***
    useEffect(() => {
        console.log("Setting up auth listener...");
        setIsLoading(true); // Start loading indicator for auth/player data

        const authUnsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                console.log("Auth state changed: User logged in", user.uid, user.isAnonymous);
                const uid = user.uid;
                setCurrentUser(user);
                setPlayerId(uid);

                // Fetch Nickname and Cumulative Score simultaneously
                const playerRef = ref(db, `players/${uid}`);
                try {
                    const playerSnapshot = await get(playerRef);
                    const playerData = playerSnapshot.val() || {};

                    // --- Nickname Logic ---
                    let finalUsername = playerData.nickname; // Try DB first
                    if (!finalUsername) {
                        finalUsername = user.displayName || user.email; // Try profile
                        if (!finalUsername) {
                            finalUsername = generateRandomUsername(); // Generate if needed
                            console.log("Generated new username:", finalUsername);
                            // Save generated name to DB and try updating profile
                             await set(ref(db, `players/${uid}/nickname`), finalUsername);
                            console.log("Saved generated username to DB.");
                            try { await updateProfile(user, { displayName: finalUsername }); }
                            catch (profileError) { console.warn("Could not update profile display name.", profileError); }
                        } else {
                            console.log("Using profile name/email:", finalUsername);
                             await set(ref(db, `players/${uid}/nickname`), finalUsername); // Ensure it's saved to DB
                        }
                    } else {
                        console.log("Using nickname from DB:", finalUsername);
                    }
                    setUserName(finalUsername || 'שחקן');

                    // --- Cumulative Score Logic ---
                    const currentCumulativeScore = playerData.sibaSibaCumulativeScore || 0;
                    setCumulativeScore(currentCumulativeScore);
                    console.log("Loaded cumulative score:", currentCumulativeScore);
                    // Initialize session score to 0
                    setSessionScore(0);

                    // If player data didn't exist or score field missing, save defaults
                    if (!playerSnapshot.exists() || typeof playerData.sibaSibaCumulativeScore === 'undefined') {
                         console.log("Saving initial player data (or missing score field)...");
                         const updates = {};
                         if (!playerData.nickname) updates.nickname = finalUsername;
                         if (typeof playerData.sibaSibaCumulativeScore === 'undefined') updates.sibaSibaCumulativeScore = 0;
                         // Add other initial fields if needed (e.g., createdAt, initial skips/5050 if game has them)
                         if (Object.keys(updates).length > 0) {
                              await set(playerRef, { ...playerData, ...updates }); // Merge existing with new defaults
                         }
                    }

                } catch (error) {
                    console.error("Error fetching/setting player data:", error);
                    setUserName(user.displayName || user.email || 'שחקן'); // Simple fallback
                    setCumulativeScore(0); // Fallback score
                    setSessionScore(0);
                    setToast({ show: true, message: 'שגיאה בטעינת נתוני שחקן.', type: 'error' });
                }

                setIsLoading(false); // Stop initial loading indicator
                setGameState('setup'); // Ensure user starts at setup after login/load

            } else {
                // --- User logged out ---
                console.log("Auth state changed: User logged out.");
                setCurrentUser(null); setPlayerId(null); setUserName('');
                setCumulativeScore(0); setSessionScore(0);
                setAllGroupsData(null); setCurrentGroup(null);
                setFinished(false); setGameState('setup');
                setIsLoading(true); // Show loading while attempting anonymous sign-in
                signInAnonymously(auth).catch(error => {
                    console.error("Anon sign-in failed:", error);
                    setIsLoading(false); // Stop loading if sign-in fails
                    setToast({ show: true, message: 'שגיאה בהתחברות אנונימית.', type: 'error' });
                });
                // --- End user logged out ---
            }
        });

        // Cleanup
        return () => {
            console.log("Cleaning up auth listener...");
            authUnsubscribe();
        };
    }, []); // Run only once

    useEffect(() => { /* Timer */
        if (gameState === 'playing' && currentGroup && !isFetchingGroups && !finished) {
             // Start timer only if not finished and groups are loaded
            const newStartTime = Date.now(); setStartTime(newStartTime); setTimer(0);
            if (timerInterval.current) { clearInterval(timerInterval.current); }
            timerInterval.current = setInterval(() => { setTimer(prevTimer => prevTimer + 1); }, 1000);
        } else {
            // Clear timer if game state is not 'playing', or groups are fetching, or session finished
            if (timerInterval.current) { clearInterval(timerInterval.current); timerInterval.current = null; }
        }
        // Clean up timer on unmount or when dependencies change
        return () => { if (timerInterval.current) { clearInterval(timerInterval.current); timerInterval.current = null; } };
    }, [gameState, finished, isFetchingGroups, currentGroup?.originalIndex]); // Added isFetchingGroups dependency


    useEffect(() => { /* Score Pulse */
        if (isFirstRender.current) { isFirstRender.current = false; return; }
         if (scoreRef.current) {
            scoreRef.current.classList.remove('pulse');
            void scoreRef.current.offsetWidth;
            scoreRef.current.classList.add('pulse');
            const timeoutId = setTimeout(() => { if (scoreRef.current) scoreRef.current.classList.remove('pulse'); }, 800);
            return () => clearTimeout(timeoutId);
        }
    }, [cumulativeScore]); // Pulse when cumulative score changes

    useEffect(() => { /* SortableJS */
        let sortableInstance = null;
        // Initialize Sortable only when playing, not fetching, not finished, and group exists
        if (gameState === 'playing' && !isFetchingGroups && !finished && currentGroup && containerRef.current) {
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
        // Cleanup function
        return () => { if (sortableInstance) sortableInstance.destroy(); };
    }, [gameState, finished, isFetchingGroups, currentGroup]); // Added isFetchingGroups dependency

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
        return `${String(minutes).padStart(1, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    function formatScore(scoreValue) {
        if (typeof scoreValue !== 'number') return '0';
        return scoreValue.toLocaleString('en-US');
    }

    function calculateScore({ timer, attempts, difficultyRange, totalSentences, lockedSentences }) {
        // This calculates score for ONE exercise
        const difficultyValue = difficultyRange.max || 1; const baseScore = 100; const difficultyBonus = difficultyValue * 20;
        const lengthBonus = totalSentences * 15; const lockedPenalty = lockedSentences * 10; const timePenalty = timer * 2;
        const attemptsPenalty = Math.max(0, (attempts - 1) * 15);
        let currentScore = baseScore + difficultyBonus + lengthBonus - lockedPenalty - timePenalty - attemptsPenalty;
        return Math.max(0, Math.floor(currentScore));
    }

     function getDifficultyDisplayString(range) {
        if (!range) return "לא ידוע";
        if (range.min === 1 && range.max === 2) return "קל 🍼 (⭐ ו-⭐⭐)";
        if (range.min === 2 && range.max === 4) return "בינוני 💪 (⭐⭐⭐ ו-⭐⭐⭐⭐)";
        if (range.min === 4 && range.max === 5) return "קשה 🤪 (⭐⭐⭐⭐⭐)";
        if (range.min === 1 && range.max === 5) return "הכל 👑 (⭐ עד ⭐⭐⭐⭐⭐)";
        return `מותאם אישית (${range.min}-${range.max})`;
     }

     function getTopicsDisplayString(topicsSet) {
         const topicEmojiMap = {
             'כללי': '⏳', 'מעבדה': '🧪', 'התא': '🦠', 'גוף האדם': '🫀', 'אקולוגיה': '🌍'
         };
         const topicsArray = Array.from(topicsSet);
         if (topicsArray.length === 0) return 'לא נבחרו נושאים';
         return topicsArray.map(topic => `${topic} ${topicEmojiMap[topic] || ''}`).join(' / ');
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
        // Ensure IDs are unique strings in the shuffled result
        const finalSentences = result.map((s, index) => ({ ...s, id: String(s.id ?? `${group.originalIndex}-shuffled-${index}`) }));
        return { ...group, sentences: finalSentences };
    }

    // --- Game Flow Functions ---

    // Called from GameSetup when "Start Game" is clicked
    const handleStartGame = (difficultyRange, topics, totalCount) => {
        setSelectedDifficultyRange(difficultyRange);
        setSelectedTopics(topics);
        setTotalGroupsInSelection(totalCount); // Total count based on pre-fetched stats
        setCurrentPlayingDifficulty(difficultyRange.min); // Start with the min level of the range
        setPlayedInCurrentDifficulty(new Set()); // Reset played set for the new session

        // Reset Session Stats
        setSessionExerciseCount(0);
        setSessionScore(0); // Reset session score display if needed (cumulative is kept)
        setTotalSessionAttempts(0);
        setTotalSessionTime(0);

        setGameState('playing'); // Switch to playing view
        setIsLoading(false); // Ensure general loading is off
        setIsFetchingGroups(true); // Indicate that we are now fetching groups
        setLastCheckIncorrect(false);
        setFinished(false); // Ensure session is not marked as finished

        // Start fetching the actual group data for the first level
        loadGroupsForLevel(difficultyRange.min, topics);
    };

    // Fetches and filters groups for a specific level and topics
    const loadGroupsForLevel = async (level, topics) => {
        console.log(`Loading groups for level ${level}, topics:`, topics);
        setIsFetchingGroups(true); // Show loading state
        setCurrentGroup(null); // Clear previous group while loading

        try {
            // Fetch ALL groups data from the collection IF not already fetched
            // In a real large-scale app, you might query Firebase directly
            // but here we fetch all and filter client-side ONCE per session start potentially.
            // OR fetch every time loadGroupsForLevel is called if memory is a concern.
            // Let's fetch every time for simplicity now.
            const snapshot = await get(groupsRef);
            const groupsData = snapshot.val() || [];
             let allProcessedGroups = [];
             if (Array.isArray(groupsData)) {
                 allProcessedGroups = groupsData
                     .map((group, groupIndex) => ({ /* ... process raw group ... */
                         ...group,
                         originalIndex: groupIndex,
                         topic: group.topic || 'כללי',
                         sentences: Array.isArray(group.sentences) ? group.sentences.map((sentence, sentenceIndex) => ({
                             text: sentence.text || '',
                             movable: sentence.movable !== undefined ? sentence.movable : true,
                             id: String(sentence.id ?? `${groupIndex}-${sentenceIndex}`)
                         })) : []
                     }))
                     .filter(g => g.sentences && g.sentences.length > 0 && g.difficulty); // Basic validation
             } else {
                  console.warn("Groups data is not an array, attempting object processing...");
                   allProcessedGroups = Object.entries(groupsData).map(([key, group]) => {
                        const index = parseInt(key, 10);
                        return (group && !isNaN(index)) ? {
                            ...group,
                             originalIndex: index,
                             topic: group.topic || 'כללי',
                             sentences: Array.isArray(group.sentences) ? group.sentences.map((sentence, sentenceIndex) => ({
                                text: sentence.text || '',
                                movable: sentence.movable !== undefined ? sentence.movable : true,
                                id: String(sentence.id ?? `${index}-${sentenceIndex}`)
                            })) : []
                         } : null;
                   }).filter(g => g && g.sentences && g.sentences.length > 0 && g.difficulty);
             }

             setAllGroupsData(allProcessedGroups); // Store potentially for reuse if needed, or just use locally

            // Filter for the specific level and topics
            const filteredForLevel = allProcessedGroups.filter(g =>
                g.difficulty === level && topics.has(g.topic || 'כללי')
            );

            console.log(`Found ${filteredForLevel.length} groups for level ${level} and selected topics.`);
            setGroupsForCurrentDifficulty(filteredForLevel);
            setPlayedInCurrentDifficulty(new Set()); // Reset played set for this specific level

            loadNextUnplayedGroupFromLevel(filteredForLevel, new Set()); // Load the first exercise

        } catch (error) {
            console.error("Error fetching groups data:", error);
            setToast({ show: true, message: 'שגיאה בטעינת התרגילים.', type: 'error' });
            handleReturnToSetup(); // Go back to setup on error
        } finally {
           // setIsLoading(false); // General loading handled elsewhere
           // setIsFetchingGroups(false); // Handled in loadNextUnplayedGroupFromLevel or if error occurs immediately
        }
    };

    // Selects the next exercise from the current level's filtered list
    const loadNextUnplayedGroupFromLevel = (groupsInLevel, playedInLevel) => {
        const unplayed = groupsInLevel.filter((group) => !playedInLevel.has(group.originalIndex));

        if (unplayed.length > 0) {
            const randomIndexInUnplayed = Math.floor(Math.random() * unplayed.length);
            const nextGroup = unplayed[randomIndexInUnplayed];
            const updatedPlayedInLevel = new Set(playedInLevel).add(nextGroup.originalIndex);
            setPlayedInCurrentDifficulty(updatedPlayedInLevel); // Update the set of played indices for this level

            if (!nextGroup.sentences || nextGroup.sentences.length === 0) {
                 console.error("Invalid next group selected (no sentences):", nextGroup);
                 setToast({ show: true, message: 'שגיאה בטעינת תרגיל (ריק).', type: 'error' });
                 // Try loading another one from the same level if possible
                 setTimeout(() => loadNextUnplayedGroupFromLevel(groupsInLevel, updatedPlayedInLevel), 100);
                 return;
            }

            // Prepare the group for display
            const groupWithOrder = { ...nextGroup, originalOrder: nextGroup.sentences.map(s => s.id) };
            setAttempts(0); // Reset attempts for the new exercise
            setCurrentGroup(shuffleGroup(groupWithOrder));
            setSessionExerciseCount(prev => prev + 1); // Increment exercise counter for the session
            setIsFetchingGroups(false); // Finished fetching/preparing this group
            setCheckButtonState("check");
            setCheckedResults(undefined);
            setTimer(0); // Reset timer for the new exercise
            setLastCheckIncorrect(false);
        } else {
            // No more unplayed groups in the current level
            const nextDifficulty = currentPlayingDifficulty + 1;
            if (nextDifficulty > selectedDifficultyRange.max) {
                // Finished all levels in the selected range
                console.log("Session complete! No more levels.");
                setFinished(true); // Mark session as finished
                setIsFetchingGroups(false); // Stop loading indicator
                setCurrentGroup(null); // Clear the last group
            } else {
                // Move to the next difficulty level
                console.log(`Level ${currentPlayingDifficulty} complete. Moving to level ${nextDifficulty}.`);
                setCurrentPlayingDifficulty(nextDifficulty);
                // Fetch groups for the next level (will set isFetchingGroups=true again)
                loadGroupsForLevel(nextDifficulty, selectedTopics);
            }
        }
    };

    // Checks the order of sentences for the current group
    function checkOrder() {
        if (isFetchingGroups || !currentGroup || finished || checkButtonState !== 'check') return;

        const currentAttempts = attempts + 1; // Calculate next attempt number
        setAttempts(currentAttempts); // Update attempts state
        setTotalSessionAttempts(prev => prev + 1); // Update total session attempts
        setCheckButtonState("checking");
        setLastCheckIncorrect(false);

        const correctOrder = currentGroup.originalOrder;
        const currentSentences = currentGroupRef.current.sentences;

        if (!correctOrder || !currentSentences || correctOrder.length !== currentSentences.length) {
            console.error("Order check mismatch - current data:", currentGroupRef.current, "original:", currentGroup?.originalOrder);
            setToast({show:true, message:'שגיאה בבדיקה', type: 'error'});
            setCheckButtonState("check"); // Reset button state
            return;
        }

        const results = [];
        const checkDelay = 350;
        setCheckedResults(new Array(currentSentences.length).fill(null)); // Initialize results array visually

        // Animate checking sentence by sentence
        function checkSentenceAtIndex(index) {
            if (index >= currentSentences.length) {
                // All sentences checked, finalize
                const allCorrect = results.every(res => res === true);
                finalizeCheck(allCorrect);
                return;
            }

            const sentence = currentSentences[index];
            const isCorrect = sentence && sentence.id === correctOrder[index];
            results[index] = isCorrect;

            // Update visual feedback for the current sentence
            setCheckedResults(prev => {
                const newResults = [...(prev || new Array(currentSentences.length).fill(null))];
                newResults[index] = isCorrect;
                return newResults;
            });

            if (navigator.vibrate) navigator.vibrate(isCorrect ? 5 : 10);

            // Move to the next sentence after a delay
            setTimeout(() => { checkSentenceAtIndex(index + 1); }, checkDelay);
        }

        // Called after all sentences have been checked
        function finalizeCheck(allCorrect) {
            if (allCorrect) {
                if (navigator.vibrate) navigator.vibrate(15);

                // Calculate score for THIS exercise
                const earnedScore = calculateScore({
                    timer, attempts: currentAttempts, // Use the updated attempts count
                    difficultyRange: selectedDifficultyRange,
                    totalSentences: currentGroup.sentences.length,
                    lockedSentences: currentGroup.sentences.filter(s => !s.movable).length
                });

                // Update session score (optional, if you want to track session score separately)
                setSessionScore(prev => prev + earnedScore);

                // Update CUMULATIVE score in state and Firebase
                setCumulativeScore(prev => prev + earnedScore);
                const userScoreRef = ref(db, `players/${playerId}/sibaSibaCumulativeScore`);
                 // Use increment for atomic update
                 set(userScoreRef, increment(earnedScore))
                     .then(() => console.log(`Cumulative score updated in DB by ${earnedScore}.`))
                     .catch(err => console.error("Failed to update cumulative score in DB:", err));

                // Update total session time
                setTotalSessionTime(prev => prev + timer);

                if (timerInterval.current) { clearInterval(timerInterval.current); timerInterval.current = null; } // Stop timer

                // Check if this was the last exercise in the whole selection
                const isLastExerciseOfSelection = sessionExerciseCount === totalGroupsInSelection;

                if (isLastExerciseOfSelection) {
                    console.log("Session complete! (Last exercise solved)");
                    if (typeof confetti === 'function') { /* ... confetti ... */ }
                    setFinished(true); // Mark session finished
                    setCheckButtonState("check"); // Or hide button
                } else {
                    // Not the last exercise overall, prepare for next
                     if (typeof confetti === 'function') { /* ... confetti ... */ }
                    setCheckButtonState("ready"); // Show "Next Challenge" button
                }
            } else {
                // Order was incorrect
                setCheckButtonState("check"); // Allow user to try again
                setLastCheckIncorrect(true);
                if (navigator.vibrate) navigator.vibrate([10, 5, 10]);
            }
        }

        // Start the checking process
        checkSentenceAtIndex(0);
    }

    // Called when "Next Challenge" button is clicked
    function nextLevel() {
        if (isFetchingGroups || checkButtonState !== 'ready') return; // Prevent action while loading or not ready

        setCheckedResults(undefined);
        setCheckButtonState("check"); // Reset button for the next exercise
        setIsFetchingGroups(true); // Show loading while preparing next group
        setLastCheckIncorrect(false);
        setCurrentGroup(null); // Clear current group immediately

        // Load the next exercise from the current difficulty level
        loadNextUnplayedGroupFromLevel(groupsForCurrentDifficulty, playedInCurrentDifficulty);
    }

    // Returns to the setup screen
    function handleReturnToSetup() {
        console.log("Returning to setup.");
        setGameState('setup'); setCurrentGroup(null); setGroupsForCurrentDifficulty([]); setPlayedInCurrentDifficulty(new Set());
        setCurrentPlayingDifficulty(null); setTotalGroupsInSelection(0); setAttempts(0); setTimer(0); setSessionScore(0);
        setFinished(false); setCheckButtonState('check'); setCheckedResults(undefined); setLastCheckIncorrect(false);
        setSessionExerciseCount(0); setTotalSessionAttempts(0); setTotalSessionTime(0);
        setAllGroupsData(null); // Clear fetched group data
        setIsFetchingGroups(false); // Ensure loading indicator is off
        if (timerInterval.current) { clearInterval(timerInterval.current); timerInterval.current = null; }
    }

    // --- Share Functionality ---
    async function handleShare() {
        const difficultyText = getDifficultyDisplayString(selectedDifficultyRange);
        const topicsText = getTopicsDisplayString(selectedTopics);
        const timeText = formatTime(totalSessionTime);
        const gameUrl = window.location.origin + window.location.pathname;

        const shareText = `שרשרת סיבות - התוצאה שלי 🏆\n` +
                          `כל הכבוד ${userName}! 🎉\n` +
                          `שיחקתי ברמה: ${difficultyText} בנושא/י: ${topicsText}.\n` +
                          `שיחקתי ${timeText} דקות, פתרתי על כל התרגילים במהלך ${totalSessionAttempts} ניסיונות והשגתי ${formatScore(cumulativeScore)} נקודות מצטבר! 👏\n\n` + // Use cumulative score here
                          `שחקו גם אתם:`;

        if (navigator.share) {
            try { await navigator.share({ title: 'שרשרת סיבות - התוצאה שלי', text: shareText, url: gameUrl }); }
            catch (error) { console.error('Share failed:', error); copyToClipboardFallback(shareText + '\n' + gameUrl); }
        } else { console.log('Navigator.share not supported, using fallback.'); copyToClipboardFallback(shareText + '\n' + gameUrl); }
    }

    function copyToClipboardFallback(textToCopy) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(textToCopy)
                .then(() => setToast({ show: true, message: 'הטקסט הועתק ללוח!', type: 'success' }))
                .catch(err => { console.error('Failed to copy text: ', err); setToast({ show: true, message: 'שגיאה בהעתקה ללוח', type: 'error' }); });
        } else { setToast({ show: true, message: 'העתקה אוטומטית אינה נתמכת', type: 'info' }); }
    }
    // --- End Share Functionality ---


    // --- Scoreboard Component ---
    function ScoreboardComponent({ userName, cumulativeScore, totalAttempts, totalTime, difficultyRange, topics, onPlayAgain, onShare }) {
        const difficultyText = getDifficultyDisplayString(difficultyRange);
        const topicsText = getTopicsDisplayString(topics);
        const timeText = formatTime(totalTime);
        const formattedCumulativeScore = formatScore(cumulativeScore); // Format the final cumulative score

        const buttonBaseClass = "py-2 px-4 rounded-full font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 text-sm sm:text-base";
        const playAgainButtonClass = `${buttonBaseClass} bg-green-500 text-white hover:bg-green-600 focus:ring-green-500`;
        const shareButtonClass = `${buttonBaseClass} bg-blue-500 text-white hover:bg-blue-600 focus:ring-blue-500`;

        return createElement('div', { className: 'flex flex-col items-center text-center p-4 sm:p-6 w-full' },
            createElement('h2', { className: 'text-2xl sm:text-3xl font-bold mb-3 text-gray-900 dark:text-gray-100' }, 'סיימת את הסבב! 🏆'),
            createElement('p', { className: 'text-lg sm:text-xl mb-4 text-gray-800 dark:text-gray-200' },
                 `כל הכבוד ${userName}! 🎉`
            ),
            createElement('p', { className: 'mb-4 text-base sm:text-lg text-gray-700 dark:text-gray-300' },
                `שיחקת ברמה: ${difficultyText} בנושא/י: ${topicsText}.`
            ),
             // Display SESSION stats here
             createElement('p', { className: 'mb-1 text-base sm:text-lg text-gray-700 dark:text-gray-300' },
                 `בסבב זה שיחקת ${timeText} דקות וביצעת ${totalAttempts} ${totalAttempts === 1 ? 'ניסיון' : 'ניסיונות'}.`
             ),
             // Display CUMULATIVE score clearly
            createElement('p', { className: 'mb-6 text-lg sm:text-xl font-semibold text-gray-800 dark:text-gray-200' },
                 `הניקוד המצטבר שלך: ${formattedCumulativeScore} נקודות! 👏`
             ),
            createElement('div', { className: 'flex flex-row justify-center items-center gap-3 w-full' }, // Buttons in a row
                createElement('button', { className: shareButtonClass, onClick: onShare }, 'שתף תוצאות'),
                createElement('button', { className: playAgainButtonClass, onClick: onPlayAgain }, 'שחק שוב')
            )
        );
    }
    // --- End Scoreboard Component ---


    // --- Sentence Rendering ---
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

    // --- Action Button Logic ---
    const getButtonClasses = () => {
        let base = 'mt-4 py-1.5 px-5 text-base rounded-full font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 min-w-[100px] text-center'; // Added min-width and text-center
        let stateClasses = '';
        if (checkButtonState === "ready") { stateClasses = 'bg-yellow-400 text-black hover:bg-yellow-500 focus:ring-yellow-400'; }
        else if (checkButtonState === "checking") { stateClasses = 'bg-gray-500 text-white opacity-75 cursor-wait'; }
        else if (checkButtonState === "loading-groups") { stateClasses = 'bg-gray-500 text-white opacity-75 cursor-wait'; } // Style for loading state
        else { // 'check' state
             if(lastCheckIncorrect) { stateClasses = 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500'; }
             else { stateClasses = 'bg-green-500 text-white hover:bg-green-600 focus:ring-green-500'; }
        }
        // Disable button if general loading, fetching groups, or no current group when needed
        if (isLoading || isFetchingGroups || (checkButtonState === 'check' && !currentGroup)) {
             stateClasses = 'bg-gray-400 text-gray-700 opacity-50 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400';
        }
        return `${base} ${stateClasses}`;
    };

    let buttonText = '';
    let buttonOnClick = () => {};
    // Disable button logic updated to include isFetchingGroups
    let buttonDisabled = isLoading || isFetchingGroups;

    if (gameState === 'playing' && !finished) {
        if (checkButtonState === "ready") {
            buttonText = "האתגר הבא"; buttonOnClick = nextLevel; buttonDisabled = isFetchingGroups; // Disable if fetching next
        } else if (checkButtonState === "checking") {
            buttonText = "בודק..."; buttonOnClick = () => {}; buttonDisabled = true;
        } else if (checkButtonState === "loading-groups") {
             buttonText = "טוען..."; buttonOnClick = () => {}; buttonDisabled = true; // Loading state
        } else { // 'check' state
            if (lastCheckIncorrect) { buttonText = "נסה שוב!"; } else { buttonText = "בדיקה"; }
            buttonOnClick = checkOrder; buttonDisabled = isFetchingGroups || !currentGroup; // Also disable if fetching or no group
        }
    }

    const actionButton = (gameState === 'playing' && !finished) ?
        createElement('button', { className: `${getButtonClasses()} self-center`, onClick: buttonOnClick, disabled: buttonDisabled }, buttonText )
        : null;
    // --- End Action Button Logic ---

    // --- Loading Indicator ---
     const LoadingIndicator = ({ isActive, message = "טוען..." }) => {
         if (!isActive) return null;
         return createElement('div', { className: 'text-center p-4 text-gray-500 dark:text-gray-400' },
             message // Simple text indicator
             // Optional: Add a spinner SVG or animation here
         );
     };

    // --- UI Components ---
    const ToastComponent = toast.show ?
        createElement('div', { className: `toast fixed top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 p-4 rounded-lg shadow-lg text-white text-base z-50 transition-all duration-300 ease-out ${toast.type === 'success' ? 'bg-green-500' : toast.type === 'info' ? 'bg-blue-500' : 'bg-red-500'} ${toast.show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}` }, toast.message)
        : null;

    // GameHeader - Aligns user/score block left
    const GameHeader = () => {
        const handleEditUsername = () => {
             const newName = prompt("הכנס שם משתמש חדש (עד 25 תווים):", userName);
             if (newName !== null) { handleUpdateUsername(newName); }
        };

        return createElement('div', {className: 'flex items-center w-full max-w-4xl mx-auto px-4 pt-2'}, // Main flex container
             // User/Score block (First item, aligned left)
            createElement('div', {className: 'text-left w-auto flex flex-col items-start min-w-[80px]'},
                createElement('div', { className: 'flex items-center cursor-pointer group', title:"לחץ לעריכת שם המשתמש", onClick: handleEditUsername },
                    createElement('span', { className: 'mr-1 text-xs text-gray-500 dark:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity' }, '✏️'),
                    createElement('span', { className: 'text-sm font-medium text-gray-700 dark:text-gray-300 truncate' }, userName || 'טוען...')
                ),
                createElement('div', { className: 'text-xs text-gray-500 dark:text-gray-400 mt-0.5', ref: scoreRef },
                    `ניקוד: ${formatScore(cumulativeScore)}` // Display cumulative score
                )
            ),
            // Title (Second item, centered)
            createElement('h1', { className: 'title text-xl sm:text-2xl font-bold text-center text-gray-900 dark:text-gray-100 flex-1 px-2' }, 'שרשרת סיבות ⛓️‍💥‏‏')
        );
    };

    function Footer() {
        const linkClass = 'hover:text-gray-700 dark:hover:text-gray-300 underline mx-1';
        const separatorClass = 'opacity-50 mx-1';
        return React.createElement('footer', { className: 'w-full text-center text-xs text-gray-500 dark:text-gray-400 pt-4 pb-2 mt-auto' }, // Added mt-auto to push footer down
          'פותח על ידי אריאל מ', React.createElement('a', { href: 'https://galilbio.wordpress.com', target: '_blank', rel: 'noopener noreferrer', className: linkClass }, 'הביולוגים של גליל'), ' בעזרת ',
          React.createElement('a', { href: 'https://grok.com', target: '_blank', rel: 'noopener noreferrer', className: linkClass }, 'Grok'), ', ',
          React.createElement('a', { href: 'https://chatgpt.com/', target: '_blank', rel: 'noopener noreferrer', className: linkClass }, 'Chat GPT'), ' וגם ',
          React.createElement('a', { href: 'https://gemini.google.com/', target: '_blank', rel: 'noopener noreferrer', className: linkClass }, 'Gemini'),
          React.createElement('span', { className: separatorClass }, '|'), React.createElement('a', { href: './admin.html', target: '_blank', rel: 'noopener noreferrer', className: linkClass }, 'ניהול')
        );
    }

    // GameSetup Component - Updated to fetch and display counts
    function GameSetup({ initialDifficultyRange, initialTopics, onStartGame }) {
         const [difficultyKey, setDifficultyKey] = useState(() => { /* ... as before ... */
            if (initialDifficultyRange.min === 1 && initialDifficultyRange.max === 2) return 'easy';
            if (initialDifficultyRange.min === 2 && initialDifficultyRange.max === 4) return 'medium';
            if (initialDifficultyRange.min === 4 && initialDifficultyRange.max === 5) return 'hard';
            return 'all';
         });
         const [selectedTopicsInternal, setSelectedTopicsInternal] = useState(new Set(initialTopics));
         const [topicCounts, setTopicCounts] = useState({}); // State for fetched counts
         const [countsLoading, setCountsLoading] = useState(false); // Loading state for counts
         const [totalAvailableInSelection, setTotalAvailableInSelection] = useState(0); // Total for selected topics/level

         const actualAvailableTopics = ['כללי', 'מעבדה', 'התא', 'אקולוגיה', 'גוף האדם'];
         const difficultyOptions = {
             easy: { label: 'קל', range: { min: 1, max: 2 } },
             medium: { label: 'בינוני', range: { min: 2, max: 4 } },
             hard: { label: 'קשה', range: { min: 4, max: 5 } },
             all: { label: 'הכל', range: { min: 1, max: 5 } }
         };
         const currentRange = difficultyOptions[difficultyKey].range;

         // Fetch counts when difficulty changes
         useEffect(() => {
             const fetchCounts = async () => {
                 setCountsLoading(true);
                 setTopicCounts({}); // Clear old counts
                 setTotalAvailableInSelection(0); // Reset total
                 console.log(`Workspaceing counts for levels ${currentRange.min} to ${currentRange.max}`);
                 const countsPromises = [];
                 const levelsToFetch = [];
                  // Determine which levels to fetch based on range
                  for (let level = currentRange.min; level <= currentRange.max; level++) {
                      levelsToFetch.push(level);
                      countsPromises.push(get(ref(db, `stats/groupCountsByLevelTopic/${level}`)));
                  }

                 try {
                     const snapshots = await Promise.all(countsPromises);
                     const combinedCounts = {};
                     snapshots.forEach(snapshot => {
                          const levelCounts = snapshot.val();
                          if (levelCounts) {
                               for (const topic in levelCounts) {
                                   combinedCounts[topic] = (combinedCounts[topic] || 0) + levelCounts[topic];
                               }
                          }
                     });
                     setTopicCounts(combinedCounts);
                     console.log("Fetched counts:", combinedCounts);
                 } catch (error) {
                     console.error("Error fetching topic counts:", error);
                     setTopicCounts({}); // Set empty on error
                     setToast({ show: true, message: 'שגיאה בטעינת מספרי תרגילים', type: 'error' });
                 } finally {
                     setCountsLoading(false);
                 }
             };
             fetchCounts();
         }, [difficultyKey]); // Re-fetch when difficulty changes

          // Calculate total available count whenever topics or counts change
          useEffect(() => {
             let total = 0;
             if (selectedTopicsInternal.size > 0 && Object.keys(topicCounts).length > 0) {
                 selectedTopicsInternal.forEach(topic => {
                     total += topicCounts[topic] || 0;
                 });
             }
             setTotalAvailableInSelection(total);
          }, [selectedTopicsInternal, topicCounts]);

         // Handlers remain similar
         const handleDifficultyChange = (event) => { setDifficultyKey(event.target.value); };
         const handleTopicToggle = (event) => {
             const topic = event.target.value;
             setSelectedTopicsInternal(prevTopics => {
                 const newTopics = new Set(prevTopics);
                 if (event.target.checked) { newTopics.add(topic); } else { newTopics.delete(topic); }
                 return newTopics;
             });
         };
         const handleSelectAllTopics = (event) => {
             if (event.target.checked) { setSelectedTopicsInternal(new Set(actualAvailableTopics)); }
             else { setSelectedTopicsInternal(new Set()); }
         };
         const handleStartClick = () => {
             if (selectedTopicsInternal.size === 0) { alert('יש לבחור לפחות נושא אחד'); return; }
             if (totalAvailableInSelection === 0) { alert('לא נמצאו תרגילים התואמים לבחירה זו.'); return; }
             // Pass the calculated total count for the selection
             onStartGame(currentRange, selectedTopicsInternal, totalAvailableInSelection);
         };

         // Render button updated to show counts
         const renderSelectionButton = ({ type, id, name, value, checked, onChange, labelText, count }) => {
            const labelBaseClasses = "flex items-center justify-between w-full p-3 border rounded-lg cursor-pointer transition-all duration-200 shadow-sm text-right"; // Added text-right for label content
            const labelSelectedClasses = "bg-blue-100 border-blue-500 ring-2 ring-blue-300 dark:bg-blue-900 dark:border-blue-500 dark:ring-blue-600";
            const labelUnselectedClasses = "bg-white border-gray-300 hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600";
            const inputClasses = `ml-3 h-5 w-5 accent-blue-600 focus:ring-0 focus:ring-offset-0`; // Added margin-left to input

            return createElement('label', { htmlFor: id, className: `${labelBaseClasses} ${checked ? labelSelectedClasses : labelUnselectedClasses}` },
                 // Container for text and count, aligned right
                 createElement('div', { className: 'flex flex-col items-end' }, // Changed to flex-col items-end
                      createElement('span', { className: 'text-sm sm:text-base text-gray-900 dark:text-gray-100' }, labelText),
                      // Display count if available (and not for 'All' checkbox)
                      (type === 'checkbox' && value !== 'all' && !countsLoading && typeof count === 'number') &&
                      createElement('span', { className: 'text-xs text-gray-500 dark:text-gray-400 mt-1' }, `[${count} תרגילים]`)
                 ),
                 createElement('input', { type: type, id: id, name: name, value: value, checked: checked, onChange: onChange, className: inputClasses })
             );
         };


         return createElement(
             'div', { className: 'w-full' },
             createElement('h2', { className: 'text-xl sm:text-2xl font-semibold text-center mb-5 text-gray-900 dark:text-gray-100' }, 'הגדרות משחק'),
             createElement('div', { className: 'mb-6' },
                 createElement('h3', { className: 'text-base font-medium mb-3 text-gray-800 dark:text-gray-200' }, 'בחר רמת קושי:'),
                 createElement('div', { className: 'grid grid-cols-2 sm:grid-cols-4 gap-3' },
                     Object.entries(difficultyOptions).map(([key, { label }]) =>
                         renderSelectionButton({ type: 'radio', id: `difficulty-${key}`, name: 'difficulty', value: key, checked: difficultyKey === key, onChange: handleDifficultyChange, labelText: label })
                     )
                 )
             ),
             createElement('div', { className: 'mb-6 relative' }, // Added relative for loading overlay potentially
                 createElement('h3', { className: 'text-base font-medium mb-3 text-gray-800 dark:text-gray-200' }, 'בחר נושאים (אחד או יותר):'),
                 // Show loading indicator for counts
                 countsLoading && createElement('div', {className: 'absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-gray-800/50 z-10 rounded-lg'},
                      createElement('span',{className: 'text-gray-600 dark:text-gray-300'}, 'טוען ספירות...')
                 ),
                 createElement('div', { className: `grid grid-cols-2 sm:grid-cols-3 gap-3 ${countsLoading ? 'opacity-50' : ''}` }, // Dim grid while loading
                      renderSelectionButton({ type: 'checkbox', id: 'topic-all', name: 'topic-all', value: 'all', checked: selectedTopicsInternal.size === actualAvailableTopics.length && actualAvailableTopics.length > 0, onChange: handleSelectAllTopics, labelText: 'הכל', count: null }),
                      actualAvailableTopics.map(topic =>
                          renderSelectionButton({
                              type: 'checkbox',
                              id: `topic-${topic.replace(/\s+/g, '-')}`,
                              name: `topic-${topic.replace(/\s+/g, '-')}`,
                              value: topic,
                              checked: selectedTopicsInternal.has(topic),
                              onChange: handleTopicToggle,
                              labelText: topic,
                              count: topicCounts[topic] // Pass the count
                          })
                      )
                 )
             ),
             createElement('button', {
                  className: `w-full py-2.5 px-5 text-base rounded-full font-semibold transition-opacity duration-300 flex items-center justify-center ${selectedTopicsInternal.size === 0 || totalAvailableInSelection === 0 ? 'bg-gray-400 text-gray-700 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400' : 'bg-green-500 text-white hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:focus:ring-offset-gray-800`,
                  onClick: handleStartClick,
                  disabled: selectedTopicsInternal.size === 0 || totalAvailableInSelection === 0 || countsLoading // Disable while loading counts
              },
                  createElement('span', null, 'התחל משחק'),
                  // Display total count for the *selection*
                  selectedTopicsInternal.size > 0 && !countsLoading &&
                  createElement('span', { className: 'text-xs font-normal opacity-80 mr-2' }, `[${totalAvailableInSelection} ${totalAvailableInSelection === 1 ? 'תרגול' : 'תרגולים'}]`)
              )
         );
    }
    // --- End GameSetup ---


    // --- Function to handle username update from Header ---
    const handleUpdateUsername = async (newName) => {
        const trimmedName = newName.trim();
        if (!trimmedName || trimmedName.length > 25) {
             console.warn("Invalid nickname provided for update.");
             setToast({ show: true, message: trimmedName.length > 25 ? 'השם ארוך מדי (עד 25 תווים)' : 'השם אינו יכול להיות ריק', type: 'error' });
             return;
        }
        if (trimmedName === userName) {
             console.log("Nickname is the same, no update needed.");
             return;
        }

        if (currentUser && playerId) {
             const playerNicknameRef = ref(db, `players/${playerId}/nickname`);
             try {
                 await set(playerNicknameRef, trimmedName);
                 try { await updateProfile(currentUser, { displayName: trimmedName }); }
                 catch (profileError) { console.warn("Could not update profile display name.", profileError); }
                 setUserName(trimmedName);
                 setToast({ show: true, message: 'שם המשתמש עודכן!', type: 'success' });
             } catch (error) {
                 console.error("Error updating nickname:", error);
                 setToast({ show: true, message: 'שגיאה בעדכון שם המשתמש', type: 'error' });
             }
        } else {
             console.error("Cannot update username: user or playerId is null.");
             setToast({ show: true, message: 'שגיאה: לא ניתן לעדכן שם כרגע', type: 'error' });
        }
    };
    // --- End update username function ---


    // --- Main Return of App Component ---
    return createElement(
        'div', { className: 'container flex flex-col items-center justify-start pt-2 pb-1 gap-0 px-4 sm:px-8 relative flex-grow min-h-full' }, // Reduced pb, gap=0

        createElement(GameHeader, { currentUsername: userName, onEditUsername: handleUpdateUsername }),

        // Main Content Area - Removed my-4 to reduce gap
        createElement('div', { className: 'w-full max-w-lg mx-auto p-4 sm:p-6 bg-white dark:bg-gray-800 shadow-md rounded-lg flex flex-col items-center' },

            // State 1: Setup Screen
            gameState === 'setup' ?
                createElement(GameSetup, { initialDifficultyRange: selectedDifficultyRange, initialTopics: selectedTopics, onStartGame: handleStartGame })

            // State 2: Playing Screen (Finished) -> Show Scoreboard
            : gameState === 'playing' && finished ?
                createElement(ScoreboardComponent, {
                    userName: userName, cumulativeScore: cumulativeScore, // Pass cumulative score
                    totalAttempts: totalSessionAttempts, totalTime: totalSessionTime,
                    difficultyRange: selectedDifficultyRange, topics: selectedTopics,
                    onPlayAgain: handleReturnToSetup,
                    onShare: handleShare
                })

            // State 3: Playing Screen (In Progress) -> Show Game Area
            : gameState === 'playing' && !finished ?
                createElement(React.Fragment, null,
                     createElement('h2', { className: 'text-lg sm:text-xl font-semibold text-center mb-1 text-gray-800 dark:text-gray-200' },
                        currentGroup ? `נושא: ${currentGroup.topic || 'כללי'}` : 'טוען תרגיל...' // Show loading text if group is null
                    ),
                    createElement('div', { className: 'flex justify-center items-center space-x-3 space-x-reverse text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2 w-full' },
                         currentGroup ? [ // Show stats only if group is loaded
                            createElement('span', { key: 'count' }, `תרגול: ${sessionExerciseCount}/${totalGroupsInSelection}`),
                            createElement('span', { key: 'sep1', className: 'opacity-50'}, '|'),
                            createElement('span', { key: 'attempts' }, `ניסיונות: ${attempts}`),
                            createElement('span', { key: 'sep2', className: 'opacity-50'}, '|'),
                            createElement('span', { key: 'timer' }, `זמן: ${formatTime(timer)}`)
                        ] : !isFetchingGroups ? // If not fetching and no group, maybe an error occurred
                             createElement('span', {key: 'error'}, 'שגיאה בטעינה') : null // Avoid showing stats during fetch
                    ),
                    createElement('p', { className: 'text-center text-sm text-gray-500 dark:text-gray-400 mb-3' },
                        currentGroup ? 'סדר/י את המשפטים הבאים לפי שרשרת של סיבות ותוצאה' : ''
                    ),
                    // Container for sentences or loading indicator
                    createElement( 'div', { id: 'sortable-container', ref: containerRef, className: `flex flex-col items-center w-full min-h-[200px]` }, // Ensure min-height
                        // Show loading indicator when fetching groups
                        isFetchingGroups ? createElement(LoadingIndicator, { isActive: true, message: "טוען תרגילים..."})
                        // Show sentences if loaded and not fetching
                        : currentGroup ? currentGroup.sentences.map((s, index) => renderSentence(s, index))
                        // Fallback if not fetching and no group (should ideally not happen often)
                        : createElement(LoadingIndicator, { isActive: true, message: "מכין תרגיל..."})
                    ),
                    // Action button
                    actionButton
                )
            // Fallback
            : createElement(LoadingIndicator, { isActive: true, message: "טוען אפליקציה..."}) // Initial app load

        ), // End Main Content Area div

        createElement(Footer, null), // Footer pushed down by mt-auto
        ToastComponent
    ); // End App main div
} // End of App Component

// Render the App to the DOM
ReactDOM.createRoot(document.getElementById('root')).render(createElement(App));