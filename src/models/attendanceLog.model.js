import mongoose from "mongoose";

const schema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        classId: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
        subjectId: { type: String, required: true },
        date: { type: Date, required: true },
        isAttend: { type: Boolean, default: true },

    },
    {
        timestamps: true,
    }
);

schema.index(
    { userId: 1, classId: 1, date: 1 },
    { unique: true }
);

schema.index(
    { userId: 1, subjectId: 1, date: 1 }
);

schema.index({ userId: 1, date: 1 });

schema.index({ classId: 1, date: 1 });

const attendanceLogModel = mongoose.model(
    "AttendanceLog",
    schema
);

export default attendanceLogModel;