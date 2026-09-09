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
import { apiReadLimiter, apiWriteLimiter } from "../middlewares/rateLimitter.js";

const router = express.Router()
router.use(verifyUser);

//* TODO FUNCTIONS
router.get("/", apiReadLimiter, fetchTodos)
router.post("/", apiWriteLimiter, todoValidation, createTodo)
router.get("/:id", apiReadLimiter, fatchTodo)
router.patch("/:id", apiWriteLimiter, validateTodoUpdate, updateTodo)
router.delete("/:id", apiWriteLimiter, deleteTodo)
router.patch("/:id/status", apiWriteLimiter, updateTodoStatus)

export default router