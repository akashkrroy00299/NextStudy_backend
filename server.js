import express from "express";
import cookieParser from "cookie-parser";
import authRouter from "./src/routers/auth.router.js";
import connectDB from "./src/lib/connectDB.js"
import config from "./src/config/config.js"

const app = express();
app.use(cookieParser());
app.use(express.json());

connectDB()

app.use("/api/auth", authRouter);

const PORT = config.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});