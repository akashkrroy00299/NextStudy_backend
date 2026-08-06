import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true
    },
    theme: {
        type: String,
        default: "LIGHT",
        enum: ["LIGHT", "DARK"],
    },
    notification: {
        isActive: { type: Boolean, default: true },
        silent: { type: Boolean, default: false }
    },
    language: {
        type: String, 
        default: "ENG",
        enum: ["ENG", "SPA", "JAP"]
    },
    timezone: { type: String, default: "Aisa/Kolkata" },
    privacy: {
        type: String,
        enum: ["public", "private"],
        default: "public"
    }
}, { timestamps: true })

const settingsModel = mongoose.model("Settings", settingsSchema )
export default settingsModel