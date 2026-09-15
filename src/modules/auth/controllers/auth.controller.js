import bcrypt from "bcryptjs";
import crypto from "crypto"
import { UAParser } from "ua-parser-js";
import config from "../../../config/config.js";
import generateOtp from "../../../utils/generateOtp.js";
import userModel from "../../../models/user.model.js";
import otpModel from "../../../models/otp.model.js";
import sendOtpMail from "../../../utils/sendMail.js"
import settingsModel from "../../../models/settings.model.js";
import sessionModel from "../../../models/session.model.js";
import notificationModel from "../../../models/notification.model.js"
import { generateAccessToken, generateRefreshToken } from "../../../utils/generateTokens.js";
import { formatDateTimeDDMMYYYY } from "../../../utils/dateUtil.js";
import { getLocationFromRequest } from "../../../lib/getLocationFromRequest.js";


// * UTILITY FUNCTION
const normalizeEmail = (email = "") => String(email).trim().toLowerCase();


// * ================== SING UP ======================= * //

// * SING UP - REGISTER
export const register = async (req, res) => {
    try {
        const { username, email, password, timezone } = req.body
        const normalizedEmail = normalizeEmail(email)

        let user = await userModel.findOne({ email: normalizedEmail })
        if (user && user.isVerified === true) { return res.status(400).json({ success: false, message: "User already registered" }) }

        const hashPassword = await bcrypt.hash(password, 10)
        if (user) {
            user.username = username
            user.email = normalizedEmail
            user.password = hashPassword
            user.timezone = timezone
            user.verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
            let settings = await settingsModel.findOne({ userId: user._id })
            if (!settings) {
                settings = await settingsModel.create({ userId: user._id, timezone })
                user.settingId = settings._id
            } else {
                settings.timezone = timezone
                await settings.save()
            }
            await user.save()
        } else {
            user = await userModel.create({ username, email: normalizedEmail, password: hashPassword, timezone })
            const settings = await settingsModel.create({ userId: user._id, timezone })
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
        if (!user) { return res.status(400).json({ success: false, message: "User not Registered" }) }

        const otpFile = await otpModel.findOne({ email: normalizedEmail })
        if (!otpFile) { return res.status(400).json({ success: false, message: "Otp not found" }) }

        if (otpFile.purpose === "register" && user.isVerified === true) {
            return res.status(400).json({ success: false, message: "User already verified, try to login" })
        }
        if (otpFile.purpose === "login" && user.isVerified === false) {
            return res.status(400).json({ success: false, message: "Please verify your email before logging in" })
        }
        if (!["register", "login"].includes(otpFile.purpose)) {
            return res.status(400).json({ success: false, message: "Invalid OTP request" })
        }

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

        const isLoginOtp = otpFile.purpose === "login"
        await Promise.all([
            otpModel.deleteOne({ _id: otpFile._id }),
            ...(isLoginOtp
                ? []
                : [userModel.findByIdAndUpdate(user._id, { isVerified: true })])
        ])

        const refreshToken = generateRefreshToken(user._id)
        const accessToken = generateAccessToken(user._id, user.tokenVersion || 0)
        const hashToken = crypto.createHash('sha256').update(refreshToken).digest('hex')
        const userAgent = req.headers["user-agent"] || "Unknown"
        const parser = new UAParser(userAgent)
        const result = parser.getResult()
        const { ip, location } = getLocationFromRequest(req)
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        const lastTime = new Date()
        const deviceId = crypto.randomUUID()

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
            deviceId
        })

        const notificationKey = `user_${user._id}_${crypto.randomUUID()}`
        await notificationModel.create({
            userId: user._id,
            type: 'user',
            title: isLoginOtp ? "New Login Detected" : "Welcome to NexStudy",
            message: isLoginOtp
                ? `A new login to your account was recorded on ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}. If this wasn't you, please secure your account immediately.`
                : `Hey ${user.username || "there"}, welcome aboard! Your account is all set — start by adding your subjects and setting up your timetable.`,
            status: "sent",
            notificationKey
        })

        res.cookie("diviceId_nextStudy", deviceId, {
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

        if (!["register", "reset-password", "login"].includes(purpose)) {
            return res.status(400).json({ success: false, message: "Invalid purpose" })
        }

        const user = await userModel.findOne({ email: normalizedEmail })
        if (!user) { return res.status(400).json({ success: false, message: "user not found" }) }
        if (purpose === "register" && user.isVerified === true) {
            return res.status(400).json({ success: false, message: "user already registered, please try to login" })
        }

        if (purpose === "reset-password" && user.isVerified === false) {
            return res.status(400).json({ success: false, message: "user not verified, please register first" })
        }

        if (purpose === "login" && user.isVerified === false) {
            return res.status(400).json({ success: false, message: "user not verified, please register first" })
        }

        const otpFile = await otpModel.findOne({ email: normalizedEmail })
        if (!otpFile) { return res.status(400).json({ success: false, message: "invalid user, otp not found" }) }

        const otp = generateOtp()
        const hashOtp = await bcrypt.hash(otp, 10)
        const expAt = new Date(Date.now() + 5 * 60 * 1000)

        otpFile.otp = hashOtp;
        otpFile.purpose = purpose;
        otpFile.expAt = expAt;
        otpFile.attempts = 0;
        const subject = purpose === "register" ? "Verify by Email" : purpose === "login" ? "Your one-time login code" : "Verify reset Password"

        await otpFile.save();
        await sendOtpMail(user.username, normalizedEmail, otp, subject)

        return res.status(200).json({ success: true, message: "new otp sent" })
    } catch (error) {
        console.log(error)
        return res.status(500).json({
            success: false,
            message: "Error at resend OTP Route"
        })
    }
}

// * ================== LOG IN ======================= * //

// * LOGIN - LOG IN
export const login = async (req, res) => {
    try {
        const { email, password } = req.body
        const normalizedEmail = normalizeEmail(email)

        const user = await userModel.findOne({ email: normalizedEmail })
        if (!user || !user.isVerified) { return res.status(400).json({ success: false, message: "user not found or not verified, try to signup" }) }

        const isMatch = await bcrypt.compare(password, user.password)
        if (!isMatch) { return res.status(400).json({ success: false, message: "invalid credentials" }) }

        const settings = await settingsModel.findOne({ userId: user._id })
        if (settings?.authLoginVerificationByOtp) {
            const otp = generateOtp()
            const hashOtp = await bcrypt.hash(otp, 10)
            const expAt = new Date(Date.now() + 5 * 60 * 1000)

            let userOtp = await otpModel.findOne({ email: normalizedEmail })
            if (userOtp) {
                userOtp.otp = hashOtp
                userOtp.purpose = "login"
                userOtp.attempts = 0
                userOtp.expAt = expAt
                await userOtp.save()
            } else {
                await otpModel.create({ email: normalizedEmail, otp: hashOtp, purpose: "login", expAt })
            }

            await sendOtpMail(user.username, normalizedEmail, otp, "Your one-time login code")

            return res.status(200).json({
                success: true,
                requiresTwoFactor: true,
                email: normalizedEmail,
                message: "OTP sent for two-factor authentication"
            })
        }

        const refreshToken = generateRefreshToken(user._id)
        const accessToken = generateAccessToken(user._id, user.tokenVersion || 0)
        const hashToken = crypto.createHash('sha256').update(refreshToken).digest('hex')
        const userAgent = req.headers["user-agent"] || "Unknown"
        const parser = new UAParser(userAgent)
        const result = parser.getResult()
        const { ip, location } = getLocationFromRequest(req)
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        const lastTime = new Date()
        let deviceId = req.cookies["diviceId_nextStudy"]
        if (!deviceId) {
            deviceId = crypto.randomUUID()
            res.cookie("diviceId_nextStudy", deviceId, {
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
            deviceId
        })

        const notificationKey = `user_${user._id}_${crypto.randomUUID()}`
        await notificationModel.create({
            userId: user._id,
            type: 'user',
            title: "New Login Detected",
            message: `A new login to your account was recorded on ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}. If this wasn't you, please secure your account immediately.`,
            status: "sent",
            notificationKey
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