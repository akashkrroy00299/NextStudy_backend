import mongoose from "mongoose";
import { formatDateTimeDDMMYYYY } from "../utils/dateUtil.js";

const sessionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },

    browser: { type: String, required: true },
    diviceId: { type: String, required: true },
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

// Virtual to get formatted datetime as dd.mm.yyyy HH:mm:ss
sessionSchema.virtual("expiresAtFormatted").get(function() {
    return formatDateTimeDDMMYYYY(this.expiresAt);
});

const sessionModel = mongoose.model("Session", sessionSchema)
export default sessionModel