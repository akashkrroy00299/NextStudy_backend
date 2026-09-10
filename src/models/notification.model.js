import mongoose from "mongoose";

const schema = new mongoose.Schema({
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

schema.index(
    { createdAt: 1 },
    { expireAfterSeconds: 60 * 60 * 24 * 7 }
)

const notificationModel = mongoose.model("Notification", schema)
export default notificationModel