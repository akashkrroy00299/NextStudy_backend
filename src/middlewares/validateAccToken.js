import bcrypt from "bcryptjs";
import crypto from "crypto"
import jwt from "jsonwebtoken"
import config from "../config/config.js";

export const verifyUser = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) { return res.status(401).json({ message: "No token provided" }) }
        const token = authHeader.split(" ")[1];

        if (!token) { return res.status(401).json({ message: "Malformed token" }) }
        const decoded = jwt.verify(token, config.ACCESS_TOKEN_SECRET);

        req.userId = decoded.userId;
        next();

    } catch (error) {
        console.log(error)
        return res.status(401).json({
            message: "Error at Verify Acc Token Route",
            success: false
        })
    }
}