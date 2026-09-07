import express from "express";
import {
    createTodo,
    fetchTodos,
    fatchTodo,
    updateTodo,
    deleteTodo,
    updateTodoStatus
} from "../controllers/todos.controller.js";
import { verifyUser } from "../middlewares/validateAccToken.js";
import { todoValidation, validateTodoUpdate } from "../middlewares/validator/todos.validation.js";

const router = express.Router()
router.use(verifyUser);

//* TODO FUNCTIONS
router.get("/", fetchTodos)
router.post("/", todoValidation, createTodo)
router.get("/:id", fatchTodo)
router.patch("/:id", validateTodoUpdate, updateTodo)
router.delete("/:id", deleteTodo)
router.patch("/:id/status", updateTodoStatus)

export default router