import mongoose from "mongoose";

const classSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },

    subjectId: {
        type: String,
        required: true,
    },

    title: {
        type: String,
        required: true,
        trim: true,
    },

    color : {
        type: String,
        required: true,
    },

    notify: {
        type: Boolean,
        default: false,
    },

    day: {
        type: Number,
        default: 0,
    },

    start: {
        type: Number,
        default: 8 * 60,
    },

    end: {
        type: Number,
        default: 8 * 60 + 60,
    },

    isActive: {
        type: Boolean,
        default: true,
    }

} , { timestamps: true })

const classModel = mongoose.model("Class", classSchema)
export default classModel;