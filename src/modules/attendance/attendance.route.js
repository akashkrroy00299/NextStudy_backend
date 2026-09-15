import express from "express";
import {
    createTimeTable,
    fetchTimetable,
    selectTimetable,
    updateTimetable,
    updateVisibility,
    updateClasses,
    slugToCopyTimeTable,
    deleteTimetable
} from "./controllers/timetable.controller.js"

import {
    todayClasses,
    toggleAttended,
    targetAttendance,
    gridDataDisplayInMonth
} from "./controllers/attendance.controller.js"

import {
    create_timetable_schema,
    update_timetable_schema,
    update_classes_schema,
    copy_timetable_schema,
    update_visibility_schema,
    validator
} from "./validations/timetable.validation.js";
import { verifyUser } from "../../middlewares/validateAccToken.js"
import { validateObjectId } from "../../middlewares/validateObjectId.js"
import { dateValidation } from "./validations/date.validation.js"
import { apiReadLimiter, apiWriteLimiter } from "../../middlewares/rateLimiter.js"


const router = express.Router()

//* SECTION 01 - TIMETABLE
router.post("/", verifyUser, apiWriteLimiter, validator(create_timetable_schema), createTimeTable)
router.get("/:id", verifyUser, apiReadLimiter, validateObjectId("id"), fetchTimetable)

router.patch("/:id", verifyUser, apiWriteLimiter, validateObjectId("id"), validator(update_timetable_schema), updateTimetable)
router.patch("/:id/select", verifyUser, apiWriteLimiter, validateObjectId("id"), selectTimetable)
router.patch("/:id/visibility", verifyUser, apiWriteLimiter, validateObjectId("id"), validator(update_visibility_schema), updateVisibility)
router.delete("/:id", verifyUser, apiWriteLimiter, validateObjectId("id"), deleteTimetable)
router.patch("/:id/classes", verifyUser, apiWriteLimiter, validateObjectId("id"), validator(update_classes_schema), updateClasses)

router.post("/:slug", verifyUser, apiWriteLimiter, validator(copy_timetable_schema), slugToCopyTimeTable)

//* SECTION 02 - ALALYTHICS

router.get("/:id/today", verifyUser, apiReadLimiter, validateObjectId("id"), todayClasses)
router.patch("/:ttId/classes/:clsId/toggle", verifyUser, apiWriteLimiter, validateObjectId("ttId"), validateObjectId("clsId"), toggleAttended)
router.get("/:id/target", verifyUser, apiReadLimiter, validateObjectId("id"), targetAttendance)
router.get("/:id/grid", verifyUser, apiReadLimiter, validateObjectId("id"), dateValidation, gridDataDisplayInMonth)

export default router