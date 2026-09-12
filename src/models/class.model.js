import mongoose from "mongoose";

const schema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    timeTableId: { type: mongoose.Schema.Types.ObjectId, ref: "Timetable", required: true },
    subjectId: { type: String, required: true },
    name: { type: String, required: true },
    startTime: { type: Date, required: true },
    endTime: { type: String, required: true },
    day: { type: String, required: true },
    color: { type: String, required: true },
    notify: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true }
}, { timestamps: true })

schema.index({ userId: 1, day: 1, isActive: 1 })
const classModel = mongoose.model("Class", schema)

export default classModel;