import jwt from "jsonwebtoken"
import config from "../config/config.js"

export const generateAccessToken = (userId, version = 0) => {
    const payload = { userId, version }
    const secret = config.ACCESS_TOKEN_SECRET
    const options = { expiresIn: "15m" }
    return jwt.sign(payload, secret, options)
}

export const generateRefreshToken = (userId) => {
    const payload = { userId }
    const secret = config.REFRESH_TOKEN_SECRET
    const options = { expiresIn: "7d" }
    return jwt.sign(payload, secret, options)
}

export const generateResetPasswordToken = (userId) => {
    const payload = { userId }
    const secret = config.RESET_PASSWORD_TOKEN_SECRET
    const options = { expiresIn: "10m" }
    return jwt.sign(payload, secret, options)
}