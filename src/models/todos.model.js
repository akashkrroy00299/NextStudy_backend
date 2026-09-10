import mongoose from "mongoose";

const schema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },

    title: { type: String, required: true },
    isCompleted: { type: Boolean, default: false },
    isExpaired: { type: Boolean, default: false },
    status: { type: String, enum: ['pending', 'completed', 'expaired'], default: 'pending' },
    dueDate: { type: Date, required: true },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    category: { type: String, required: true }
}, { timestamps: true });

schema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });
schema.index({ isCompleted: 1, isExpaired: 1, dueDate: 1, userId: 1 });

const todoModel = mongoose.model('todos', schema);
export default todoModel;