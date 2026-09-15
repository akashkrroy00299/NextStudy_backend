import mongoose from "mongoose";

const otpSchema = new mongoose.Schema({
    email: {type: String, required: true, unique: true},
    otp: {type: String, required: true},
    purpose: {
        type: String,
        required: true,
        enum: ["register", "reset-password", "login"]
    },
    attempts: { type: Number, required: true, default: 0},
    expAt: {type: Date, required: true}
}, { timestamps: true })

otpSchema.index({ expAt: 1 }, { expireAfterSeconds: 0 })

const otpModel = mongoose.model("Otp", otpSchema)
export default otpModel