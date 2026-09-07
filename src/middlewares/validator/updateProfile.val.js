//* UPDATE USE VALIDATION

import { z } from 'zod';


export const validateSettingsUpdate = (req, res, next) => {
    const schema = z.object({
        updates: z.record(
            z.string(),
            z.union(
                z.boolean(),
                z.record(
                    z.string(),
                    z.union([
                        z.string(),
                        z.number(),
                        z.boolean()
                    ])
                )
            )
        )
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

export const velidateUpdatePassword = (req, res, next) => {
    const schema = z.object({
        password: z
            .string()
            .min(8, "passwword must be 8 charcter long")
            .max(29, "password is too long"),

        newPassword: z
            .string()
            .min(8, "passwword must be 8 charcter long")
            .max(29, "password is too long"),
            
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