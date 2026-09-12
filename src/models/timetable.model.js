import mongoose from "mongoose";

const schema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    uuid: { type: String, required: true, },
    slug: { type: String, required: true, },
    name: { type: String, required: true },
    verson: { type: Number, required: true },

    isActive: { type: Boolean, default: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, default: null },
    deactivatedAt: { type: Date, default: null },

    subjects: [
        { 
            subjectId: { type: String, required: true },
            name:{ type: String, required: true },
            color: String,
            classes: [             
                { type: Number, min: 0, max: 6, required: true },
            ],
            target: { type: Number, default: 75 },
        }
    ]
}, { timestamps: true })

schema.index({ userId: 1, isActive: 1 })
schema.index({ userId: 1, startDate: 1, endDate: 1 })

const timetableModel = mongoose.model("Timetable", schema)

export default timetableModel;