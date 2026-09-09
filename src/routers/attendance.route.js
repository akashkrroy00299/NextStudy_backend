import express from "express";
import { updateTimetable, getClasses, getSubjects } from "../controllers/timeTable.controller.js";
import { updateClassesValidation, attendanceValidation, schema } from "../middlewares/validator/classes.validation.js"
import { dateValidation } from "../middlewares/validator/dateValidation.js"
import { verifyUser } from "../middlewares/validateAccToken.js"
import { updateAttend, todayClasses, getMonthlyGridData } from "../controllers/attendance.controller.js"
import { apiReadLimiter, apiWriteLimiter } from "../middlewares/rateLimitter.js"


const router = express.Router()

//* SECTION 01 - TIMETABLE
// update 
router.put("/update-timetable", verifyUser, apiWriteLimiter, updateClassesValidation(schema), updateTimetable)
// data fatch route
router.get("/classes-data", verifyUser, apiReadLimiter, getClasses)
router.get("/subjects-data", verifyUser, apiReadLimiter, getSubjects)


//* SECTION 02 - TODAY CLASSES
// data fatch routes
router.get("/attendance-data", verifyUser, apiReadLimiter, todayClasses)
// update att (subjectId, bool) by today
router.post("/update-attendace", verifyUser, apiWriteLimiter, attendanceValidation, updateAttend)


//* SECTION 03 - ANALYTHICS PAR SUBJECT
// analythics
// router.get("/attendance-par-subjects")

//* SECTION 04 - ANALYTHICS GRID
router.get("/monthly-grid", verifyUser, apiReadLimiter, dateValidation, getMonthlyGridData)

export default router