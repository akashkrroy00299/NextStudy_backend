import mongoose from "mongoose";
import { formatDateTimeDDMMYYYY } from "../utils/dateUtil.js";

const otpSchema = new mongoose.Schema({
    email: {type: String, required: true, unique: true},
    otp: {type: String, required: true},
    purpose: {
        type: String,
        required: true,
        enum: ["register", "reset-password"]
    },
    attempts: { type: Number, required: true, default: 0},
    expAt: {type: Date, required: true}
}, { timestamps: true })

// Virtual to get formatted datetime as dd.mm.yyyy HH:mm:ss
otpSchema.virtual("expAtFormatted").get(function() {
    return formatDateTimeDDMMYYYY(this.expAt);
});

const otpModel = mongoose.model("Otp", otpSchema)
export default otpModel