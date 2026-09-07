import cron from "node-cron";
import todoModel from "../models/todos.model.js";

const BATCH_SIZE = 500;
const MAX_BATCHES_PER_RUN = 10;

let isRunning = false;

const expireOverdueTodos = async () => {
    if (isRunning) {
        console.log("[expireTodos] Previous run still in progress, skipping this tick");
        return;
    }

    isRunning = true;
    try {
        let totalExpired = 0;
        for (let i = 0; i < MAX_BATCHES_PER_RUN; i++) {
            const overdueBatch = await todoModel
                .find(
                    {
                        isCompleted: false,
                        isExpaired: false,
                        dueDate: { $lt: new Date() }
                    },
                    { _id: 1 }
                )
                .limit(BATCH_SIZE);

            if (overdueBatch.length === 0) break;
            const ids = overdueBatch.map((doc) => doc._id);
            const result = await todoModel.updateMany(
                { _id: { $in: ids } },
                { $set: { isExpaired: true, status: 'expaired' } }
            );
            totalExpired += result.modifiedCount;
            if (overdueBatch.length < BATCH_SIZE) break;
        }

        if (totalExpired > 0) {
            console.log(`[expireTodos] Marked ${totalExpired} todo(s) as expired`);
        }
    } catch (error) {
        console.log("[expireTodos] Error expiring todos:", error);
    } finally {
        isRunning = false;
    }
};

const startExpireTodosJob = () => {
    cron.schedule('*/5 * * * *', () => {
        expireOverdueTodos();
    });

    console.log("[expireTodos] Job scheduled: every 5 minutes");
};

export default startExpireTodosJob;