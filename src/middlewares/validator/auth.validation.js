import { z } from "zod"

export const registerValidation = (req, res, next) => {
    const schema = z.object({
        username: z
            .string()
            .trim()
            .min(3, "username mast be 3 charcter long")
            .max(29, "username mast be lower then 25 charter"),
        email: z
            .string()
            .email("Invalid email address")
            .trim()
            .toLowerCase(),
        password: z
            .string()
            .min(8, "passwword must be 8 charcter long")
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

    req.body = result.data
    next()
}

export const loginValidation = (req, res, next) => {
    const schema = z.object({
        email: z
            .string()
            .email("Invalid email address")
            .trim()
            .toLowerCase(),
        password: z.string().min(8).max(29),
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

    req.body = result.data
    next()
}

export const otpValidation = (req, res, next) => {
    const schema = z.object({
        email: z
            .string()
            .email("Invalid email address")
            .trim()
            .toLowerCase(),
        otp: z.string().regex(/^\d{6}$/, "OTP must be exactly 6 digits")
    })

    const result = schema.safeParse(req.body)
    if (!result.success) {
        console.log(result.error.flatten().fieldErrors)
        return res.status(400).json({
            success: false,
            message: "Bad request",
            errors: result.error.flatten().fieldErrors
        })
    }

    req.body = result.data
    next()
}

export const resendOtpValidation = (req, res, next) => {
    const schema = z.object({
        email: z
            .string()
            .email("Invalid email address")
            .trim()
            .toLowerCase(),
        purpose: z.enum(["register", "reset-password"], {
            errorMap: () => ({ message: "Purpose must be either 'register' or 'forgot-password'" })
        }),
        subject: z.string().optional()
    })

    const result = schema.safeParse(req.body)
    if (!result.success) {
        console.log(result.error.flatten().fieldErrors)
        return res.status(400).json({
            success: false,
            message: "Bad request",
            errors: result.error.flatten().fieldErrors
        })
    }

    req.body = result.data
    next()
}

export const requestPasswordResetValidation = (req, res, next) => {
    const schema = z.object({
        email: z
            .string()
            .email("Invalid email address")
            .trim()
            .toLowerCase()
    })

    const result = schema.safeParse(req.body)
    if (!result.success) {
        console.log(result.error.flatten().fieldErrors)
        return res.status(400).json({
            success: false,
            message: "Bad request",
            errors: result.error.flatten().fieldErrors
        })
    }

    req.body = result.data
    next()
}

export const verifyPasswordResetValidation = (req, res, next) => {
    const schema = z.object({
        email: z
            .string()
            .email("Invalid email address")
            .trim()
            .toLowerCase(),
        otp: z.string().regex(/^\d{6}$/, "OTP must be exactly 6 digits"),
    })

    const result = schema.safeParse(req.body)
    if (!result.success) {
        console.log(result.error.flatten().fieldErrors)
        return res.status(400).json({
            success: false,
            message: "Bad request",
            errors: result.error.flatten().fieldErrors
        })
    }

    req.body = result.data
    next()
}

export const resetPasswordValidation = (req, res, next) => {
    const schema = z.object({
        newPassword: z
            .string()
            .min(8, "Password must be at least 8 characters long")
            .max(29, "Password is too long")
    })

    const result = schema.safeParse(req.body)
    if (!result.success) {
        console.log(result.error.flatten().fieldErrors)
        return res.status(400).json({
            success: false,
            message: "Bad request",
            errors: result.error.flatten().fieldErrors
        })
    }

    req.body = result.data
    next()
}
