import bcrypt from "bcryptjs";
import crypto from "crypto"
import jwt from "jsonwebtoken"
import config from "../../../config/config.js";
import generateOtp from "../../../utils/generateOtp.js";
import userModel from "../../../models/user.model.js";
import otpModel from "../../../models/otp.model.js";
import sendOtpMail from "../../../utils/sendMail.js"
import sessionModel from "../../../models/session.model.js";
import notificationModel from "../../../models/notification.model.js"
import { generateResetPasswordToken } from "../../../utils/generateTokens.js";


// * UTILITY FUNCTION
const normalizeEmail = (email = "") => String(email).trim().toLowerCase();


// * LOGIN - REQ-RESET-PASS
export const requestPasswordReset = async (req, res) => {
    try {
        const { email } = req.body
        const normalizedEmail = normalizeEmail(email)

        const user = await userModel.findOne({ email: normalizedEmail })
        if (!user || user.isVerified === false) { return res.status(400).json({ success: false, message: "user not found or user not verified" }) }

        const otp = generateOtp()
        const hashOtp = await bcrypt.hash(otp, 10)
        const purpose = "reset-password"
        const expAt = new Date(Date.now() + 5 * 60 * 1000)

        let userOtp = await otpModel.findOne({ email: normalizedEmail })
        if (userOtp) {
            userOtp.otp = hashOtp
            userOtp.purpose = purpose
            userOtp.attempts = 0
            userOtp.expAt = expAt
            await userOtp.save()
        } else {
            userOtp = await otpModel.create({ email: normalizedEmail, otp: hashOtp, purpose, expAt })
        }

        const subject = "Reset your password"
        await sendOtpMail(user.username, normalizedEmail, otp, subject)

        return res.status(200).json({
            success: true,
            message: "OTP sent for password reset"
        })

} catch (error) {
        console.log(error)
        return res.status(500).json({
            success: false,
            message: "Error at resetPassword Route"
        })
    }
}

// * LOGIN - VER-RESET-PASS
export const verifyPasswordReset = async (req, res) => {
    try {
        const { email, otp } = req.body
        const normalizedEmail = normalizeEmail(email)

        const user = await userModel.findOne({ email: normalizedEmail })
        if (!user) { return res.status(400).json({ success: false, message: "user not found" }) }

        const otpFile = await otpModel.findOne({ email: normalizedEmail })
        if (!otpFile) { return res.status(400).json({ success: false, message: "Otp not found" }) }
        if (otpFile.purpose !== "reset-password") { return res.status(400).json({ success: false, message: "Invalid OTP request" }) }

        if (otpFile.attempts >= 10) {
            await otpModel.deleteOne({ _id: otpFile._id })
            return res.status(400).json({ success: false, message: "Too many attempts" })
        }

        if (otpFile.expAt < new Date()) {
            await otpModel.deleteOne({ _id: otpFile._id })
            return res.status(400).json({ success: false, message: "OTP expired" })
        }

        const isMatch = await bcrypt.compare(otp, otpFile.otp)
        if (!isMatch) {
            otpFile.attempts = otpFile.attempts + 1
            await otpFile.save()
            return res.status(400).json({ success: false, message: "otp didn't match" })
        }

        await otpModel.deleteOne({ _id: otpFile._id })
        const resetToken = generateResetPasswordToken(user._id)

        res.clearCookie("resetToken", {
            httpOnly: true,
            secure: config.NODE_ENV === "production",
            sameSite: "strict"
        })

        res.cookie("resetToken", resetToken, {
            httpOnly: true,
            secure: config.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 10 * 60 * 1000
        })

        return res.status(200).json({
            success: true,
            message: "OTP verified, you can now reset your password"
        })

    } catch (error) {
        console.log(error)
        return res.status(500).json({
            success: false,
            message: "Error at verifyPasswordReset Route"
        })
    }
}

// * LOGIN - QUE-RESET-PASS
export const resetPassword = async (req, res) => {
    try {
        const { newPassword } = req.body
        const resetToken = req.cookies.resetToken
        if (!resetToken) { return res.status(400).json({ success: false, message: "reset token not found" }) }

        let decoded
        try {
            decoded = jwt.verify(resetToken, config.RESET_PASSWORD_TOKEN_SECRET)
        } catch (error) {
            if (error.name === "TokenExpiredError" || error.name === "JsonWebTokenError") {
                return res.status(401).json({ success: false, message: "Invalid or expired reset token" })
            }
            throw error
        }
        const userId = decoded.userId

        const hashedPassword = await bcrypt.hash(newPassword, 10)
        const user = await userModel.findByIdAndUpdate(userId, { password: hashedPassword, $inc: { tokenVersion: 1 } })
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" })
        }

        res.clearCookie("resetToken", {
            httpOnly: true,
            secure: config.NODE_ENV === "production",
            sameSite: "strict"
        })

        res.clearCookie("refreshToken", {
            httpOnly: true,
            secure: config.NODE_ENV === "production",
            sameSite: "strict"
        })

        await sessionModel.updateMany(
            { userId: decoded.userId, revoked: false },
            { $set: { revoked: true } }
        );

        const notificationKey = `user_${user._id}_${crypto.randomUUID()}`
        await notificationModel.create({
            userId: user._id,
            type: 'user',
            title: "Password Changed",
            message: `Your password was successfully reset on ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}. If you didn't request this change, contact support right away.`,
            status: 'sent',
            notificationKey
        });

        return res.status(200).json({
            success: true,
            message: "Password reset successfully"
        })

    } catch (error) {
        console.log(error)
        return res.status(500).json({
            success: false,
            message: "Error at requestPasswordReset Route"
        })
    }
}