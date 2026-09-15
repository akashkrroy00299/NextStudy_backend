import mongoose from "mongoose";

const schema = new mongoose.Schema({
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ['system', 'announcement'], default: 'announcement' },

    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    dismissedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true })

schema.index({ createdAt: -1 })

const globalNotificationModel = mongoose.model('globalNotifications', schema);
export default globalNotificationModel;