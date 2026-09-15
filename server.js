import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import connectDB from "./src/lib/connectDB.js";
import { connectRedis, redisClient } from "./src/lib/redis.js";
import config from "./src/config/config.js";

// Routers
import authRouter from "./src/modules/auth/auth.route.js";
import userRouter from "./src/modules/profile/profile.route.js";
import attendanceRouter from "./src/modules/attendance/attendance.route.js";
import todosRouter from "./src/modules/todos/todos.route.js";
import notificationRouter from "./src/modules/notifications/notification.route.js"
import dashboardRouter from "./src/modules/dashboard/dashboard.route.js"

// Background Cron Jobs
import startExpireTodosJob from "./src/modules/todos/jobs/startExpireTodosJob.js";
import classNotificationJob from "./src/modules/attendance/jobs/classNotificationJob.js";
import "./src/modules/todos/jobs/todosReminder.js";

const app = express();

app.set("trust proxy", 1);

const allowedOrigins = (config.CLIENT_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

app.use(helmet());
app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));

// auth
app.use("/api/auth", authRouter);

// user
app.use("/api/user", userRouter);
app.use("/api/notification", notificationRouter);

// Activites
app.use("/api/activities/attendance", attendanceRouter);
app.use("/api/todos", todosRouter);
app.use("/api/dashboard", dashboardRouter);

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

app.use((err, req, res, next) => {
  console.error("Unhandled server error:", err);
  res.status(500).json({ success: false, message: "Internal server error" });
});

const PORT = config.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB()
    await connectRedis()

    const server = app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });

    startExpireTodosJob();
    classNotificationJob();

    const shutdown = async (signal) => {
      console.log(`${signal} received, shutting down gracefully`);
      server.close(async () => {
        await mongoose.connection.close();
        await redisClient.quit();
        process.exit(0);
      });
      setTimeout(() => process.exit(1), 10000).unref();
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
  } catch (error) {
    console.log("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();