import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },

    type: {
        type: String,
        required: true,
        enum: ["timetable", "class", "todo", "event", "habit", "system", "announcement", "user"],
    },

    title: {
        type: String,
        required: true,
    },

    message: {
        type: String,
        required: true,
    },

    isRead: {
        type: Boolean,
        default: false
    },

    notificationKey: {
        type: String,
        required: true,
        unique: true
    },

    status: {
        type: String,
        enum: ["pending", "sent", "failed"],
        default: "pending",
    }

}, { timestamps: true })

const notificationModel = mongoose.model("Notification", notificationSchema)
export default notificationModel