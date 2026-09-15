import { z } from "zod"


// * AUTH - SING-UP
export const registerValidation = (req, res, next) => {
    const schema = z.object({
        username: z
            .string()
            .trim()
            .min(3, "username must be at least 3 characters long")
            .max(29, "username must be at most 29 characters long"),
        email: z
            .string()
            .email("Invalid email address")
            .trim()
            .toLowerCase(),
        password: z
            .string()
            .min(8, "password must be at least 8 characters long")
            .max(29, "password is too long"),
        timezone: z.string().trim().min(1).max(100).optional(),
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

// * AUTH - LOGIN
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

// * AUTH - OTP-VALIDATION
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

// * AUTH - RESEND-OTP
export const resendOtpValidation = (req, res, next) => {
    const schema = z.object({
        email: z
            .string()
            .email("Invalid email address")
            .trim()
            .toLowerCase(),
        purpose: z.enum(["register", "reset-password", "login"], {
            errorMap: () => ({ message: "Purpose must be 'register', 'reset-password' or 'login'" })
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

// * AUTH - REQUEST-PASS-RESET
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

// * AUTH - VERIFY-PASS-RESET
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

// * AUTH - PASS-REST
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
