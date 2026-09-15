import { Temporal } from "@js-temporal/polyfill"
import { plainDateToDate, safePlainDateISO } from "../../../utils/dateUtil.js"
import timetableModel from "../../../models/timetable.model.js"
import userModel from "../../../models/user.model.js"
import todoModel from "../../../models/todos.model.js"
import attendanceLogModel from "../../../models/attendanceLog.model.js"
import { KEYS, cacheGet, cacheSet } from "../../../lib/cache.js"
import classModel from "../../../models/class.model.js"
import mongoose from "mongoose";


const MESSAGE = {
    serverErr: "Server Error in Fetch Dashboard data Route",
    userErr: "User not found!",
    noidErr: "Any timetable not created yet",
    noSubErr: "Add subjects to see attendance data",
    timetableNotFound: "Timetable not found",
    redisMss: "fetch from redis",
}

const dateAtUserMidnight = (plainDate, timezone) => (
    new Date(
        plainDate
            .toZonedDateTime({
                timeZone: timezone,
                plainTime: Temporal.PlainTime.from("00:00")
            })
            .toInstant()
            .epochMilliseconds
    )
)

export const fetchDashboard = async (req, res) => {
    try {
        const userId = req.userId
        const user = await userModel.findById(userId).lean()

        if (!user) {
            return res.status(400).json({ success: false, message: MESSAGE.userErr })
        }

        const today = safePlainDateISO(user.timezone)
        const tomorrow = today.add({ days: 1 })
        const nextSevenDays = today.add({ days: 7 })
        const timetable = user.activeTimetableId
            ? await timetableModel.findOne({
                _id: user.activeTimetableId,
                userId,
                isActive: true
            }).lean()
            : null

        let todayClasses = []
        if (timetable) {
            const timetableStart = Temporal.PlainDate.from(timetable.startDate.toISOString().split("T")[0])
            const timetableEnd = timetable.endDate
                ? Temporal.PlainDate.from(timetable.endDate.toISOString().split("T")[0])
                : null
            const isWithinTimetable = Temporal.PlainDate.compare(today, timetableStart) >= 0
                && (!timetableEnd || Temporal.PlainDate.compare(today, timetableEnd) <= 0)

            if (isWithinTimetable) {
                const classes = await classModel.find({
                    userId,
                    timeTableId: timetable._id,
                    day: today.dayOfWeek - 1,
                    isActive: true
                }).lean()

                const attendanceLogs = await attendanceLogModel.find({
                    userId,
                    classId: { $in: classes.map((classDoc) => classDoc._id) },
                    date: {
                        $gte: plainDateToDate(today),
                        $lt: plainDateToDate(tomorrow)
                    },
                    isAttend: true
                }).select("classId").lean()

                const attendedClassIds = new Set(
                    attendanceLogs.map((attendanceLog) => attendanceLog.classId.toString())
                )

                todayClasses = classes
                    .filter((classDoc) => !attendedClassIds.has(classDoc._id.toString()))
                    .map((classDoc) => ({ ...classDoc, attended: false }))
                    .sort((left, right) => left.startTime.localeCompare(right.startTime))
            }
        }

        const priorityRank = { high: 0, medium: 1, low: 2 }
        const todoStart = dateAtUserMidnight(today, user.timezone)
        const todoEnd = dateAtUserMidnight(nextSevenDays.add({ days: 1 }), user.timezone)
        const upcomingTodos = await todoModel.find({
            userId,
            dueDate: {
                $gte: todoStart,
                $lt: todoEnd
            },
            isCompleted: false,
            isExpired: false
        }).lean()

        upcomingTodos.sort((left, right) => {
            const priorityDifference = (priorityRank[left.priority] ?? 1) - (priorityRank[right.priority] ?? 1)
            if (priorityDifference !== 0) return priorityDifference
            return new Date(left.dueDate) - new Date(right.dueDate)
        })

        const result = {
            todayClasses,
            upcomingTodos: upcomingTodos.slice(0, 4)
        }

        return res.status(200).json({
            success: true,
            message: "Dashboard data fetched successfully",
            result
        })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ success: false, message: MESSAGE.serverErr })
    }
}

export const totalAttendance = async (req, res) => {
    try {
        const userId = req.userId

        const user = await userModel.findById(userId)
        if (!user) {
            return res.status(400).json({ success: false, message: MESSAGE.userErr })
        }

        const id = user.activeTimetableId
        if (!id) {
            return res.status(400).json({ success: false, message: MESSAGE.noidErr })
        }

        const API_NAME = "total_dashbord"
        const REDIS_KEY = KEYS.totalDashbord(userId, id)

        const data = await cacheGet(REDIS_KEY)
        if (data) {
            const result = JSON.parse(data)
            return res.status(200).json({ success: true, message: MESSAGE.redisMss, result })
        }

        const timetable = await timetableModel.findOne({ _id: id, userId, isActive: true })
        if (!timetable) {
            return res.status(400).json({ success: false, message: MESSAGE.timetableNotFound })
        }

        const _subjects = timetable.subjects || []
        if (_subjects.length === 0) {
            return res.status(200).json({ success: true, message: MESSAGE.noSubErr })
        }

        const today = safePlainDateISO(user.timezone)
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
            date: { $gte: timetable.startDate, $lte: plainDateToDate(lastCounted) },
            isAttend: true
        }).lean()

        const presentCountBySubject = new Map()
        for (const log of logs) {
            presentCountBySubject.set(
                log.subjectId,
                (presentCountBySubject.get(log.subjectId) || 0) + 1
            )
        }

        let totalClasses = 0
        let totalAttended = 0

        for (const sub of _subjects) {
            totalClasses += totalHeldBySubject.get(sub.subjectId) || 0
            totalAttended += presentCountBySubject.get(sub.subjectId) || 0
        }

        const overallPercent = totalClasses > 0 ? Number(((totalAttended / totalClasses) * 100).toFixed(2)) : 0

        const result = { totalClasses, totalAttended, overallPercent }

        const jsonString = JSON.stringify(result)
        await cacheSet(REDIS_KEY, jsonString)

        return res.status(200).json({
            success: true,
            message: "Total attendance calculated",
            result
        })

    } catch (error) {
        console.log(error)
        return res.status(500).json({ success: false, message: MESSAGE.serverErr })
    }
}

export const last7dayTodo = async (req, res) => {
    try {
        const userId = req.userId

        const API_NAME = "todos_dashbord"
        const REDIS_KEY = KEYS.todosDashbord(userId)

        const data = await cacheGet(REDIS_KEY)
        if (data) {
            const result = JSON.parse(data)
            return res.status(200).json({ success: true, message: MESSAGE.redisMss, result })
        }

        const user = await userModel.findById(userId)
        if (!user) {
            return res.status(400).json({ success: false, message: MESSAGE.userErr })
        }

        const today = safePlainDateISO(user.timezone)
        const startOfWeek = today.subtract({ days: today.dayOfWeek - 1 })
        const tomorrow = today.add({ days: 1 })

        const dateFilter = {
            $gte: plainDateToDate(startOfWeek),
            $lt: plainDateToDate(tomorrow)
        }

        const [stats] = await todoModel.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(userId), createdAt: dateFilter } },
            {
                $facet: {
                    total: [{ $count: "count" }],
                    completed: [{ $match: { isCompleted: true } }, { $count: "count" }]
                }
            }
        ])

        const totalTodos = stats?.total?.[0]?.count || 0
        const completedTodos = stats?.completed?.[0]?.count || 0
        const result = { totalTodos, completedTodos }

        const jsonString = JSON.stringify(result)
        await cacheSet(REDIS_KEY, jsonString)

        return res.status(200).json({ success: true, result })

    } catch (error) {
        console.log(error)
        return res.status(500).json({ success: false, message: MESSAGE.serverErr })
    }
}