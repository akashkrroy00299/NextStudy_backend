import express from "express"
import { fatchUser, updateUser, updatePassword, sesstions } from "../controllers/userProfile.controller.js"
import { verifyUser } from "../middlewares/validateAccToken.js"
import { validateSettingsUpdate, velidateUpdatePassword,  } from "../middlewares/validator/updateProfile.val.js"


const router = express.Router()

// * FATCH USER
router.get("/me", verifyUser, fatchUser)
router.get("/sesstions", verifyUser, sesstions)

router.patch("/update-profile", verifyUser, validateSettingsUpdate, updateUser)
router.post("/update-password", verifyUser, velidateUpdatePassword, updatePassword)

export default router