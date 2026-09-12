import express from "express";
import { 
    createTimeTable,
    fatchTimetable,
    updateTimetable,
    updateClasses,
    slugToCopyTimeTable
} from "../controllers/attV2.controller.js"

import {
    todayClasses,
    toggleAttended,
    tagerAttendance,
    gridDataDisplayInMonth
} from "../controllers/attV2_analy.controller.js"

import {
    create_timetable_schema,
    update_timetable_schema,
    update_classes_schema,
    copy_timetable_schema,
    validator
} from "../middlewares/validator/timetable.validation.js";
import { verifyUser } from "../middlewares/validateAccToken.js"
import { dateValidation } from "../middlewares/validator/dateValidation.js"
import { apiReadLimiter, apiWriteLimiter } from "../middlewares/rateLimitter.js"


const router = express.Router()

//* SECTION 01 - TIMETABLE
router.post("/", verifyUser, apiWriteLimiter, validator(create_timetable_schema), createTimeTable)
router.get("/:id", verifyUser, apiReadLimiter, fatchTimetable)

router.patch("/:id", verifyUser, apiWriteLimiter, validator(update_timetable_schema), updateTimetable)
router.patch("/:id/classes", verifyUser, apiWriteLimiter, validator(update_classes_schema), updateClasses)

router.post("/:slug", verifyUser, apiWriteLimiter, validator(copy_timetable_schema), slugToCopyTimeTable)

//* SECTION 02 - ALALYTHICS

router.get("/:id/today", verifyUser, apiReadLimiter, todayClasses)
router.patch("/:ttId/classes/:clsId/toggle", verifyUser, apiWriteLimiter, toggleAttended)
router.get("/:id/target", verifyUser, apiReadLimiter, tagerAttendance)
router.get("/:id/grid", verifyUser, apiReadLimiter, dateValidation, gridDataDisplayInMonth)

export default router