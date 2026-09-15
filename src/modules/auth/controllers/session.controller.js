import crypto from "crypto"
import jwt from "jsonwebtoken"
import config from "../../../config/config.js";
import sessionModel from "../../../models/session.model.js";
import userModel from "../../../models/user.model.js";
import { generateAccessToken, generateRefreshToken } from "../../../utils/generateTokens.js";


// * RES ACCTOKEN
export const refreshAccessToken = async (req, res) => {
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
        const user = await userModel.findById(userId).select("tokenVersion")
        const newAccessToken = generateAccessToken(userId, user?.tokenVersion ?? 0)
        const hashRefToken = crypto.createHash('sha256').update(newRefreshToken).digest('hex')

        const updated = await sessionModel.findOneAndUpdate(
            {
                _id: session._id,
                revoked: false,
                $or: [
                    { refreshTokenHash: hashToken },
                    { previousRefreshTokenHash: hashToken, previousTokenExpiresAt: { $gt: new Date() } }
                ]
            },
            {
                $set: {
                    lastTime: new Date(),
                    previousRefreshTokenHash: session.refreshTokenHash,
                    previousTokenExpiresAt: new Date(Date.now() + 60 * 1000),
                    refreshTokenHash: hashRefToken,
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                }
            },
            { new: true }
        );

        if (!updated) {
            res.clearCookie("refreshToken", {
                httpOnly: true,
                secure: config.NODE_ENV === "production",
                sameSite: "strict"
            });
            return res.status(401).json({ success: false, message: "Try to Login" })
        }

        res.cookie("refreshToken", newRefreshToken, {
            httpOnly: true,
            secure: config.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000
        })

        return res.status(200).json({
            success: true,
            token: newAccessToken,
            sessionId: updated._id,
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
        await userModel.updateOne({ _id: userId }, { $inc: { tokenVersion: 1 } })
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
            return res.status(401).json({ success: false, message: "Invalid or expired refresh token" })
        }

        await sessionModel.updateMany(
            { userId, revoked: false },
            { $set: { revoked: true } }
        );

        await userModel.updateOne({ _id: userId }, { $inc: { tokenVersion: 1 } })

        res.clearCookie("refreshToken", {
            httpOnly: true,
            secure: config.NODE_ENV === "production",
            sameSite: "strict"
        });

        return res.status(200).json({ success: true, message: "Logout from all devices successful" })

    } catch (error) {
        console.log(error)
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
}