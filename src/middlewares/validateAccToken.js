import jwt from "jsonwebtoken";
import config from "../config/config.js";
import userModel from "../models/user.model.js";

// * PROTECTOR OF ROUTES
export const verifyUser = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "No token provided" });
        }
        const token = authHeader.split(" ")[1];

        if (!token) { return res.status(401).json({ message: "Malformed token" }); }
        const decoded = jwt.verify(token, config.ACCESS_TOKEN_SECRET);

        req.userId = decoded.userId;
        next();

    } catch (error) {
        console.log(error);
        return res.status(401).json({
            message: "Error at Verify Access Token",
            success: false
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