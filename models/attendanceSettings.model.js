// models/attendanceSettings.model.js
// Per-company configurable attendance rules used to compute status from
// check-in/check-out times when the uploaded sheet has no explicit Status column.
import mongoose from "mongoose";

const attendanceSettingsSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      unique: true,
    },

    // "HH:MM" 24-hour format
    workStartTime: {
      type: String,
      default: "09:30",
    },

    workEndTime: {
      type: String,
      default: "18:30",
    },

    // Minutes of grace after workStartTime before a check-in counts as Late
    lateGraceMinutes: {
      type: Number,
      default: 15,
    },

    // Worked hours below this threshold count as Half Day
    halfDayThresholdHours: {
      type: Number,
      default: 4,
    },

    // Google Sheet auto-import config (set by HR/Admin via the Sync Sheet card)
    sheetUrl: {
      type: String,
      default: "",
    },

    // Whether the scheduler should keep re-pulling the sheet automatically
    autoSync: {
      type: Boolean,
      default: false,
    },

    // Last successful/failed sync info (updated by /sync-sheet and the scheduler)
    lastSyncedAt: {
      type: Date,
      default: null,
    },

    lastSyncResult: {
      type: Object,
      default: null,
    },
  },
  { timestamps: true }
);

const AttendanceSettings =
  mongoose.models.AttendanceSettings ||
  mongoose.model("AttendanceSettings", attendanceSettingsSchema);

export default AttendanceSettings;
