import cron from "node-cron";
import mongoose from "mongoose";
import { Temporal } from "@js-temporal/polyfill";
import todoModel from "../../../models/todos.model.js"
import notificationModel from "../../../models/notification.model.js"

const BATCH_SIZE = 200;
const REMINDER_TIMEZONE = "Asia/Kolkata";

const formatDueDate = (date) => {
    const d = new Date(date)
    const day = d.getDate()
    const month = d.toLocaleString('en-US', { month: 'short' }).toLowerCase()
    return `${day}${month}`
};


const sendNotification = async (todo) => {
    try {
        const todayKey = new Date().toLocaleDateString('en-CA', { timeZone: REMINDER_TIMEZONE });
        const notificationKey = `todo_${todo._id}_${todayKey}`;
        await notificationModel.create({
            userId: todo.userId,
            type: "todo",
            title: "Todo Reminder",
            message: `${todo.title} is not completed. Due date: ${formatDueDate(todo.dueDate)}`,
            status: "sent",
            notificationKey
        })
    } catch (err) {
        console.log(`Error to send ${todo._id}`, err)
    }
}

const DauDateToday = async () => {
    const todayStart = Temporal.Now.zonedDateTimeISO(REMINDER_TIMEZONE)
        .toPlainDate()
        .toZonedDateTime({
            timeZone: REMINDER_TIMEZONE,
            plainTime: Temporal.PlainTime.from("00:00")
        })
        .toInstant()
        .epochMilliseconds;
    const startOfDay = new Date(todayStart)
    const endOfDay = new Date(todayStart + 24 * 60 * 60 * 1000 - 1)

    let lastId = null
    let processed = 0

    while (true) {
        const query = {
            dueDate: { $gte: startOfDay, $lte: endOfDay },
            isCompleted: false,
            isExpired: false,
            ...(lastId ? { _id: { $gt: lastId } } : {})
        };

        const batch = await todoModel.find(query)
            .sort({ _id: 1 })
            .limit(BATCH_SIZE)
            .lean()

        if (batch.length === 0) break

        for (const todo of batch) {
            try {
                await sendNotification(todo)
            } catch (error) {
                console.error(`Notification failed for todo ${todo._id}:`, error)
            }
        }

        processed += batch.length
        lastId = batch[batch.length - 1]._id

        await new Promise(r => setTimeout(r, 200))
    }

    console.log(`Processed ${processed} todos due Today`)
}

cron.schedule('0 1 * * *', async () => {
    await DauDateToday();
}, {
    timezone: REMINDER_TIMEZONE
})

