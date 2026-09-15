import todoModel from "../../../models/todos.model.js";
import userModel from "../../../models/user.model.js";
import mongoose from "mongoose";
import { KEYS, cacheDel } from "../../../lib/cache.js";
import { safePlainDateISO, plainDateToDate } from "../../../utils/dateUtil.js";

// * UTILITY
const thirtyDaysAgo = new Date()
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

const isValidTodoId = (id) => mongoose.Types.ObjectId.isValid(id);

const invalidateDashbord = (userId) => cacheDel(KEYS.todosDashbord(userId));

const dayBoundsForUser = async (userId) => {
    const user = await userModel.findById(userId).select("timezone")
    const today = safePlainDateISO(user?.timezone)
    return {
        startOfToday: plainDateToDate(today),
        endOfToday: plainDateToDate(today.add({ days: 1 }))
    }
}


// * FUNCTIONS
export const createTodo = async (req, res) => {
    try {
        const userId = req.userId;
        let { title, dueDate, priority, category } = req.validatedBody;

        if (!title) {
            return res.status(400).json({
                success: false,
                message: "Title is required"
            });
        }

        if (!category) category = "Personal";
        if (!priority) priority = "medium";
        if (!dueDate) {
            dueDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
        }

        const todo = await todoModel.create({
            userId,
            title,
            dueDate,
            priority,
            category
        });

        await invalidateDashbord(userId);

        return res.status(201).json({
            success: true,
            message: "Todo Created!",
            todo
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Server Error at create todo Route"
        });
    }
}

export const fetchTodos = async (req, res) => {
    try {
        const userId = req.userId;

        const { startOfToday, endOfToday } = await dayBoundsForUser(userId);

        const [today, upcoming, completed, expired] = await Promise.all([
            todoModel.find({
                userId,
                dueDate: { $gte: startOfToday, $lt: endOfToday },
                isCompleted: false,
                isExpired: false
            }),

            todoModel.find({
                userId,
                dueDate: { $gte: endOfToday },
                isCompleted: false,
                isExpired: false
            }),

            todoModel.find({
                userId,
                isCompleted: true
            }).sort({ updatedAt: -1 }).limit(10),

            todoModel.find({
                userId,
                isExpired: true
            }).sort({ dueDate: -1 }).limit(10)
        ]);

        return res.status(200).json({
            success: true,
            message: "Todos fetched successfully",
            today,
            upcoming,
            completed,
            expired
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Server error at fetch todos route"
        });
    }
};

export const fetchTodo = async (req, res) => {
    try {
        const userId = req.userId;
        const { id } = req.params;

        if (!isValidTodoId(id)) {
            return res.status(400).json({ message: 'id required', success: false });
        }

        const todo = await todoModel.findOne({ userId, _id: id });
        if (!todo) {
            return res.status(404).json({
                message: 'Todo not found',
                success: false
            });
        }

        return res.status(200).json({
            success: true,
            message: "Todo fetched",
            todo
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Server Error at fetch todo Route"
        });
    }
};


export const updateTodo = async (req, res) => {
    try {
        const userId = req.userId;
        const { id } = req.params;
        const { title, dueDate, priority, category } = req.validatedBody;

        if (!isValidTodoId(id)) {
            return res.status(400).json({ message: 'id required', success: false });
        }

        const update = {};
        if (title !== undefined) update.title = title;
        if (dueDate !== undefined) update.dueDate = dueDate;
        if (priority !== undefined) update.priority = priority;
        if (category !== undefined) update.category = category;

        const todo = await todoModel.findOneAndUpdate(
            { _id: id, userId },
            update,
            { new: true, runValidators: true }
        );

        if (!todo) {
            return res.status(404).json({
                success: false,
                message: "Todo not found"
            });
        }

        await invalidateDashbord(userId);

        return res.status(200).json({
            success: true,
            message: "Todo Updated!",
            todo
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Server Error at update todo Route"
        });
    }
};


export const deleteTodo = async (req, res) => {
    try {
        const userId = req.userId;
        const { id } = req.params;
        if (!isValidTodoId(id)) {
            return res.status(400).json({ message: 'id required', success: false });
        }

        const todo = await todoModel.findOneAndDelete({ _id: id, userId });

        if (!todo) {
            return res.status(404).json({
                success: false,
                message: "Todo not found"
            });
        }

        await invalidateDashbord(userId);

        return res.status(200).json({
            success: true,
            message: "Todo Deleted!"
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Server Error at delete todo Route"
        });
    }
};


export const updateTodoStatus = async (req, res) => {
    try {
        const userId = req.userId;
        const { id } = req.params;
        const { isCompleted } = req.body;

        if (!isValidTodoId(id)) {
            return res.status(400).json({ message: 'id required', success: false });
        }

        if (typeof isCompleted !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: "isCompleted must be a boolean"
            });
        }

        const existing = await todoModel.findOne({ _id: id, userId });
        if (!existing) {
            return res.status(404).json({
                success: false,
                message: "Todo not found"
            });
        }

        const { startOfToday } = await dayBoundsForUser(userId);
        const isExpired = !isCompleted && existing.dueDate < startOfToday;

        const todo = await todoModel.findOneAndUpdate(
            { _id: id, userId },
            { isCompleted, status: isCompleted ? 'completed' : 'pending', isExpired },
            { new: true }
        );

        await invalidateDashbord(userId);

        return res.status(200).json({
            success: true,
            message: "Todo status updated!",
            todo
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Server Error at update todo status Route"
        });
    }
};