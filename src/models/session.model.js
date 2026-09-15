import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },

    browser: { type: String, required: true },
    deviceId: { type: String, required: true },
    location: { type: String, required: true },
    lastTime: { type: Date, required: true },
    os: { type: String, required: true },

    refreshTokenHash: {type: String, required: true},
    previousRefreshTokenHash: { type: String, default: null },
    previousTokenExpiresAt: { type: Date, default: null },

    userAgent:{ type: String, required: true},
    ipAddress: { type: String, required: true},

    expiresAt: { type: Date, required: true},
    revoked: { type: Boolean, default: false}
}, { timestamps: true })

sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
sessionSchema.index({ refreshTokenHash: 1 })

const sessionModel = mongoose.model("Session", sessionSchema)
export default sessionModel