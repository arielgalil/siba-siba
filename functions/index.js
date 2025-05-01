// functions/index.js (Updated to Cloud Functions v2 Syntax)

// Use specific imports for v2 triggers and logger
const { onValueWritten } = require("firebase-functions/v2/database");
const { logger } = require("firebase-functions/v2"); // Recommended logger for v2
const admin = require("firebase-admin");

// Initialize Admin SDK (once per function deployment)
admin.initializeApp();

// Define the function using the v2 trigger 'onValueWritten'
exports.updateGroupCounts = onValueWritten(
    {
        ref: "/collections/groups", // The database path to watch
        // Optional: Specify region if needed (e.g., 'europe-west1')
        // region: "your-region",
        // Optional: Specify database instance if not the default one
        // instance: "your-database-instance-name",
    },
    async (event) => {
        // event.data.before -> Snapshot before the change
        // event.data.after  -> Snapshot after the change

        // For robust counting, it's best to re-read the entire collection's state
        // after any write operation affecting it.
        const groupsRef = admin.database().ref('/collections/groups');
        let allGroupsData = null;
        try {
            // Read the data using the Admin SDK (bypasses security rules)
            const groupsSnapshot = await groupsRef.once('value');
            allGroupsData = groupsSnapshot.val();
            logger.info("Successfully read latest '/collections/groups' data for recounting.");
        } catch (error) {
            logger.error("Failed to read '/collections/groups' after write trigger:", error);
            return null; // Exit function if data read fails
        }

        logger.info("Recalculating group counts...");

        // Object to store the new counts
        const counts = {};
        const possibleLevels = ['1', '2', '3', '4', '5'];
        const defaultTopic = 'כללי';

        // Check if there's any data after the write operation
        if (allGroupsData) {
            // Iterate through the groups (can be an object or array)
            Object.values(allGroupsData).forEach(group => {
                // Validate the group structure before counting
                if (group && typeof group === 'object' && group.difficulty && typeof group.topic !== 'undefined') {
                    const level = String(group.difficulty); // Ensure level is a string key
                    const topic = String(group.topic || defaultTopic).trim() || defaultTopic; // Use default if empty/missing

                    // Check if the level is valid
                    if (possibleLevels.includes(level)) {
                        // Initialize nested objects if they don't exist
                        if (!counts[level]) {
                            counts[level] = {};
                        }
                        if (!counts[level][topic]) {
                            counts[level][topic] = 0;
                        }
                        // Increment the count
                        counts[level][topic]++;
                    } else {
                        logger.warn(`Skipping group with invalid level: ${level}`, { groupData: group });
                    }
                } else {
                    // Log if an entry is null (e.g., after deleting from an array) or malformed
                    logger.info("Skipping invalid, null, or malformed group entry during count.", { entry: group });
                }
            });
        } else {
            // This case happens if the entire '/collections/groups' node was deleted
            logger.info("'/collections/groups' node is empty or deleted. Setting counts to empty object.");
        }

        // Write the recalculated counts to the stats path using the Admin SDK
        const statsRef = admin.database().ref('/stats/groupCountsByLevelTopic');
        try {
            // Use set() to completely overwrite the previous counts with the new ones
            await statsRef.set(counts);
            logger.info("Successfully updated group counts in '/stats/groupCountsByLevelTopic'.", { newCounts: counts });
        } catch (error) {
            logger.error("Error writing group counts to database:", error);
        }

        // Indicate successful completion (or completion despite errors logged above)
        return null;
    });

// You can add other Cloud Functions below