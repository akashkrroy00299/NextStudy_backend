import mongoose from "mongoose";
import config from "../config/config.js";

// import dns from "dns"
// dns.setServers(["8.8.8.8", "8.8.4.4"])

const connectDB = async () => {
    try {
        await mongoose.connect(config.MONGO_URL)
        console.log("mongoDB connected")
    } catch (error) {
        console.log("Error at ConnectDB", error)
        process.exit(1)
    }
}

export default connectDB