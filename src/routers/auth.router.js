import express from "express";
import {
    login,
    register,
    verifyOtp,
    resendOtp,
    refershAccToken,
    logout,
    logoutFromAnywhere,
    requestPasswordReset,
    verifyPasswordReset,
    resetPassword
} from "../controllers/auth.controller.js";
import {
    loginValidation,
    registerValidation,
    otpValidation,
    resendOtpValidation,
    requestPasswordResetValidation,
    verifyPasswordResetValidation,
    resetPasswordValidation
} from "../middlewares/validator/auth.validation.js";
import { resendOtpLimiter, authLimiter } from "../middlewares/rateLimitter.js";

const router = express.Router()

router.post("/register", authLimiter, registerValidation, register);
router.post("/login", authLimiter, loginValidation, login);
router.post("/verify-otp", authLimiter, otpValidation, verifyOtp);

router.post("/logout", authLimiter, logout);
router.post("/logout-from-anywhere", authLimiter, logoutFromAnywhere);

router.post("/refresh-token", authLimiter, refershAccToken);
router.post("/resend-otp", resendOtpLimiter, resendOtpValidation, resendOtp);

router.post("/request-password-reset", authLimiter, requestPasswordResetValidation, requestPasswordReset);
router.post("/verify-password-reset", authLimiter, verifyPasswordResetValidation, verifyPasswordReset);
router.post("/reset-password", authLimiter, resetPasswordValidation, resetPassword);

export default router;