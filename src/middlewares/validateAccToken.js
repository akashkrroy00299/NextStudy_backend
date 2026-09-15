import jwt from "jsonwebtoken";
import config from "../config/config.js";
import userModel from "../models/user.model.js";

// * PROTECTOR OF ROUTES
export const verifyUser = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "No token provided" });
        }
        const token = authHeader.split(" ")[1];

        if (!token) { return res.status(401).json({ message: "Malformed token" }); }
        const decoded = jwt.verify(token, config.ACCESS_TOKEN_SECRET);

        const user = await userModel.findById(decoded.userId);
        if (!user || user.isVerified !== true) {
            return res.status(401).json({
                success: false,
                message: "Account not found or not verified"
            });
        }

        if (user.tokenVersion !== (decoded.version ?? 0)) {
            return res.status(401).json({
                success: false,
                message: "Session expired, please login again"
            });
        }

        req.userId = decoded.userId;
        next();

    } catch (error) {
        if (error.name !== "TokenExpiredError") {
            console.log(error);
        }

        return res.status(401).json({
            success: false,
            message: error.name === "TokenExpiredError"
                ? "Access token expired"
                : "Invalid access token"
        });
    }
};

export const isAdmin = async (req, res, next) => {
    try {
        const userId = req.userId;
        const user = await userModel.findById(userId);

        if (!user) {
            return res.status(401).json({ success: false, message: "User not found" });
        }

        if (user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: "Admins only can access this protected route"
            });
        }

        req.adminId = userId;
        next();

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Error at Is Admin middleware",
            success: false
        });
    }
};