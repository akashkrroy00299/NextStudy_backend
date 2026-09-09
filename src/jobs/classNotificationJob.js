import corn from "node-cron"
import notificationModel from "../models/notification.model.js"
import classModel from "../models/class.model.js"

const toDayMinutes = (date) => ({
  day: date.getDay(),
  minutes: date.getHours() * 60 + date.getMinutes()
});

const classNotificationJob = () => {
  corn.schedule("*/5 * * * *", async () => {
    try {
      console.log("Cron Job [CLASS NOTIFY] working!")

      const now = new Date();
      const tenMinutesLater = new Date(now.getTime() + 10 * 60 * 1000);

      const nowParts = toDayMinutes(now)
      const laterParts = toDayMinutes(tenMinutesLater)
      const todayStr = now.toISOString().split("T")[0]

      const dueClasses = await classModel.find({
        isActive: true,
        notify: true,
        day: nowParts.day,
        start: { $gte: nowParts.minutes, $lte: laterParts.minutes }
      })

      for (const cls of dueClasses) {
        const notificationKey = `class_${cls._id}_${todayStr}`

        try {
          await notificationModel.create({
            userId: cls.userId,
            type: "class",
            title: cls.title,
            message: `${cls.title} starts soon`,
            notificationKey,
            status: "sent"
          })

          console.log(`Notification created for ${cls.title}`)
        } catch (error) {
          if (error.code === 11000) {
            console.log(`Already notified for ${cls.title} today`)
          } else {
            throw error;
          }
        }
      }

    } catch (error) {
      console.log("Cron job [CLASS NOTIFY] failed!", error)
    }
  })
}

export default classNotificationJob;