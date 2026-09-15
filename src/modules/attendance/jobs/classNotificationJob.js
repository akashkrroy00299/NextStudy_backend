import cron from "node-cron"
import { Temporal } from "@js-temporal/polyfill"
import notificationModel from "../../../models/notification.model.js"
import classModel from "../../../models/class.model.js"
import userModel from "../../../models/user.model.js"

const DEFAULT_TIMEZONE = "Asia/Kolkata"
const WINDOW_MINUTES = 10

const pad = (value) => String(value).padStart(2, "0")
const toHHMM = (minutes) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`

let isRunning = false

const minuteOfDay = (epochMs, timezone) => {
  const zoned = Temporal.Instant.fromEpochMilliseconds(epochMs).toZonedDateTimeISO(timezone)
  return {
    dayIndex: zoned.dayOfWeek - 1,
    minute: zoned.hour * 60 + zoned.minute,
    date: zoned.toPlainDate().toString()
  }
}

const processTimezone = async (timezone, userIds) => {
  const now = Date.now()
  const windowEnd = now + WINDOW_MINUTES * 60 * 1000

  let from, to
  try {
    from = minuteOfDay(now, timezone)
    to = minuteOfDay(windowEnd, timezone)
  } catch {
    console.warn(`[classNotify] Invalid timezone "${timezone}", skipping`)
    return
  }

  const timeWindows = []
  if (to.dayIndex === from.dayIndex) {
    timeWindows.push({
      day: from.dayIndex,
      startTime: { $gte: toHHMM(from.minute), $lte: toHHMM(to.minute) }
    })
  } else {
    timeWindows.push({ day: from.dayIndex, startTime: { $gte: toHHMM(from.minute) } })
    timeWindows.push({ day: to.dayIndex, startTime: { $lte: toHHMM(to.minute) } })
  }

  const classes = await classModel
    .find({
      userId: { $in: userIds },
      isActive: true,
      notify: true,
      $or: timeWindows
    })
    .select("userId name day startTime")
    .lean()

  let created = 0
  for (const cls of classes) {
    const notificationKey = `class_${cls._id}_${from.date}`
    try {
      await notificationModel.create({
        userId: cls.userId,
        type: "class",
        title: cls.name,
        message: `${cls.name} starts soon`,
        notificationKey,
        status: "sent"
      })
      created += 1
    } catch (error) {
      if (error.code !== 11000) throw error
    }
  }

  if (created > 0) {
    console.log(`[classNotify] ${timezone}: created ${created} notification(s)`)
  }
}

const run = async () => {
  if (isRunning) {
    console.log("[classNotify] Previous run still in progress, skipping this tick")
    return
  }

  isRunning = true
  try {
    const timezones = await userModel.distinct("timezone")
    for (const timezone of timezones) {
      if (!timezone) continue
      const userIds = (await userModel.find({ timezone }).select("_id").lean()).map((u) => u._id)
      if (userIds.length === 0) continue
      await processTimezone(timezone, userIds)
    }

    const legacyUserIds = (await userModel.find({
      $or: [{ timezone: null }, { timezone: "" }, { timezone: { $exists: false } }]
    }).select("_id").lean()).map((u) => u._id)
    if (legacyUserIds.length > 0) {
      await processTimezone(DEFAULT_TIMEZONE, legacyUserIds)
    }
  } catch (error) {
    console.log("[classNotify] Cron job failed!", error)
  } finally {
    isRunning = false
  }
}

const classNotificationJob = () => {
  cron.schedule("*/5 * * * *", run)
  console.log("[classNotify] Job scheduled: every 5 minutes")
}

export default classNotificationJob