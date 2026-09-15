//* UPDATE USE VALIDATION

import { z } from 'zod';


export const validateSettingsUpdate = (req, res, next) => {
    const schema = z.object({
        profile: z.object({
            username: z.string().trim().min(3).max(29).optional(),
            timezone: z.string().trim().min(1).max(100).optional(),
        }).strict().optional(),
        account: z.object({
            username: z.string().trim().min(3).max(29).optional(),
            timezone: z.string().trim().min(1).max(100).optional(),
        }).strict().optional(),
        reminders: z.object({
            attendanceReminder: z.boolean().optional(),
            examReminder: z.boolean().optional(),
            todoReminder: z.boolean().optional(),
            assignmentReminder: z.boolean().optional(),
            weeklySummary: z.boolean().optional(),
        }).strict().optional(),
        notifications: z.object({
            attendanceReminder: z.boolean().optional(),
            examReminder: z.boolean().optional(),
            todoReminder: z.boolean().optional(),
            assignmentReminder: z.boolean().optional(),
            weeklySummary: z.boolean().optional(),
        }).strict().optional(),
        password: z.object({
            twoFactorEnabled: z.boolean(),
        }).strict().optional(),
        appearance: z.object({
            theme: z.enum(["LIGHT", "DARK"]).optional(),
            accent: z.object({
                name: z.enum(["royal-blue", "forest-green", "crimson-red"]),
                color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
            }).strict().optional(),
            animations: z.boolean().optional(),
            navigation: z.enum(["def", "drg"]).optional(),
            textSize: z.enum(["def", "sml", "big"]).optional(),
        }).strict().optional(),
    }).strict().refine((updates) => Object.keys(updates).length > 0, {
        message: "At least one update is required",
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

export const validateUpdatePassword = (req, res, next) => {
    const schema = z.object({
        password: z
            .string()
            .min(8, "password must be 8 characters long")
            .max(29, "password is too long"),

        newPassword: z
            .string()
            .min(8, "password must be 8 characters long")
            .max(29, "password is too long"),
            
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