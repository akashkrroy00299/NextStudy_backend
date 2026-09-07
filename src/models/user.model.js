import mongoose from "mongoose";
import { formatDateDDMMYYYY } from "../utils/dateUtil.js";

const userSchema = new mongoose.Schema({

    // * BASIC DATA
    username: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    timezon: { type: String, default: 'Aisa/Kolkata' },
    isVerified: { type: Boolean, default: false },
    verificationExpiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 24 * 60 * 60 * 1000)
    },

    // * OPTIONAL DATA
    description: { type: String },
    profileImg: {
        url: { type: String, default: "" },
        publicId: { type: String, default: "" }
    },

    // * SETING MODEL CONNECT
    settingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Settings",
    },

    // * TODOS STACK
    TodoStreak: {
        current: { type: Number, default: 0 },
        longest: { type: Number, default: 0 },
        lastActiveDate: { type: String, default: null },
        freezesAvailable: { type: Number, default: 1 },
        freezesUsedDates: [{ type: String }]
    }

}, { timestamps: true })

// * EXPIAR TO DELETE
userSchema.index(
    { verificationExpiresAt: 1 },
    {
        expireAfterSeconds: 0,
        partialFilterExpression: {
            isVerified: false
        }
    }
);

const userModel = mongoose.model("User", userSchema)
export default userModel