import notificationModel from "../models/notification.model.js"

const getNotifications = async (req, res) => {
    try {
        const userId = req.userId
        const notifications = await notificationModel.find({ userId }).sort({ createdAt: -1 }).limit(100)
        const unreadCount = await notificationModel.countDocuments({ userId, isRead: false })

        return res.status(200).json({
            success: true,
            message: "Notification Fatched!",
            notifications,
            unreadCount
        })
    } catch (error) {
        console.log(error)
        return res.status(500).json({
            success: false,
            message: "Server Error at Notification Fatch route"
        })
    }
}