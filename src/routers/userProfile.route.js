import express from "express"
import { fatchUser, updateUser, updatePassword, sesstions, timetables } from "../controllers/userProfile.controller.js"
import { verifyUser } from "../middlewares/validateAccToken.js"
import { validateSettingsUpdate, velidateUpdatePassword,  } from "../middlewares/validator/updateProfile.val.js"
import { apiReadLimiter, apiWriteLimiter, sensitiveApiLimiter } from "../middlewares/rateLimitter.js"


const router = express.Router()

// * FATCH USER
router.get("/me", verifyUser, apiReadLimiter, fatchUser)
router.get("/sesstions", verifyUser, apiReadLimiter, sesstions)
router.get("/timetables", verifyUser, apiReadLimiter, timetables)

router.patch("/update-profile", verifyUser, apiWriteLimiter, validateSettingsUpdate, updateUser)
router.post("/update-password", verifyUser, sensitiveApiLimiter, velidateUpdatePassword, updatePassword)

export default router