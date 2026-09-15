import { createClient } from "redis";
import config from "../config/config.js";

const isProduction = config.NODE_ENV === "production";

const redisClient = createClient({
  ...(config.REDIS_PASSWORD ? { username: "default", password: config.REDIS_PASSWORD } : {}),
  socket: {
    host: config.REDIS_HOST,
    port: config.REDIS_PORT,
    reconnectStrategy: (retries) => Math.min(Math.max(retries * 500, 1000), 5000),
    ...(isProduction && { tls: true }),
  },
});

redisClient.on("error", (err) => console.error("Redis Client Error", err));
redisClient.on("connect", () => console.log("Redis connected"));
redisClient.on("reconnecting", () => console.log("Redis reconnecting..."));
redisClient.on("end", () => console.log("Redis connection closed"));

const connectRedis = async () => {
  await redisClient.connect();
};

export { redisClient, connectRedis };