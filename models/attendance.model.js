// models/attendance.model.js
import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Normalized to midnight UTC so one record exists per user per calendar day
    date: {
      type: Date,
      required: true,
    },

    status: {
      type: String,
      enum: ["Present", "Absent", "Half Day", "Late"],
      required: true,
    },

    checkIn: {
      type: String, // "HH:MM" as read from the sheet, if provided
      default: null,
    },

    checkOut: {
      type: String,
      default: null,
    },

    // How the status was determined — useful when HR reviews an upload
    source: {
      type: String,
      enum: ["sheet-status", "sheet-computed", "manual"],
      required: true,
    },
  },
  { timestamps: true }
);

// One attendance record per user per day; re-uploading the same date upserts it.
attendanceSchema.index({ user: 1, date: 1 }, { unique: true });
attendanceSchema.index({ company: 1, date: 1 });

const Attendance =
  mongoose.models.Attendance || mongoose.model("Attendance", attendanceSchema);

export default Attendance;
