import rateLimit from "express-rate-limit";

export const resendOtpLimiter = rateLimit({
    windowMs: 60 * 1000, 
    max: 1, 
    keyGenerator: (req) => req.body?.email?.trim()?.toLowerCase() || req.ip,         
    message: {
        success: false,
        message: "Please wait 60 seconds before requesting another OTP."
    },
    standardHeaders: true,
    legacyHeaders: false,
});

export const authLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 10, 
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        return res.status(429).json({
            success: false,
            message: "Too many requests. Please try again in a few minutes."
        });
    }
});