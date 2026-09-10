import notificationModel from "../models/notification.model.js"
import globalNotificationModel from "../models/globalNotification.model.js"
import settingsModel from "../models/notification.model.js"

export const getNotifications = async (req, res) => {
    try {
        const userId = req.userId
        const settings = await settingsModel.findOne({ userId })
        if (!settings) { return res.status(200).json({ success: false, message: "setting not found" }) }
        let defultType = ["timetable", "system", "announcement", "user"]

        if (settings.attendanceReminder) { defultType.push('class') }
        if (settings.todoReminder) { defultType.push('todo') }

        const [personal, personalUnreadCount, global] = await Promise.all([
            notificationModel
                .find({
                    userId,
                    type: { $in: defultType }
                })
                .sort({ createdAt: -1 })
                .limit(100)
                .lean(),

            notificationModel.countDocuments({
                userId,
                isRead: false,
                type: { $in: defultType }
            }),

            globalNotificationModel
                .find({ dismissedBy: { $ne: userId } })
                .sort({ createdAt: -1 })
                .limit(100)
                .lean()
        ])

        let globalUnreadCount = 0;
        const globalWithReadStatus = global.map((n) => {
            const isRead = n.readBy.some((id) => id.toString() === userId.toString());
            if (!isRead) globalUnreadCount++;

            return {
                _id: n._id,
                type: n.type,
                title: n.title,
                message: n.message,
                createdAt: n.createdAt,
                isRead,
                isGlobal: true
            };
        })

        const notifications = [...personal, ...globalWithReadStatus]
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 100);

        return res.status(200).json({
            success: true,
            message: "Notification Fatched!",
            notifications,
            unreadCount: personalUnreadCount + globalUnreadCount
        })
    } catch (error) {
        console.log(error)
        return res.status(500).json({
            success: false,
            message: "Server Error at Notification Fatch route"
        })
    }
}

export const setSeenNotification = async (req, res) => {
    try {
        const userId = req.userId
        const { id } = req.params
        if (!id) { return res.status(400).json({ success: false, message: "id Required!" }) }

        const personal = await notificationModel.findOneAndUpdate(
            { _id: id, userId },
            { isRead: true }
        )

        if (personal) {
            return res.status(200).json({ success: true, message: "Marked as seen" })
        }

        const globalDoc = await globalNotificationModel.findByIdAndUpdate(
            id,
            { $addToSet: { readBy: userId } }
        )

        if (globalDoc) {
            return res.status(200).json({ success: true, message: "Marked as seen" });
        }

        return res.status(404).json({ success: false, message: "Notification not found" })

    } catch (error) {
        console.log(error)
        return res.status(500).json({
            success: false,
            message: "Server Error at Seen Notification Route"
        })
    }
}

export const setDetetedNotification = async (req, res) => {
    try {
        const userId = req.userId
        const { id } = req.params
        if (!id) { return res.status(400).json({ success: false, message: "id Required!" }) }

        const personal = await notificationModel.findOneAndDelete({ _id: id, userId })
        if (personal) {
            return res.status(200).json({ success: true, message: "Deleted" });
        }

        const globalDoc = await globalNotificationModel.findByIdAndUpdate(
            id,
            { $addToSet: { dismissedBy: userId } }
        )

        if (globalDoc) {
            return res.status(200).json({ success: true, message: "Deleted" });
        }

        return res.status(404).json({ success: false, message: "Notification not found" })

    } catch (error) {
        console.log(error)
        return res.status(500).json({
            success: false,
            message: "Server Error at Delete Notification Route"
        })
    }
}

export const pushAppUpdateNotification = async (req, res) => {
    try {
        const adminId = req.adminId
        const { title, message, type = "announcement" } = req.body

        const notification = await globalNotificationModel.create({ title, message, type, createdBy: adminId })

        return res.status(201).json({
            success: true,
            message: `Notification created!, id: ${notification._id}`
        })
    } catch (error) {
        console.log(error)
        return res.status(500).json({
            success: false,
            message: "Server Error at Globale Notification Route"
        })
    }
}