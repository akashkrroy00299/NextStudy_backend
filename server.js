import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import connectDB from "./src/lib/connectDB.js";
import config from "./src/config/config.js";

// Routers
import authRouter from "./src/routers/auth.route.js";
import userRouter from "./src/routers/userProfile.route.js";
import attendanceRouter from "./src/routers/attendance.route.js";
import todosRouter from "./src/routers/todos.route.js";
import notificationRouter from "./src/routers/notification.route.js"

// Background Cron Jobs
import startExpireTodosJob from "./src/jobs/startExpireTodosJob.js";
import classNotificationJob from "./src/jobs/classNotificationJob.js"

const app = express();

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true,
}));

app.use(cookieParser());
app.use(express.json());

// auth
app.use("/api/auth", authRouter);

// user
app.use("/api/user", userRouter);
app.use("/api/notification", notificationRouter);

// Activites
app.use("/api/activites/attendance", attendanceRouter);
app.use("/api/todos", todosRouter);

const PORT = config.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });

    startExpireTodosJob();
    classNotificationJob();
  } catch (error) {
    console.log("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();