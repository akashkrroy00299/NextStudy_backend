import mongoose from "mongoose";
import { formatDateDDMMYYYY } from "../utils/dateUtil.js";

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    isVerified: { type: Boolean, default: false },

    description: { type: String },
    profileImg: {
        url: { type: String, default: "" },
        publicId: { type: String, default: "" }
    },
    settingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Settings",
    },

    // optional
    collegeName: { type: String },
    course: { type: String },
    branch: { type: String },
    semester: { type: Number },
    semStart: { type: Date, default: Date.now },
    address: { type: String },
    
}, { timestamps: true })

userSchema.virtual("semStartFormatted").get(function() {
    return formatDateDDMMYYYY(this.semStart);
});

const userModel = mongoose.model("User", userSchema)
export default userModel