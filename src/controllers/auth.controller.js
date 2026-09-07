import bcrypt from "bcryptjs";
import crypto from "crypto"
import jwt from "jsonwebtoken"
import { UAParser } from "ua-parser-js";
import config from "../config/config.js";
import generateOtp from "../utils/generateOtp.js";
import userModel from "../models/user.model.js";
import otpModel from "../models/otp.model.js";
import sendOtpMail from "../utils/sendMail.js"
import settingsModel from "../models/settings.model.js";
import sessionModel from "../models/session.model.js";
import { generateAccessToken, generateRefreshToken, generateResetPasswordToken } from "../utils/grnrateTokens.js";
import { formatDateDDMMYYYY, formatDateTimeDDMMYYYY } from "../utils/dateUtil.js";
import { getLocationFromRequest } from "../lib/getLocationFromRequest.js";


// * UTILITY FUNCTION
const normalizeEmail = (email = "") => String(email).trim().toLowerCase();


// * ================== SING UP ======================= * //

// * SING UP - REGISTER
export const register = async (req, res) => {
    try {
        const { username, email, password, timezone } = req.body
        const normalizedEmail = normalizeEmail(email)

        let user = await userModel.findOne({ email: normalizedEmail })
        if (user && user.isVerified === true) { return res.status(400).json({ success: false, message: "User alrady registerd" }) }

        const hashPassword = await bcrypt.hash(password, 10)
        if (user) {
            user.username = username
            user.email = normalizedEmail
            user.password = hashPassword
            const settings = await settingsModel.findOne({ userId: user._id })
            if (!settings) {
                settings = await settingsModel.create({ userId: user._id, timezone })
                user.settingId = settings._id
            }
            await user.save()
        } else {
            user = await userModel.create({ username, email: normalizedEmail, password: hashPassword, timezon: timezone })
            await settingsModel.create({ userId: user._id, timezone })
            user.settingId = settings._id
            await user.save()
        }

        const otp = generateOtp()
        const hashOtp = await bcrypt.hash(otp, 10)
        const purpose = "register"
        const expAt = new Date(Date.now() + 5 * 60 * 1000)

        let userOtp = await otpModel.findOne({ email: normalizedEmail })
        if (userOtp) {
            userOtp.otp = hashOtp
            userOtp.purpose = purpose
            userOtp.attempts = 0
            userOtp.expAt = expAt
            await userOtp.save()
        }
        else {
            userOtp = await otpModel.create({ email: normalizedEmail, otp: hashOtp, purpose, expAt })
        }

        const subject = "authentication by email"
        await sendOtpMail(username, normalizedEmail, otp, subject)

        return res.status(201).json({
            success: true,
            email: normalizedEmail,
            message: "OTP sent for verification"
        })

    } catch (error) {
        console.log(error)
        return res.status(500).json({
            success: false,
            message: "Error at Register Route"
        })
    }

};

// *SING UP - VERIFY OTP
export const verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body
        const normalizedEmail = normalizeEmail(email)
        const user = await userModel.findOne({ email: normalizedEmail })
        if (!user) { return res.status(400).json({ success: false, message: "User not Registerd" }) }
        if (user.isVerified === true) { return res.status(400).json({ success: false, message: "user Alrady Verified, try to login" }) }

        const otpFile = await otpModel.findOne({ email: normalizedEmail })
        if (!otpFile) { return res.status(400).json({ success: false, message: "Otp not found" }) }

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

        await Promise.all([
            otpModel.deleteOne({ _id: otpFile._id }),
            userModel.findByIdAndUpdate(user._id, { isVerified: true })
        ])

        const refreshToken = generateRefreshToken(user._id)
        const accessToken = generateAccessToken(user._id)
        const hashToken = crypto.createHash('sha256').update(refreshToken).digest('hex')
        const userAgent = req.headers["user-agent"] || "Unknown"
        const parser = new UAParser(userAgent)
        const result = parser.getResult()
        const { ip, location } = getLocationFromRequest(req)
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        const lastTime = new Date()
        const diviceId = crypto.randomUUID()

        const session = await sessionModel.create({
            userId: user._id,
            refreshTokenHash: hashToken,
            userAgent,
            ipAddress: ip,
            expiresAt,
            lastTime,
            location,
            browser: result.browser?.name || "Unknown",
            os: result.os?.name || "Unknown",
            diviceId
        })

        res.cookie("diviceId_nextStudy", diviceId, {
            httpOnly: true,
            secure: config.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 365 * 24 * 60 * 60 * 1000 * 10
        })

        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: config.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000
        })

        return res.status(200).json({
            success: true,
            token: accessToken,
            sessionId: session._id,
            expiresAt: formatDateTimeDDMMYYYY(expiresAt)
        })

    } catch (error) {
        console.log(error)
        return res.status(500).json({
            success: false,
            message: "Error at verifyOtp Route"
        })
    }
};


// * ================== ALL USE ======================= * //

// * RESEND OTP
export const resendOtp = async (req, res) => {
    try {
        const { email, purpose } = req.body
        const normalizedEmail = normalizeEmail(email)

        if (!["register", "reset-password"].includes(purpose)) {
            return res.status(400).json({ success: false, message: "Invalid purpose" })
        }

        const user = await userModel.findOne({ email: normalizedEmail })
        if (!user) { return res.status(400).json({ success: false, message: "user not found" }) }
        if (purpose === "register" && user.isVerified === true) {
            return res.status(400).json({ success: false, message: "user alrady registerd, please try to login" })
        }

        if (purpose === "reset-password" && user.isVerified === false) {
            return res.status(400).json({ success: false, message: "user not verified, please register first" })
        }

        const otpFile = await otpModel.findOne({ email: normalizedEmail })
        if (!otpFile) { return res.status(400).json({ success: false, message: "inavalid user, otp not found" }) }

        const otp = generateOtp()
        const hashOtp = await bcrypt.hash(otp, 10)
        const expAt = new Date(Date.now() + 5 * 60 * 1000)

        otpFile.otp = hashOtp;
        otpFile.purpose = purpose;
        otpFile.expAt = expAt;
        otpFile.attempts = 0;
        const subject = purpose === "register" ? "Verify by Email" : "Verify reset Password"

        await otpFile.save();
        await sendOtpMail(user.username, normalizedEmail, otp, subject)

        return res.status(200).json({ success: true, message: "new otp sended" })
    } catch (error) {
        console.log(error)
        return res.status(500).json({
            success: false,
            message: "Error at resend OTP Route"
        })
    }
}

// * RES ACCTOKEN
export const refershAccToken = async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken
        if (!refreshToken) { return res.status(400).json({ success: false, message: "reftoken not found" }) }

        let decoded;
        try {
            decoded = jwt.verify(refreshToken, config.REFRESH_TOKEN_SECRET)
        } catch (err) {
            res.clearCookie("refreshToken", {
                httpOnly: true,
                secure: config.NODE_ENV === "production",
                sameSite: "strict"
            });
            return res.status(401).json({ success: false, message: "Try to Login" })
        }

        const userId = decoded.userId

        const hashToken = crypto
            .createHash("sha256")
            .update(refreshToken)
            .digest("hex");

        const session = await sessionModel.findOne({
            userId,
            $or: [
                { refreshTokenHash: hashToken },
                {
                    previousRefreshTokenHash: hashToken,
                    previousTokenExpiresAt: { $gt: new Date() }
                }
            ]
        });


        if (!session || session.revoked === true) {
            res.clearCookie("refreshToken", {
                httpOnly: true,
                secure: config.NODE_ENV === "production",
                sameSite: "strict"
            });
            return res.status(401).json({ success: false, message: "Try to Login" })
        }

        if (session.expiresAt < new Date()) {
            res.clearCookie("refreshToken", {
                httpOnly: true,
                secure: config.NODE_ENV === "production",
                sameSite: "strict"
            });
            return res.status(401).json({ success: false, message: "Session Expired, Try to Login" })
        }

        const newRefreshToken = generateRefreshToken(userId)
        const newAccessToken = generateAccessToken(userId)
        const hashRefToken = crypto.createHash('sha256').update(newRefreshToken).digest('hex')

        session.lastTime = new Date()
        session.previousRefreshTokenHash = session.refreshTokenHash
        session.previousTokenExpiresAt = new Date(Date.now() + 10 * 1000)

        session.refreshTokenHash = hashRefToken
        session.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        await session.save()

        res.cookie("refreshToken", newRefreshToken, {
            httpOnly: true,
            secure: config.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000
        })

        return res.status(200).json({
            success: true,
            token: newAccessToken,
            sessionId: session._id,
        })
    } catch (error) {
        console.log(error)
        return res.status(500).json({
            success: false,
            message: "Error at refresh Acctoken Route"
        })
    }
}

// * ================== LOG OUT ======================= * //

// * LOGOUT - LOG OUT
export const logout = async (req, res) => {

    try {
        const refreshToken = req.cookies.refreshToken
        if (!refreshToken) { return res.status(400).json({ success: false, message: "No active session" }) }

        let userId
        try {
            const decoded = jwt.verify(refreshToken, config.REFRESH_TOKEN_SECRET)
            userId = decoded.userId
        } catch (error) {
            res.clearCookie("refreshToken", {
                httpOnly: true,
                secure: config.NODE_ENV === "production",
                sameSite: "strict"
            })
            return res.status(400).json({ success: false, message: "Invalid or expired session" })
        }

        const hashToken = crypto
            .createHash("sha256")
            .update(refreshToken)
            .digest("hex");

        const session = await sessionModel.findOne({ refreshTokenHash: hashToken, userId })
        if (!session || session.revoked === true) {
            res.clearCookie("refreshToken", {
                httpOnly: true,
                secure: config.NODE_ENV === "production",
                sameSite: "strict"
            })
            return res.status(400).json({ success: false, message: "session not found" })
        }
        session.revoked = true
        await session.save()
        res.clearCookie("refreshToken", {
            httpOnly: true,
            secure: config.NODE_ENV === "production",
            sameSite: "strict"
        })
        return res.status(200).json({ success: true, message: "Logout successful" })

    } catch (error) {
        console.log(error)
        return res.status(500).json({
            success: false,
            message: "Error at logout Route"
        })
    }
}

// * LOGOUT - LOG OUT ALL
export const logoutFromAnywhere = async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken
        if (!refreshToken) { return res.status(400).json({ success: false, message: "No active session" }) }

        const decoded = jwt.verify(refreshToken, config.REFRESH_TOKEN_SECRET)

        await sessionModel.updateMany(
            { userId: decoded.userId, revoked: false },
            { $set: { revoked: true } }
        );

        res.clearCookie("refreshToken", {
            httpOnly: true,
            secure: config.NODE_ENV === "production",
            sameSite: "strict"
        });

        return res.status(200).json({ success: true, message: "Logout from all devices successful" })

    } catch (error) {
        console.log(error)
        if (
            error.name === "TokenExpiredError" ||
            error.name === "JsonWebTokenError"
        ) {
            return res.status(401).json({
                success: false,
                message: "Invalid or expired refresh token"
            });
        }

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
}



// * ================== LOG IN ======================= * //

// * LOGIN - LOG IN
export const login = async (req, res) => {
    try {
        const { email, password } = req.body
        const normalizedEmail = normalizeEmail(email)

        const user = await userModel.findOne({ email: normalizedEmail })
        if (!user || !user.isVerified) { return res.status(400).json({ success: false, message: "user not found or not verified, try to singup" }) }

        const isMatch = await bcrypt.compare(password, user.password)
        if (!isMatch) { return res.status(400).json({ success: false, message: "invalid credentials" }) }

        const refreshToken = generateRefreshToken(user._id)
        const accessToken = generateAccessToken(user._id)
        const hashToken = crypto.createHash('sha256').update(refreshToken).digest('hex')
        const userAgent = req.headers["user-agent"] || "Unknown"
        const parser = new UAParser(userAgent)
        const result = parser.getResult()
        const { ip, location } = getLocationFromRequest(req)
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        const lastTime = new Date()
        let diviceId = req.cookies["diviceId_nextStudy"]
        if (!diviceId) {
            diviceId = crypto.randomUUID()
            res.cookie("diviceId_nextStudy", diviceId, {
                httpOnly: true,
                secure: config.NODE_ENV === "production",
                sameSite: "lax",
                maxAge: 365 * 24 * 60 * 60 * 1000 * 10
            })
        }

        const session = await sessionModel.create({
            userId: user._id,
            refreshTokenHash: hashToken,
            userAgent,
            ipAddress: ip,
            expiresAt,
            lastTime,
            location,
            browser: result.browser?.name || "Unknown",
            os: result.os?.name || "Unknown",
            diviceId
        })
        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: config.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000
        })

        return res.status(200).json({
            success: true,
            token: accessToken,
            sessionId: session._id,
            expiresAt: formatDateTimeDDMMYYYY(expiresAt)
        })
    } catch (error) {
        console.log(error)
        return res.status(500).json({
            success: false,
            message: "Error at login Route"
        })
    }
};

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
            message: "Error at requestPasswordReset Route"
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
        if (otpFile.purpose !== "register") { return res.status(400).json({ success: false, message: "Invalid OTP request" }) }

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
            message: "Error at requestPasswordReset Route"
        })
    }
}

// * LOGIN - QUE-RESET-PASS
export const resetPassword = async (req, res) => {
    try {
        const { newPassword } = req.body
        const resetToken = req.cookies.resetToken
        if (!resetToken) { return res.status(400).json({ success: false, message: "reset token not found" }) }

        const decoded = jwt.verify(resetToken, config.RESET_PASSWORD_TOKEN_SECRET)
        const userId = decoded.userId

        const hashedPassword = await bcrypt.hash(newPassword, 10)
        await userModel.findByIdAndUpdate(userId, { password: hashedPassword })

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