import express from "express"
import { fetchDashboard, totalAttendance, last7dayTodo } from "./controllers/dashboard.controller.js"
import { verifyUser } from "../../middlewares/validateAccToken.js"
import { apiReadLimiter } from "../../middlewares/rateLimiter.js"

const router = express.Router()

router.get("/", verifyUser, apiReadLimiter, fetchDashboard)
router.get("/total-attendance", verifyUser, apiReadLimiter, totalAttendance)
router.get("/last-week-todos", verifyUser, apiReadLimiter, last7dayTodo)

export default router