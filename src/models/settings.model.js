import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    //* APPEARANCE
    theme: { type: String, default: "DARK", enum: ["LIGHT", "DARK"] },
    accent: {
      name: { type: String, default: "royal-blue", enum: ["royal-blue", "forest-green", "crimson-red"] },
      color: { type: String, default: "#4f6ef7", match: /^#[0-9a-fA-F]{6}$/ },
    },
    animations: { type: Boolean, default: true },
    navigation: { type: String, enum: ["def", "drg"], default: "def" },
    textSize: { type: String, enum: ["def", "sml", "big"], default: "def" },

    //* REMINDERS
    attendanceReminder: { type: Boolean, default: false },
    examReminder: { type: Boolean, default: false },
    todoReminder: { type: Boolean, default: false },
    assignmentReminder: { type: Boolean, default: false },
    weeklySummary: { type: Boolean, default: false },

    //* AUTHENTICATION
    authLoginVerificationByOtp: { type: Boolean, default: false },

    language: { type: String, default: "ENG", enum: ["ENG", "SPA", "JAP"] },
    timezone: { type: String, default: "Asia/Kolkata" },
    privacy: { type: String, enum: ["public", "private"], default: "public" },

    //* TODOS
    todoCategory: {
      type: [{ name: String }],
      default: [{ name: "Personal" }, { name: "Work" }],
    },
    fetchCompletedTodoLimit: { type: Number, default: 10 }
  },
  { timestamps: true }
);

const settingsModel = mongoose.model("Settings", settingsSchema);
export default settingsModel;