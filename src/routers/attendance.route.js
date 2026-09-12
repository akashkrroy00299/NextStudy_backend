import express from "express";
import { 
    createTimeTable,
    fatchTimetable,
    updateTimetable,
    updateClasses,
    slugToCopyTimeTable
} from "../controllers/attV2.controller.js"

import {
    create_timetable_schema,
    update_timetable_schema,
    update_classes_schema,
    validator
} from "../middlewares/validator/timetable.validation.js";
import { verifyUser } from "../middlewares/validateAccToken.js"
import { apiReadLimiter, apiWriteLimiter } from "../middlewares/rateLimitter.js"


const router = express.Router()

//* SECTION 01 - TIMETABLE
router.post("/", verifyUser, apiWriteLimiter, validator(create_timetable_schema), createTimeTable)
router.get("/:id", verifyUser, apiReadLimiter, fatchTimetable)

router.patch("/:id", verifyUser, apiWriteLimiter, validator(update_timetable_schema), updateTimetable)
router.patch("/:id/classes", verifyUser, apiWriteLimiter, validator(update_classes_schema), updateClasses)

router.post("/:slug", verifyUser, apiWriteLimiter, slugToCopyTimeTable)

export default router