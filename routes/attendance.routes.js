// routes/attendance.routes.js
import express from "express";

import authMiddleware from "../middleware/auth.middleware.js";
import allowRoles from "../middleware/allowRoles.js";
import { importUpload } from "../middleware/importUpload.middleware.js";

import {
  uploadAttendance,
  syncAttendanceFromUrl,
  updateAttendanceSheetConfig,
  getMyAttendance,
  getAttendanceForUser,
  setManualAttendance,
  deleteAttendanceRecord,
  getAttendanceSummary,
  getAttendanceSettings,
  updateAttendanceSettings,
} from "../controllers/attendance.controller.js";

const router = express.Router();

/* HR/Admin upload a Google Sheet / Excel / CSV export of attendance */
router.post(
  "/upload",
  authMiddleware,
  allowRoles("Admin", "HR", "SuperAdmin"),
  importUpload.single("file"),
  uploadAttendance
);

/* HR/Admin sync attendance straight from a Google Sheets link */
router
  .route("/sync-sheet")
  .post(authMiddleware, allowRoles("Admin", "HR", "SuperAdmin"), syncAttendanceFromUrl)
  .put(authMiddleware, allowRoles("Admin", "HR", "SuperAdmin"), updateAttendanceSheetConfig);

/* Any logged-in user — their own month-wise attendance */
router.get("/my", authMiddleware, getMyAttendance);

/* HR/Admin — company-wide summary counts for a month */
router.get(
  "/summary",
  authMiddleware,
  allowRoles("Admin", "HR", "SuperAdmin"),
  getAttendanceSummary
);

/* HR/Admin — attendance settings (work hours, late/half-day thresholds) */
router
  .route("/settings")
  .get(authMiddleware, allowRoles("Admin", "HR", "SuperAdmin"), getAttendanceSettings)
  .put(authMiddleware, allowRoles("Admin", "HR", "SuperAdmin"), updateAttendanceSettings);

/* HR/Admin — a specific employee's month-wise attendance, and manual correction of a single day */
router
  .route("/user/:userId")
  .get(authMiddleware, allowRoles("Admin", "HR", "SuperAdmin"), getAttendanceForUser)
  .put(authMiddleware, allowRoles("Admin", "HR", "SuperAdmin"), setManualAttendance)
  .delete(authMiddleware, allowRoles("Admin", "HR", "SuperAdmin"), deleteAttendanceRecord);

export default router;
