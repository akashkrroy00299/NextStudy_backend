import mongoose from "mongoose";

const schema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },

    title: { type: String, required: true },
    isCompleted: { type: Boolean, default: false },
    isExpired: { type: Boolean, default: false },
    status: { type: String, enum: ['pending', 'completed', 'expired'], default: 'pending' },
    dueDate: { type: Date, required: true },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    category: { type: String, required: true }
}, { timestamps: true });

schema.index({ userId: 1, isCompleted: 1, isExpired: 1, dueDate: 1 });

const todoModel = mongoose.model('todos', schema);
export default todoModel;