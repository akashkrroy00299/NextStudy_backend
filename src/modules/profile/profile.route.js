import express from "express"
import { fetchUser, updateUser, updatePassword, sessions, timetables, uploadProfileImg } from "./controllers/profile.controller.js"
import { verifyUser } from "../../middlewares/validateAccToken.js"
import { validateSettingsUpdate, validateUpdatePassword } from "./validations/profile.validation.js"
import { apiReadLimiter, apiWriteLimiter, sensitiveApiLimiter } from "../../middlewares/rateLimiter.js"


const router = express.Router()

// * FETCH USER
router.get("/me", verifyUser, apiReadLimiter, fetchUser)
router.get("/sessions", verifyUser, apiReadLimiter, sessions)
router.get("/timetables", verifyUser, apiReadLimiter, timetables)

router.patch("/update-profile", verifyUser, apiWriteLimiter, validateSettingsUpdate, updateUser)
router.post("/update-password", verifyUser, sensitiveApiLimiter, validateUpdatePassword, updatePassword)
router.post("/profile-img", verifyUser, apiWriteLimiter, uploadProfileImg)

export default router