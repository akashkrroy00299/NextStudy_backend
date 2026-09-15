import cron from "node-cron";
import { Temporal } from "@js-temporal/polyfill";
import todoModel from "../../../models/todos.model.js";
import userModel from "../../../models/user.model.js";

let isRunning = false;

const todayStartForTimezone = (timezone) => {
    try {
        const zonedNow = Temporal.Now.zonedDateTimeISO(timezone);
        return zonedNow
            .toPlainDate()
            .toZonedDateTime({
                timeZone: timezone,
                plainTime: Temporal.PlainTime.from("00:00")
            })
            .toInstant()
            .epochMilliseconds;
    } catch (error) {
        console.warn(`[expireTodos] Invalid timezone "${timezone}", skipping`);
        return null;
    }
};

const expireOverdueTodos = async () => {
    if (isRunning) {
        console.log("[expireTodos] Previous run still in progress, skipping this tick");
        return;
    }

    isRunning = true;
    try {
        let totalExpired = 0;
        const timezones = await userModel.distinct("timezone");

        for (const timezone of timezones) {
            const todayStart = todayStartForTimezone(timezone);
            if (todayStart === null) continue;

            const userIds = (await userModel.find({ timezone }).select("_id").lean()).map((u) => u._id);
            if (userIds.length === 0) continue;

            const result = await todoModel.updateMany(
                {
                    userId: { $in: userIds },
                    isCompleted: false,
                    isExpired: false,
                    dueDate: { $lt: new Date(todayStart) }
                },
                { $set: { isExpired: true, status: 'expired' } }
            );

            totalExpired += result.modifiedCount;
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