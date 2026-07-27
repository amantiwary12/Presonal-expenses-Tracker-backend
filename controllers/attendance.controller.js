// controllers/attendance.controller.js
import XLSX from "xlsx";
import Attendance from "../models/attendance.model.js";
import AttendanceSettings from "../models/attendanceSettings.model.js";
import User from "../models/user.model.js";
import { emitToCompany } from "../utils/socket.js";

/*
UTILITY: Safe Date Parser (mirrors controllers/import.controller.js)
Handles Excel serial numbers, CSV/string dates, and Date objects.
*/
const parseDate = (value) => {
  if (!value) return null;

  if (typeof value === "number") {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const parsed = new Date(excelEpoch.getTime() + value * 86400000);
    return isNaN(parsed) ? null : parsed;
  }

  if (typeof value === "string") {
    const parsed = new Date(value);
    return isNaN(parsed) ? null : parsed;
  }

  if (value instanceof Date) {
    return value;
  }

  return null;
};

/*
UTILITY: Parse a time-of-day value (from a Check In / Check Out column) into
minutes-since-midnight. Handles Excel time serials (fraction of a day),
"HH:MM" / "H:MM AM/PM" strings, and Date objects.
*/
const parseTimeToMinutes = (value) => {
  if (value === undefined || value === null || value === "") return null;

  if (typeof value === "number") {
    const frac = value % 1;
    return Math.round(frac * 24 * 60);
  }

  if (value instanceof Date) {
    return value.getHours() * 60 + value.getMinutes();
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?$/);
    if (!match) return null;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const meridiem = match[3]?.toUpperCase();
    if (meridiem === "PM" && hours !== 12) hours += 12;
    if (meridiem === "AM" && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }

  return null;
};

const minutesToHHMM = (minutes) => {
  if (minutes === null || minutes === undefined) return null;
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const m = (minutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
};

const STATUS_MAP = {
  present: "Present",
  p: "Present",
  absent: "Absent",
  a: "Absent",
  leave: "Absent",
  "on leave": "Absent",
  "half day": "Half Day",
  halfday: "Half Day",
  "half-day": "Half Day",
  hd: "Half Day",
  late: "Late",
  l: "Late",
};

const computeStatus = (checkInMin, checkOutMin, settings) => {
  if (checkInMin === null) return "Absent";

  const [startH, startM] = settings.workStartTime.split(":").map(Number);
  const workStartMin = startH * 60 + startM;
  const lateThreshold = workStartMin + settings.lateGraceMinutes;

  if (checkOutMin !== null) {
    let workedMinutes = checkOutMin - checkInMin;
    if (workedMinutes < 0) workedMinutes += 24 * 60; // crossed midnight
    if (workedMinutes / 60 < settings.halfDayThresholdHours) {
      return "Half Day";
    }
  }

  if (checkInMin > lateThreshold) {
    return "Late";
  }

  return "Present";
};

const monthRange = (month, year) => {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  return { start, end };
};

// ─────────────────────────────────────────────
// POST /api/attendance/upload  (HR/Admin)
// ─────────────────────────────────────────────
export const uploadAttendance = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "File is required" });
    }

    const companyId = req.user.company?._id || req.user.company;
    if (!companyId) {
      return res.status(400).json({ success: false, message: "User has no company assigned" });
    }

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    if (!rows.length) {
      return res.status(400).json({ success: false, message: "File is empty" });
    }

    let settings = await AttendanceSettings.findOne({ company: companyId });
    if (!settings) {
      settings = await AttendanceSettings.create({ company: companyId });
    }

    const companyUsers = await User.find({ company: companyId }).select("name mobileNumber");

    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    const skippedDetails = [];

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      const rowNum = index + 2; // +1 for header row, +1 for 1-index

      const rawMobile = String(
        row.Mobile || row.mobile || row["Mobile Number"] || row.Phone || row.phone || row.MobileNumber || ""
      ).trim();
      const rawName = String(
        row.Name || row.name || row.Employee || row.employee || row["Employee Name"] || ""
      ).trim();

      let matchedUser = null;
      if (rawMobile) {
        matchedUser = companyUsers.find((u) => u.mobileNumber === rawMobile);
      }
      if (!matchedUser && rawName) {
        const matches = companyUsers.filter(
          (u) => u.name.trim().toLowerCase() === rawName.toLowerCase()
        );
        if (matches.length === 1) matchedUser = matches[0];
        else if (matches.length > 1) {
          skipped++;
          skippedDetails.push({
            row: rowNum,
            reason: `Multiple employees named "${rawName}" — use Mobile Number column to disambiguate`,
          });
          continue;
        }
      }

      if (!matchedUser) {
        skipped++;
        skippedDetails.push({
          row: rowNum,
          reason: `No matching employee for "${rawMobile || rawName || "unknown"}"`,
        });
        continue;
      }

      const parsedDate = parseDate(row.Date || row.date);
      if (!parsedDate) {
        skipped++;
        skippedDetails.push({ row: rowNum, reason: "Missing or invalid date" });
        continue;
      }
      parsedDate.setUTCHours(0, 0, 0, 0);

      const rawStatus = String(row.Status || row.status || "").trim().toLowerCase();
      let status = STATUS_MAP[rawStatus] || null;
      let source = "sheet-status";

      const checkInRaw =
        row["Check In"] ?? row.CheckIn ?? row["Check-In"] ?? row.checkin ?? row["Check In Time"] ?? row.CheckInTime;
      const checkOutRaw =
        row["Check Out"] ??
        row.CheckOut ??
        row["Check-Out"] ??
        row.checkout ??
        row["Check Out Time"] ??
        row.CheckOutTime;
      const checkInMin = parseTimeToMinutes(checkInRaw);
      const checkOutMin = parseTimeToMinutes(checkOutRaw);

      if (!status) {
        if (checkInMin !== null || checkInRaw !== undefined) {
          status = computeStatus(checkInMin, checkOutMin, settings);
          source = "sheet-computed";
        } else {
          skipped++;
          skippedDetails.push({
            row: rowNum,
            reason: "No recognizable Status and no Check-In time to calculate from",
          });
          continue;
        }
      }

      const result = await Attendance.findOneAndUpdate(
        { user: matchedUser._id, date: parsedDate },
        {
          company: companyId,
          user: matchedUser._id,
          date: parsedDate,
          status,
          checkIn: minutesToHHMM(checkInMin),
          checkOut: minutesToHHMM(checkOutMin),
          source,
        },
        { upsert: true, new: true, rawResult: true }
      );

      if (result.lastErrorObject?.updatedExisting) {
        updated++;
      } else {
        inserted++;
      }
    }

    if (inserted + updated > 0) {
      emitToCompany(companyId, "attendance:bulkUpdated", { inserted, updated });
    }

    res.status(200).json({
      success: true,
      message: "Attendance import completed",
      inserted,
      updated,
      skipped,
      totalRows: rows.length,
      skippedDetails: skippedDetails.slice(0, 50),
    });
  } catch (error) {
    console.error("ATTENDANCE UPLOAD ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────
// GET /api/attendance/my?month=&year=
// ─────────────────────────────────────────────
export const getMyAttendance = async (req, res) => {
  try {
    const month = parseInt(req.query.month, 10);
    const year = parseInt(req.query.year, 10);
    if (!month || !year) {
      return res.status(400).json({ success: false, message: "month and year query params are required" });
    }

    const { start, end } = monthRange(month, year);

    const records = await Attendance.find({
      user: req.user._id,
      date: { $gte: start, $lt: end },
    }).sort({ date: 1 });

    res.status(200).json({ success: true, records });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────
// GET /api/attendance/user/:userId?month=&year=  (HR/Admin)
// ─────────────────────────────────────────────
export const getAttendanceForUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const month = parseInt(req.query.month, 10);
    const year = parseInt(req.query.year, 10);
    if (!month || !year) {
      return res.status(400).json({ success: false, message: "month and year query params are required" });
    }

    const companyId = req.user.company?._id || req.user.company;
    const targetUser = await User.findOne({ _id: userId, company: companyId }).select(
      "name mobileNumber role"
    );
    if (!targetUser) {
      return res.status(404).json({ success: false, message: "User not found in your company" });
    }

    const { start, end } = monthRange(month, year);

    const records = await Attendance.find({
      user: userId,
      company: companyId,
      date: { $gte: start, $lt: end },
    }).sort({ date: 1 });

    res.status(200).json({ success: true, user: targetUser, records });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────
// PUT /api/attendance/user/:userId  (HR/Admin) — manually set/correct one day
// ─────────────────────────────────────────────
export const setManualAttendance = async (req, res) => {
  try {
    const { userId } = req.params;
    const { date, status, checkIn, checkOut } = req.body;

    const validStatuses = ["Present", "Absent", "Half Day", "Late"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `status must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const parsedDate = parseDate(date);
    if (!parsedDate) {
      return res.status(400).json({ success: false, message: "Missing or invalid date" });
    }
    parsedDate.setUTCHours(0, 0, 0, 0);

    const companyId = req.user.company?._id || req.user.company;
    const targetUser = await User.findOne({ _id: userId, company: companyId });
    if (!targetUser) {
      return res.status(404).json({ success: false, message: "User not found in your company" });
    }

    const record = await Attendance.findOneAndUpdate(
      { user: userId, date: parsedDate },
      {
        company: companyId,
        user: userId,
        date: parsedDate,
        status,
        checkIn: checkIn || null,
        checkOut: checkOut || null,
        source: "manual",
      },
      { upsert: true, new: true }
    );

    emitToCompany(companyId, "attendance:updated", record);

    res.status(200).json({ success: true, message: "Attendance updated", record });
  } catch (error) {
    console.error("MANUAL ATTENDANCE UPDATE ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────
// DELETE /api/attendance/user/:userId?date=  (HR/Admin) — clear a mismarked day
// ─────────────────────────────────────────────
export const deleteAttendanceRecord = async (req, res) => {
  try {
    const { userId } = req.params;
    const parsedDate = parseDate(req.query.date);
    if (!parsedDate) {
      return res.status(400).json({ success: false, message: "Missing or invalid date query param" });
    }
    parsedDate.setUTCHours(0, 0, 0, 0);

    const companyId = req.user.company?._id || req.user.company;

    const record = await Attendance.findOneAndDelete({
      user: userId,
      company: companyId,
      date: parsedDate,
    });

    if (!record) {
      return res.status(404).json({ success: false, message: "No attendance record found for that date" });
    }

    emitToCompany(companyId, "attendance:deleted", { userId, date: parsedDate });

    res.status(200).json({ success: true, message: "Attendance record deleted" });
  } catch (error) {
    console.error("DELETE ATTENDANCE ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────
// GET /api/attendance/summary?month=&year=  (HR/Admin)
// ─────────────────────────────────────────────
export const getAttendanceSummary = async (req, res) => {
  try {
    const month = parseInt(req.query.month, 10);
    const year = parseInt(req.query.year, 10);
    if (!month || !year) {
      return res.status(400).json({ success: false, message: "month and year query params are required" });
    }

    const companyId = req.user.company?._id || req.user.company;
    const { start, end } = monthRange(month, year);

    const users = await User.find({ company: companyId, isActive: true }).select(
      "name mobileNumber role"
    );

    const records = await Attendance.find({
      company: companyId,
      date: { $gte: start, $lt: end },
    });

    const summary = users.map((u) => {
      const userRecords = records.filter((r) => r.user.toString() === u._id.toString());
      const counts = { Present: 0, Absent: 0, "Half Day": 0, Late: 0 };
      userRecords.forEach((r) => {
        counts[r.status] = (counts[r.status] || 0) + 1;
      });
      return {
        user: { _id: u._id, name: u.name, mobileNumber: u.mobileNumber, role: u.role },
        counts,
        totalMarked: userRecords.length,
      };
    });

    res.status(200).json({ success: true, month, year, summary });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────
// GET /api/attendance/settings  (HR/Admin)
// ─────────────────────────────────────────────
export const getAttendanceSettings = async (req, res) => {
  try {
    const companyId = req.user.company?._id || req.user.company;
    let settings = await AttendanceSettings.findOne({ company: companyId });
    if (!settings) {
      settings = await AttendanceSettings.create({ company: companyId });
    }
    res.status(200).json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────
// PUT /api/attendance/settings  (HR/Admin)
// ─────────────────────────────────────────────
export const updateAttendanceSettings = async (req, res) => {
  try {
    const companyId = req.user.company?._id || req.user.company;
    const { workStartTime, workEndTime, lateGraceMinutes, halfDayThresholdHours } = req.body;

    const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (workStartTime && !timePattern.test(workStartTime)) {
      return res
        .status(400)
        .json({ success: false, message: "workStartTime must be in HH:MM 24-hour format" });
    }
    if (workEndTime && !timePattern.test(workEndTime)) {
      return res
        .status(400)
        .json({ success: false, message: "workEndTime must be in HH:MM 24-hour format" });
    }

    const settings = await AttendanceSettings.findOneAndUpdate(
      { company: companyId },
      {
        company: companyId,
        ...(workStartTime && { workStartTime }),
        ...(workEndTime && { workEndTime }),
        ...(lateGraceMinutes !== undefined && { lateGraceMinutes: Number(lateGraceMinutes) }),
        ...(halfDayThresholdHours !== undefined && {
          halfDayThresholdHours: Number(halfDayThresholdHours),
        }),
      },
      { upsert: true, new: true }
    );

    emitToCompany(companyId, "attendance:settingsUpdated", settings);

    res.status(200).json({ success: true, message: "Attendance settings updated", settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
