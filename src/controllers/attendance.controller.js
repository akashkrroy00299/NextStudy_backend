import { Temporal } from '@js-temporal/polyfill';
import classModel from "../models/class.model.js"
import classLogModel from '../models/classLog.model.js';
import { success } from 'zod';
import userModel from '../models/user.model.js';
import subjectModel from '../models/subjetcs.model.js';
import { plainDateToDate, formatDateDDMMYYYY } from '../utils/dateUtil.js';

function getWeekdayNumber(plainDate = Temporal.Now.plainDateISO()) {
    return plainDate.dayOfWeek - 1;
}

function groupBySubject(classes) {
  const subjectMap = new Map();

  for (const cls of classes) {
    const id = cls.subjectId.toString();

    if (!subjectMap.has(id)) {
      subjectMap.set(id, {
        subjectId: id,
        title: cls.title,
        classes: [],
      });
    }

    subjectMap.get(id).classes.push(cls.day);
  }

  return Array.from(subjectMap.values());
}

export const attendanceData = async (req, res) => {
    try {
        const userId = req.userId;
        const today = Temporal.Now.plainDateISO();
        const weekdayIndex = getWeekdayNumber(today);
        const todayDate = plainDateToDate(today);

        const classes = await classModel.find({ userId, day: weekdayIndex, isActive: true }).lean();
        if (classes.length === 0) {
            return res.status(400).json({ success: false, message: "No Data" });
        }

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

export const updateAttend = async (req, res) => {
    try {
        const userId = req.userId;
        const { subjectId, attended } = req.body;
        const today = Temporal.Now.plainDateISO();
        const date = plainDateToDate(today);

        const updatedLog = await classLogModel.findOneAndUpdate(
            { userId, subjectId, date },
            { isAttend: attended },
            { upsert: true, new: true }
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

export const getAnalytics = async (req, res) => {
    try {
        const today = Temporal.Now.plainDateISO();
        const weekdayIndex = getWeekdayNumber(today);

        const user = await userModel.findById(req.userId)
        if(!user){ return res.status(404).json({ success: false, message: "User not found" })}
        const semester = user.semester
        const subjectsLogs = await subjectModel.find({ userId: req.userId, semester})

        for(const subjects of subjectsLogs){
            const createdAt = subjects.createdAt
            let deletedAt = subjects.deletedAt
            if(deletedAt === null){
                deletedAt = Date.now()
            }
            
        }
    } catch (error) {
        console.log(error)
        return res.status(500).json({ success: false, message: "Server Error at getAnalytics Route" })
    }
}