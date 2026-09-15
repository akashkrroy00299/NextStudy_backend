import express from "express"
import {
    getNotifications,
    setSeenNotification,
    setDeletedNotification,
    pushAppUpdateNotification
} from "./controllers/notification.controller.js";
import { verifyUser, isAdmin } from "../../middlewares/validateAccToken.js"
import { validateObjectId } from "../../middlewares/validateObjectId.js"
import { globalNotificationValidation } from "./validations/globalNotification.validation.js"


const router = express.Router()

router.get("/", verifyUser, getNotifications)
router.patch("/:id/seen", verifyUser, validateObjectId("id"), setSeenNotification)
router.patch("/:id/delete", verifyUser, validateObjectId("id"), setDeletedNotification)
router.post("/global/push", verifyUser, isAdmin, globalNotificationValidation, pushAppUpdateNotification)

export default router