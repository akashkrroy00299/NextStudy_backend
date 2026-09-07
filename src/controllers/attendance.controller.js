import { Temporal } from '@js-temporal/polyfill';
import classModel from "../models/class.model.js"
import classLogModel from '../models/attendanceLog.model.js';
import subjectModel from '../models/subjetcs.model.js';
import { plainDateToDate, formatDateDDMMYYYY } from '../utils/dateUtil.js';

function getWeekdayNumber(plainDate = Temporal.Now.plainDateISO()) {
    return plainDate.dayOfWeek - 1;
}



// * SECTION 02 APIs
// get todays classes
export const todayClasses = async (req, res) => {
    try {
        const userId = req.userId;
        const today = Temporal.Now.plainDateISO();
        const weekdayIndex = getWeekdayNumber(today);
        const todayDate = plainDateToDate(today);

        const classes = await classModel.find({ userId, day: weekdayIndex, isActive: true }).lean();

        const attended = await classLogModel.find({ userId, date: todayDate, isAttend: true });
        const attendedSet = new Set(attended.map(att => att.subjectId.toString()));

        const data = classes.map(cls => ({
            ...cls,
            attended: attendedSet.has(cls.subjectId.toString()),
        }));

        return res.status(200).json({ success: true, data });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, message: "Error at attendance Get data" });
    }
};

// update today attendace
export const updateAttend = async (req, res) => {
    try {
        const userId = req.userId;
        const { subjectId, attended } = req.body;
        const today = Temporal.Now.plainDateISO();
        const date = plainDateToDate(today);

        const cls = await classModel.findOne({ userId, subjectId, isActive: true });
        if (!cls) {
            return res.status(404).json({ success: false, message: "Class not found for this subject" });
        }

        const updatedLog = await classLogModel.findOneAndUpdate(
            { userId, subjectId, date },
            { isAttend: attended, title: cls.title },
            { upsert: true, returnDocument: 'after' }
        );

        return res.status(200).json({
            success: true,
            data: {
                ...updatedLog.toObject(),
                dateFormatted: formatDateDDMMYYYY(updatedLog.date)
            }
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Server Error at addAttend Route"
        });
    }
};


// * SECTION 03 APIs
export const getSubjectAnalythis = async (req, res) => {}


// * SECTION 04 APIs
// get monthly grid data
export const getMonthlyGridData = async (req, res) => {
    try {
        const userId = req.userId
        const { month, year: queryYear } = req.validatedQuery
        const today = Temporal.Now.plainDateISO()
        const year = queryYear ?? today.year

        // * FATCHING SUBJECTS
        const subjectsDoc = await subjectModel.findOne({ userId, isActive: true })
        const subjects = subjectsDoc?.subjects || []
        if (subjects.length === 0) {
            const monthStartPlain = Temporal.PlainDate.from({ year, month: month + 1, day: 1 })
            const days = Array.from({ length: monthStartPlain.daysInMonth }, (_, i) => i + 1)

            return res.status(200).json({
                success: true,
                month,
                year,
                days,
                subjects: []
            })
        }

        // * GENRATING DATES
        const monthStartPlain = Temporal.PlainDate.from({ year, month: month + 1, day: 1 })
        const monthEndPlain = monthStartPlain.with({ day: monthStartPlain.daysInMonth })
        const monthStart = plainDateToDate(monthStartPlain)
        const monthEnd = plainDateToDate(monthEndPlain)

        // * FATCH AND MAPING ALL LOGS BY [SUBJECTID | DATE]
        const logs = await classLogModel.find({
            userId,
            date: { $gte: monthStart, $lte: monthEnd }
        }).lean()

        const logMap = new Map()
        for (const log of logs) {
            const dateKey = log.date.toISOString().split('T')[0]
            logMap.set(`${log.subjectId}|${dateKey}`, log)
        }

        // * HOLIDAY CHECK
        const isHoliday = (plainDate) => { return false }

        // * BUILD GRID
        const days = Array.from({ length: monthEndPlain.daysInMonth }, (_, i) => i + 1)

        const result = subjects.map((subject) => {
            const cells = days.map((day) => {
                const plainDate = monthStartPlain.with({ day })
                const weekdayIndex = plainDate.dayOfWeek - 1
                const dateKey = plainDate.toString()

                let status

                if (isHoliday(plainDate)) {
                    status = "holiday"
                } else if (Temporal.PlainDate.compare(plainDate, today) > 0) {
                    status = "future"
                } else if (!subject.dayOfWeek.includes(weekdayIndex)) {
                    status = "not-scheduled"
                } else {
                    const log = logMap.get(`${subject.subjectId}|${dateKey}`)
                    status = log?.isAttend ? "present" : "absent"
                }

                return { date: day, status }
            })

            return {
                subjectId: subject.subjectId,
                title: subject.title,
                cells
            }
        })

        return res.status(200).json({
            success: true,
            month,
            year,
            days,
            subjects: result,
        })

    } catch (error) {
        console.log(error)
        return res.status(500).json({
            success: false,
            message: "Server Error At Get Monthly Grid Data"
        })
    }
}


// get weekly grid data
export const getWeeklyGridData = async (req, res) => {}