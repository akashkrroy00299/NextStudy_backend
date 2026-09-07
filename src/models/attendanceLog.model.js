import mongoose from "mongoose";
import { formatDateDDMMYYYY } from "../utils/dateUtil.js";

const classLogSchema = new mongoose.Schema({
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
    },

    date: {
        type: Date,
        required: true,
    },

    isAttend: {
        type: Boolean,
        default: true,
    },

} , { timestamps: true })

// Virtual to get formatted date as dd.mm.yyyy
classLogSchema.virtual("dateFormatted").get(function() {
    return formatDateDDMMYYYY(this.date);
});

const classLogModel = mongoose.model("ClassLog", classLogSchema)
export default classLogModel;