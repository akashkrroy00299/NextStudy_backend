import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import config from "../config/config.js"

const rateLimitHandler = (req, res) => {
    return res.status(429).json({
        success: false,
        message: "Too many requests. Please try again in a few minutes."
    });
};

const createLimiter = (windowMs, max) => rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler,
});


// * AUTH - RESEND-OTP
export const resendOtpLimiter = rateLimit({
    windowMs: 60 * 1000, 
    max: 1, 
    keyGenerator: (req) => req.body?.email?.trim()?.toLowerCase() || ipKeyGenerator(req),         
    message: {
        success: false,
        message: "Please wait 60 seconds before requesting another OTP."
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// * AUTH - ALL-AUTH-ROUTE
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 30,  // 30 requests per 15 minutes
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler
});

// * AUTH - REF-TOKEN
export const refTokenLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: config.NODE_ENV === "development" ? 1000 : 20 ,
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler
})

// * AUTHENTICATED API ROUTES
export const apiReadLimiter = createLimiter(60 * 1000, 120);
export const apiWriteLimiter = createLimiter(60 * 1000, 60);
export const sensitiveApiLimiter = createLimiter(15 * 60 * 1000, 10);