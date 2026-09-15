import { z } from "zod";

// * VALIDATION TODOS
export const todoValidation = (req, res, next) => {
    const schema = z.object({
        title: z.string().min(1, "minimum 1 char required").max(250, "max 250 chars allowed"),
        dueDate: z.coerce.date().optional(),
        priority: z.enum(['low', 'medium', 'high']).optional(),
        category: z.string().optional()
    });

    const result = schema.safeParse(req.body);

    if (!result.success) {
        console.log("Zod Error Details:", result.error.flatten().fieldErrors);

        return res.status(400).json({
            success: false,
            message: "Bad request",
            errors: result.error.flatten().fieldErrors
        });
    }

    req.validatedBody = result.data;

    next();
};

export const validateTodoUpdate = (req, res, next) => {
    const schema = z.object({
        title: z.string().min(1, "minimum 1 char required").max(125, "max 125 chars allowed").optional(),
        dueDate: z.coerce.date().optional(),
        priority: z.enum(['low', 'medium', 'high']).optional(),
        category: z.string().optional()
    })

    const result = schema.safeParse(req.body);

    if (!result.success) {
        console.log("Zod Error Details:", result.error.flatten().fieldErrors);

        return res.status(400).json({
            success: false,
            message: "Bad request",
            errors: result.error.flatten().fieldErrors
        });
    }

    req.validatedBody = result.data;

    next();
}