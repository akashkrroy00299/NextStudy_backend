import express from "express"
import {
    getNotifications,
    setSeenNotification,
    setDetetedNotification
} from "../controllers/notification.controller.js";
import { verifyUser } from "../middlewares/validateAccToken.js"


const router = express.Router()

router.get("/", verifyUser, getNotifications)
router.patch("/:id/seen", verifyUser, setSeenNotification)
router.patch("/:id/delete", verifyUser, setDetetedNotification)

export default router