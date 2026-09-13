import { createClient } from "redis";
import config from "../config/config.js";

const redisClient = createClient({
  username: "default",
  password: config.REDIS_PASSWORD,
  socket: {
    host: config.REDIS_HOST,
    port: config.REDIS_PORT,
    // tls: true,
  },
});

redisClient.on("error", (err) => console.error("Redis Client Error", err));
redisClient.on("connect", () => console.log("Redis connected"));

const connectRedis = async () => {
  await redisClient.connect();
};

export { redisClient, connectRedis };