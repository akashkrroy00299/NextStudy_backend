import { z } from "zod"

export const globalNotificationValidation = (req, res, next) => {
    const schema = z.object({
        title: z.string().min(2).max(299),
        message: z.string().min(2).max(999),
        type: z.string().enum(['system', 'announcement']).optional()
    })

    const result = schema.safeParse(req.body)

    if (!result.success) {
        console.log("Zod Error Details:", result.error.flatten().fieldErrors)

        return res.status(400).json({
            success: false,
            message: "Bad request",
            errors: result.error.flatten().fieldErrors
        })
    }

    req.validatedBody = result.data

    next()
}