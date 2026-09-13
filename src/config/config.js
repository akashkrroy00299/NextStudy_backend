import dotenv from "dotenv";
dotenv.config();


if(!process.env.PORT){ throw new Error("PORT is missing")}
if(!process.env.MONGO_URL){ throw new Error("MONGO_URL is missing")}
if(!process.env.EMAIL_USER){ throw new Error("EMAIL_USER is missing")}
if(!process.env.EMAIL_PASS){ throw new Error("EMAIL_PASS is missing")}
if(!process.env.ACCESS_TOKEN_SECRET){ throw new Error("ACCESS_TOKEN_SECRET is missing")}
if(!process.env.REFRESH_TOKEN_SECRET){ throw new Error("REFRESH_TOKEN_SECRET is missing")}
if(!process.env.RESET_PASSWORD_TOKEN_SECRET){ throw new Error("RESET_PASSWORD_TOKEN_SECRET is missing")}
if(!process.env.NODE_ENV){ throw new Error("NODE_ENV is missing")}
if(!process.env.REDIS_PASSWORD){ throw new Error("REDIS_PASSWORD is missing")}
if(!process.env.REDIS_HOST){ throw new Error("REDIS_HOST is missing")}
if(!process.env.REDIS_PORT){ throw new Error("REDIS_PORT is missing")}

const config = {
    PORT : process.env.PORT,
    MONGO_URL : process.env.MONGO_URL,
    EMAIL_USER: process.env.EMAIL_USER,
    EMAIL_PASS: process.env.EMAIL_PASS,
    ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET,
    REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET,
    RESET_PASSWORD_TOKEN_SECRET: process.env.RESET_PASSWORD_TOKEN_SECRET,
    NODE_ENV: process.env.NODE_ENV || "development",
    REDIS_PASSWORD: process.env.REDIS_PASSWORD,
    REDIS_HOST: process.env.REDIS_HOST,
    REDIS_PORT: process.env.REDIS_PORT,
}

export default config