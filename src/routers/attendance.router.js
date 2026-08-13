import express from "express";
import { updateSubjetcs } from "../controllers/subjects.controller.js";
import { updateTimetable } from "../controllers/classes.controller.js";
import { updateClassesValidation, updateSubjectsValidation, attendanceValidation } from "../middlewares/validator/classes.validation.js"
import { verifyUser } from "../middlewares/validateAccToken.js"
import { updateAttend, attendanceData } from "../controllers/attendance.controller.js"


const router = express.Router()

// attendance update methoda
router.post("/update-classes", verifyUser, updateClassesValidation, updateTimetable)
router.post("/update-subjects", verifyUser, updateSubjectsValidation, updateSubjetcs)

// data fatch routes
router.get("/attendance-data", verifyUser, attendanceData)
router.post("/update-attendace", verifyUser, attendanceValidation, updateAttend)

// analythics
router.get("/attendance-analytics", verifyUser)

export default router