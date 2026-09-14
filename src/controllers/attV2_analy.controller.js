import { Temporal } from "@js-temporal/polyfill";
import timetableModel from '../models/timetable.model.js';
import classModel from "../models/class.model.js"
import attendanceLogModel from '../models/attendanceLog.model.js';
import settingsModel from '../models/settings.model.js';
import userModel from '../models/user.model.js';
import { plainDateToDate } from "../utils/dateUtil.js";
import { redisClient } from "../lib/redis.js";


// * GLOABLE FUNCTIONS
function getWeekdayNumber(plainDate) {
  return plainDate.dayOfWeek - 1;
}

export function safePlainDateISO(timezone) {
  try {
    return Temporal.Now.plainDateISO(timezone);
  } catch (err) {
    console.warn(`Invalid timezone "${timezone}", falling back to Asia/Kolkata`);
    return Temporal.Now.plainDateISO('Asia/Kolkata');
  }
}


// * SECTION 2 : TODAY CLASSES
export const todayClasses = async (req, res) => {
  try {
    const userId = req.userId
    const user = await userModel.findById(userId)
    if (!user) { return res.status(400).json({ success: false, message: "User not found!" }) }

    const id = req.params.id
    const timetable = await timetableModel.findOne({ _id: id, userId, isActive: true })
    if (!timetable) { return res.status(400).json({ success: false, message: "Tiemtable Not Found!" }) }

    const today = safePlainDateISO(user.timezone)
    const day = getWeekdayNumber(today)
    const start = plainDateToDate(today)
    const end = plainDateToDate(today.add({ days: 1 }))

    const classes = await classModel.find({ userId, timeTableId: timetable._id, day })
    const todayClasses = []

    for (const cls of classes) {
      const attendanceLog = await attendanceLogModel.findOne({
        userId,
        classId: cls._id,
        date: {
          $gte: start,
          $lt: end,
        },
      })

      todayClasses.push({
        ...cls.toObject(),
        attended: !!attendanceLog,
      })
    }

    return res.status(200).json({
      success: true,
      message: "Fatched Today Classes!",
      todayClasses
    })

  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: "Error at attendance Get data" });
  }
}

export const toggleAttended = async (req, res) => {
  try {
    const userId = req.userId
    const { clsId, ttId } = req.params
    const rawStatus = req.query.status

    if (!clsId || !ttId) {
      return res.status(400).json({
        success: false,
        message: "Class and timetable IDs are required",
      })
    }

    const isAttend = rawStatus === "true" || rawStatus === "present" || rawStatus === "1"
    const user = await userModel.findById(userId)
    if (!user) {
      return res.status(400).json({ success: false, message: "User not found!" })
    }

    const timetable = await timetableModel.findOne({ userId, isActive: true, _id: ttId })
    if (!timetable) {
      return res.status(400).json({ success: false, message: "timetable not found" })
    }

    const classDoc = await classModel.findOne({ _id: clsId, userId, timeTableId: timetable._id })
    if (!classDoc) {
      return res.status(404).json({ success: false, message: "Class not found" })
    }

    const today = safePlainDateISO(user.timezone)
    const startOfDay = plainDateToDate(today)
    const endOfDay = plainDateToDate(today.add({ days: 1 }))

    let attendanceLog = await attendanceLogModel.findOne({
      userId,
      classId: clsId,
      subjectId: classDoc.subjectId,
      date: { $gte: startOfDay, $lte: endOfDay }
    })

    if (attendanceLog) {
      if (attendanceLog.isAttend !== isAttend) {
        attendanceLog.isAttend = isAttend
        await attendanceLog.save()
      }

      return res.status(200).json({
        success: true,
        message: "Updated attendanceLog",
        attendanceLog
      })
    }

    attendanceLog = await attendanceLogModel.create({
      userId,
      classId: clsId,
      subjectId: classDoc.subjectId,
      isAttend: isAttend,
      date: startOfDay
    })

    const markedDate = new Date(date)
    const monthIndex = markedDate.getMonth()
    const year = markedDate.getFullYear()

    await redisClient.del(`grid_data_${userId}_${ttId}_${monthIndex}_${year}`)
    await redisClient.del(`target_${userId}_${ttId}`)

    return res.status(201).json({
      success: true,
      message: "Attendance marked",
      attendanceLog
    })

  } catch (error) {
    console.log(error)
    return res.status(500).json({ success: false, message: "Error at attendance Toggle data" })
  }
}

// * SECTION 3 : TARGET AND REAL
export const targetAttendance = async (req, res) => {
  try {
    const userId = req.userId
    const id = req.params.id

    const API_NAME = "target"
    const REDIS_KEY = `${API_NAME}_${userId}_${id}`

    const data = await redisClient.get(REDIS_KEY)
    if (data) {
      const result = JSON.parse(data)
      return res.status(200).json({ success: true, message: "fatch from redis", result })
    }

    const user = await userModel.findById(userId)
    if (!user) {
      return res.status(400).json({ success: false, message: "User not found!" })
    }

    const timetable = await timetableModel.findOne({ _id: id, userId, isActive: true })
    if (!timetable) {
      return res.status(400).json({ success: false, message: "timetable not found" })
    }

    const _subjects = timetable.subjects || []
    if (_subjects.length === 0) {
      return res.status(200).json({ success: true, message: "Add subjects to see target data" })
    }

    const today = safePlainDateISO(user.timezone)
    const startPlain = Temporal.PlainDate.from(timetable.startDate.toISOString().split("T")[0])
    const endPlain = timetable.endDate
      ? Temporal.PlainDate.from(timetable.endDate.toISOString().split("T")[0])
      : today

    const lastCounted = Temporal.PlainDate.compare(endPlain, today) < 0 ? endPlain : today
    const allVersions = await timetableModel.find({ uuid: timetable.uuid, userId }).sort({ version: 1 }).lean()

    const totalHeldBySubject = new Map()

    for (const versionDoc of allVersions) {
      const versionStart = Temporal.PlainDate.from(versionDoc.startDate.toISOString().split("T")[0])
      const versionEnd = versionDoc.isActive
        ? lastCounted
        : Temporal.PlainDate.from(versionDoc.deactivatedAt.toISOString().split("T")[0])

      if (Temporal.PlainDate.compare(versionStart, versionEnd) > 0) {
        continue
      }

      const versionDays = versionStart.until(versionEnd).days + 1
      const versionWeekdayCounts = Array(7).fill(0)

      for (let i = 0; i < versionDays; i++) {
        const day = versionStart.add({ days: i })
        versionWeekdayCounts[day.dayOfWeek - 1] += 1
      }

      for (const sub of versionDoc.subjects || []) {
        const heldInThisVersion = (sub.classes || []).reduce((sum, weekday) => {
          return sum + (versionWeekdayCounts[Number(weekday)] || 0)
        }, 0)

        totalHeldBySubject.set(
          sub.subjectId,
          (totalHeldBySubject.get(sub.subjectId) || 0) + heldInThisVersion
        )
      }
    }

    const _subjectIds = _subjects.map((s) => s.subjectId)
    const logs = await attendanceLogModel.find({
      userId,
      subjectId: { $in: _subjectIds },
      date: { $gte: timetable.startDate, $lte: plainDateToDate(lastCounted) }
    }).lean()

    const logsBySubject = new Map()
    for (const log of logs) {
      if (!logsBySubject.has(log.subjectId)) {
        logsBySubject.set(log.subjectId, [])
      }
      logsBySubject.get(log.subjectId).push(log)
    }

    const result = _subjects.map((sub) => {
      const totalHeld = totalHeldBySubject.get(sub.subjectId) || 0
      const subjectLogs = logsBySubject.get(sub.subjectId) || []

      const present = subjectLogs.filter((l) => l.isAttend).length
      const absent = subjectLogs.filter((l) => !l.isAttend).length
      const unrecorded = totalHeld - (present + absent)

      const currentPercent = totalHeld > 0 ? (present / totalHeld) * 100 : 0
      const target = String(sub.target ?? "75")
      const targetValue = Number(target)

      let canBunk = 0
      let mustAttend = 0

      if (totalHeld > 0) {
        if (currentPercent >= targetValue) {
          canBunk = targetValue > 0
            ? Math.max(Math.floor((present * 100 - targetValue * totalHeld) / targetValue), 0)
            : present
        } else if (targetValue >= 100) {
          mustAttend = Infinity
        } else {
          mustAttend = Math.max(Math.ceil((targetValue * totalHeld - 100 * present) / (100 - targetValue)), 0)
        }
      }

      return {
        subjectId: sub.subjectId,
        name: sub.name,
        target,
        totalHeld,
        present,
        absent,
        unrecorded,
        currentPercent: Number(currentPercent.toFixed(2)),
        canBunk,
        mustAttend
      }
    })

    const jsonString = JSON.stringify(result)
    await redisClient.set(REDIS_KEY, jsonString, { EX: 86400 })

    return res.status(200).json({
      success: true,
      message: "Target attendance calculated",
      subjects: result
    })

  } catch (error) {
    console.log(error)
    return res.status(500).json({ success: false, message: "Error at attendance target data" })
  }
}

// * SECION 4 : GRID DATA DISPLAY
export const gridDataDisplayInMonth = async (req, res) => {
  try {
    const userId = req.userId
    const id = req.params.id
    const currentDate = new Date()
    const { month, year = currentDate.getFullYear() } = req.validatedQuery

    const API_NAME = "grid_data"
    const GRID_TIME = `${month}_${year}`
    const REDIS_KEY = `${API_NAME}_${userId}_${id}_${GRID_TIME}`

    const data = await redisClient.get(REDIS_KEY)
    if (data) {
      const result = JSON.parse(data)
      return res.status(200).json({ success: true, ...result })
    }

    const user = await userModel.findById(userId)
    if (!user) { return res.status(400).json({ success: false, message: "User not found!" }) }

    const timetable = await timetableModel.findOne({ _id: id, userId, isActive: true })
    if (!timetable) { return res.status(400).json({ success: false, message: "timetable not found" }) }

    const today = safePlainDateISO(user.timezone)
    const _subjects = timetable.subjects || []

    if (_subjects.length === 0) {
      return res.status(200).json({
        success: true,
        message: "Add classes to see data here",
        userDay: today.toString()
      })
    }

    const monthIndex = Number(month)
    const yearValue = Number(year)
    const monthStartPlain = Temporal.PlainDate.from({ year: yearValue, month: monthIndex + 1, day: 1 })
    const monthEndPlain = monthStartPlain.with({ day: monthStartPlain.daysInMonth })
    const monthStart = plainDateToDate(monthStartPlain)
    const monthEnd = plainDateToDate(monthEndPlain)
    const days = Array.from({ length: monthEndPlain.daysInMonth }, (_, i) => i + 1)

    const _subjectIds = _subjects.map((subject) => subject.subjectId)
    const logs = await attendanceLogModel.find({
      userId,
      subjectId: { $in: _subjectIds },
      date: { $gte: monthStart, $lte: monthEnd }
    }).lean()

    const logMap = new Map()
    for (const log of logs) {
      const dateKey = log.date.toISOString().split('T')[0]
      logMap.set(`${log.subjectId}|${dateKey}`, log)
    }

    const isHoliday = (_plainDate) => false

    const result = _subjects.map((sub) => {
      const cells = days.map((day) => {
        const plainDate = monthStartPlain.with({ day })
        const weekdayIndex = plainDate.dayOfWeek - 1
        const dateKey = plainDate.toString()

        let status
        if (isHoliday(plainDate)) {
          status = "holiday"
        } else if (Temporal.PlainDate.compare(plainDate, today) > 0) {
          status = "future"
        } else if (!(sub.classes || []).includes(weekdayIndex)) {
          status = "not-scheduled"
        } else {
          const log = logMap.get(`${sub.subjectId}|${dateKey}`)
          status = log ? (log.isAttend ? "present" : "absent") : "unrecorded"
        }
        return { date: day, status }
      })
      return {
        subjectId: sub.subjectId,
        name: sub.name,
        cells
      }
    })

    const responsePayload = {
      month: monthIndex,
      year: yearValue,
      userDay: today.toString(),
      days,
      subjects: result,
    }

    await redisClient.set(REDIS_KEY, JSON.stringify(responsePayload), { EX: 86400 })

    return res.status(200).json({
      success: true,
      ...responsePayload
    })

  } catch (error) {
    console.log(error)
    return res.status(500).json({ success: false, message: "Error at attendance Grid data" })
  }
}