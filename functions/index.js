// functions/index.js (Siba-Siba Project) - Updated for Cross-Project Access via SAK

const functions = require("firebase-functions"); // Use v1 for callable if simpler, or v2 below
// const { onCall } = require("firebase-functions/v2/https"); // Option for v2 callable
const { logger } = require("firebase-functions/v2"); // Still use v2 logger
const admin = require("firebase-admin");

// --- Initialize default Admin SDK for siba-siba project (if needed) ---
// admin.initializeApp(); // Might not be needed if only accessing trivbio

// --- Initialize Secondary App for trivbio Project using SAK ---
const trivbioServiceAccount = require("./trivbio-service-account-key.json"); // Load the key file
// !!! החלף בכתובת ה-URL הנכונה של מסד הנתונים בפרויקט trivbio !!!
const trivbioDatabaseURL = "https://trivbio-default-rtdb.firebaseio.com";

let trivbioApp;
try {
    // Initialize with a unique app name to avoid conflicts
    trivbioApp = admin.initializeApp({
        credential: admin.credential.cert(trivbioServiceAccount),
        databaseURL: trivbioDatabaseURL
    }, 'trivbioApp'); // Unique name is crucial
    logger.info("Secondary Firebase app 'trivbioApp' initialized successfully.");
} catch (e) {
    logger.warn("Secondary Firebase app 'trivbioApp' might already be initialized. Attempting to retrieve.", e.message);
    try {
        // If already initialized (e.g., due to function reuse), retrieve it
        trivbioApp = admin.app('trivbioApp');
        if (!trivbioApp) throw new Error("Could not retrieve initialized app 'trivbioApp'.");
        logger.info("Retrieved existing secondary Firebase app 'trivbioApp'.");
    } catch (retrieveError) {
        logger.error("FATAL: Could not initialize or retrieve secondary Firebase app 'trivbioApp'.", retrieveError);
        // In a real scenario, might throw error or handle failure appropriately
        trivbioApp = null; // Ensure it's null if unusable
    }
}

// Get a database instance specifically for the trivbioApp
// Ensure trivbioApp was successfully initialized or retrieved before getting DB
const trivbioDb = trivbioApp ? trivbioApp.database() : null;

// --- HTTPS Callable Function to Update Counts in trivbio ---
// Using v1 callable syntax for simplicity here, switch to v2 if preferred
exports.recalculateAndUpdateCounts = functions
    // Optional: Specify region
    // .region('your-region')
    .https.onCall(async (data, context) => {

        // Optional: Add authentication check if needed
        // if (!context.auth) {
        //     throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
        // }
        // Optional: Add admin check if only admins should trigger this
        // const isAdmin = await checkAdminStatus(context.auth.uid); // You'd need a function for this
        // if (!isAdmin) {
        //     throw new functions.https.HttpsError('permission-denied', 'Only admins can trigger this function.');
        // }

        logger.info("Recalculate function called. Reading groups from trivbio DB...");

        // Ensure we have a valid reference to trivbio's DB
        if (!trivbioDb) {
            logger.error("Trivbio database reference is not available.");
            throw new functions.https.HttpsError('internal', 'Failed to connect to target database.');
        }

        const groupsRef = trivbioDb.ref('/collections/groups');
        let allGroupsData = null;
        try {
            const groupsSnapshot = await groupsRef.once('value');
            allGroupsData = groupsSnapshot.val();
            logger.info("Successfully read groups data from trivbio DB.");
        } catch (error) {
            logger.error("Failed to read '/collections/groups' from trivbio DB:", error);
            throw new functions.https.HttpsError('internal', 'Failed to read group data.', error.message);
        }

        logger.info("Recalculating group counts...");
        const counts = {};
        const possibleLevels = ['1', '2', '3', '4', '5'];
        const defaultTopic = 'כללי';

        if (allGroupsData) {
            Object.values(allGroupsData).forEach(group => {
                if (group && typeof group === 'object' && group.difficulty && typeof group.topic !== 'undefined') {
                    const level = String(group.difficulty);
                    const topic = String(group.topic || defaultTopic).trim() || defaultTopic;
                    if (possibleLevels.includes(level)) {
                        if (!counts[level]) counts[level] = {};
                        if (!counts[level][topic]) counts[level][topic] = 0;
                        counts[level][topic]++;
                    } else {
                        logger.warn(`Skipping group with invalid level: ${level}`, { groupData: group });
                    }
                } else {
                    logger.info("Skipping invalid or null group entry during count.", { entry: group });
                }
            });
        } else {
            logger.info("No groups found in trivbio DB '/collections/groups'. Setting counts to empty object.");
        }

        // Write the recalculated counts to the stats path IN TRIVBIO DB
        const statsRef = trivbioDb.ref('/stats/groupCountsByLevelTopic');
        try {
            await statsRef.set(counts);
            logger.info("Successfully updated group counts in trivbio DB '/stats/groupCountsByLevelTopic'.", { newCounts: counts });
            // Return success status and the counts calculated
            return { status: "success", counts: counts };
        } catch (error) {
            logger.error("Error writing group counts to trivbio database:", error);
            throw new functions.https.HttpsError('internal', 'Failed to write calculated counts.', error.message);
        }
    });

// --- Helper Function Example (if needed for admin check) ---
// async function checkAdminStatus(uid) {
//     if (!uid) return false;
//     // Check against the 'admins' node in the appropriate database (likely trivbio's)
//     const adminRef = trivbioDb ? trivbioDb.ref(`/admins/${uid}`) : null;
//     if (!adminRef) return false;
//     try {
//         const snapshot = await adminRef.once('value');
//         return snapshot.exists() && snapshot.val() === true;
//     } catch (error) {
//         logger.error(`Error checking admin status for uid: ${uid}`, error);
//         return false;
//     }
// }