import { z } from "zod"

// * VALIDATION FOR GET-MONTHLY-GRID
export const dateValidation = (req, res, next) => {
    const schema = z.object({
        month: z.coerce.number().int().min(0).max(11),
        year: z.coerce.number().int().min(2000).max(2100).optional(),
    })

    const result = schema.safeParse(req.query)

    if (!result.success) {
        console.log("Zod Error Details:", result.error.flatten().fieldErrors)

        return res.status(400).json({
            success: false,
            message: "Bad request",
            errors: result.error.flatten().fieldErrors
        })
    }

    req.validatedQuery = result.data

    next()
}