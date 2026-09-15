import dotenv from "dotenv";
dotenv.config();

const defaults = {
    PORT: process.env.PORT || "5000",
    NODE_ENV: process.env.NODE_ENV || "development",
    CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || "http://localhost:5173",
}

if(!process.env.MONGO_URL){ throw new Error("MONGO_URL is missing")}
if(!process.env.EMAIL_USER){ throw new Error("EMAIL_USER is missing")}
if(!process.env.EMAIL_PASS){ throw new Error("EMAIL_PASS is missing")}
if(!process.env.ACCESS_TOKEN_SECRET){ throw new Error("ACCESS_TOKEN_SECRET is missing")}
if(!process.env.REFRESH_TOKEN_SECRET){ throw new Error("REFRESH_TOKEN_SECRET is missing")}
if(!process.env.RESET_PASSWORD_TOKEN_SECRET){ throw new Error("RESET_PASSWORD_TOKEN_SECRET is missing")}

const config = {
    PORT : Number(defaults.PORT),
    MONGO_URL : process.env.MONGO_URL,
    EMAIL_USER: process.env.EMAIL_USER,
    EMAIL_PASS: process.env.EMAIL_PASS,
    ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET,
    REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET,
    RESET_PASSWORD_TOKEN_SECRET: process.env.RESET_PASSWORD_TOKEN_SECRET,
    NODE_ENV: defaults.NODE_ENV,
    CLIENT_ORIGIN: defaults.CLIENT_ORIGIN,
    REDIS_PASSWORD: process.env.REDIS_PASSWORD || "",
    REDIS_HOST: process.env.REDIS_HOST || "127.0.0.1",
    REDIS_PORT: Number(process.env.REDIS_PORT || 6379),
}

export default config