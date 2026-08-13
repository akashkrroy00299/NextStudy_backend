import mongoose from "mongoose";

const subjectSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },

    semester: {
        type: Number,
        default: 1,
    },

    createdAt: {
        type: Date,
        default: Date.now,
    },

    deletedAt: {
        type: Date,
        default: null,
    },

    isActive: {
        type: Boolean,
        default: true,
    },

    subjects: [
        {
            title: { type: String, required: true },
            subjectId: { type: String, required: true }
        }
    ]
});

const subjectModel = mongoose.model("SubjectsLog", subjectSchema);
export default subjectModel;