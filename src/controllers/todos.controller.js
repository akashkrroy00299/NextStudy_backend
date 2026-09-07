import { success } from "zod";
import todoModel from "../models/todos.model.js";

// * UTILITY
const thirtyDaysAgo = new Date()
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)


// * FUNCTIONS
export const createTodo = async (req, res) => {
    try {
        const userId = req.userId;
        let { title, dueDate, priority, category } = req.body;

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
            description,
            dueDate,
            priority,
            category
        });

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

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);

        const [today, upcoming, completed, expired] = await Promise.all([
            // Due today, not completed
            todoModel.find({
                userId,
                dueDate: { $gte: startOfToday, $lt: endOfToday },
                isCompleted: false
            }),

            // Due after today, not completed
            todoModel.find({
                userId,
                dueDate: { $gte: endOfToday },
                isCompleted: false
            }),

            // Completed (most recent 10)
            todoModel.find({
                userId,
                isCompleted: true
            }).sort({ updatedAt: -1 }).limit(10),

            // Overdue, not completed (most recent 10)
            todoModel.find({
                userId,
                isCompleted: false,
                dueDate: { $lt: startOfToday }
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

export const fatchTodo = async (req, res) => {
    try {
        const userId = req.userId;
        const { id } = req.params;

        if (!id) {
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
            message: "Todo fatched",
            todo
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Server Error at fatch todo Route"
        });
    }
};


export const updateTodo = async (req, res) => {
    try {
        const userId = req.userId;
        const { id } = req.params;
        const { title, dueDate, priority, category } = req.body;

        if (!id) {
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
        if (!id) {
            return res.status(400).json({ message: 'id required', success: false });
        }

        const todo = await todoModel.findOneAndDelete({ _id: id, userId });

        if (!todo) {
            return res.status(404).json({
                success: false,
                message: "Todo not found"
            });
        }

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

        if (!id) {
            return res.status(400).json({ message: 'id required', success: false });
        }

        if (typeof isCompleted !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: "isCompleted must be a boolean"
            });
        }

        const todo = await todoModel.findOneAndUpdate(
            { _id: id, userId },
            { isCompleted, status: isCompleted ? 'completed' : 'pending' },
            { new: true }
        );

        if (!todo) {
            return res.status(404).json({
                success: false,
                message: "Todo not found"
            });
        }

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