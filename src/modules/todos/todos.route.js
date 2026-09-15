import express from "express";
import {
    createTodo,
    fetchTodos,
    fetchTodo,
    updateTodo,
    deleteTodo,
    updateTodoStatus
} from "./controllers/todos.controller.js";
import { verifyUser } from "../../middlewares/validateAccToken.js";
import { todoValidation, validateTodoUpdate } from "./validations/todos.validation.js";
import { apiReadLimiter, apiWriteLimiter } from "../../middlewares/rateLimiter.js";

const router = express.Router()
router.use(verifyUser);

//* TODO FUNCTIONS
router.get("/", apiReadLimiter, fetchTodos)
router.post("/", apiWriteLimiter, todoValidation, createTodo)
router.get("/:id", apiReadLimiter, fetchTodo)
router.patch("/:id", apiWriteLimiter, validateTodoUpdate, updateTodo)
router.delete("/:id", apiWriteLimiter, deleteTodo)
router.patch("/:id/status", apiWriteLimiter, updateTodoStatus)

export default router