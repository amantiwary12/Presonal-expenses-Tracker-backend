// utils/attendanceAutoSync.js
// Periodically re-pulls the linked Google Sheet for every company that has
// autoSync enabled, so attendance "updates itself from the link".
import AttendanceSettings from "../models/attendanceSettings.model.js";
import { syncAttendanceFromSheet } from "../controllers/attendance.controller.js";
import { emitToCompany } from "./socket.js";

let running = false;

export const syncAllAutoSheets = async () => {
  if (running) return;
  running = true;

  try {
    const configs = await AttendanceSettings.find({
      autoSync: true,
      sheetUrl: { $ne: "" },
    });

    for (const config of configs) {
      const companyId = config.company;
      try {
        const result = await syncAttendanceFromSheet(companyId, config.sheetUrl);
        await AttendanceSettings.updateOne(
          { _id: config._id },
          {
            lastSyncedAt: new Date(),
            lastSyncResult: { ok: true, ...result, at: new Date().toISOString() },
          }
        );
        if (result.inserted + result.updated > 0) {
          emitToCompany(companyId, "attendance:bulkUpdated", {
            inserted: result.inserted,
            updated: result.updated,
          });
        }
      } catch (error) {
        await AttendanceSettings.updateOne(
          { _id: config._id },
          {
            lastSyncResult: {
              ok: false,
              error: error.message,
              at: new Date().toISOString(),
            },
          }
        );
        console.error(`ATTENDANCE AUTO-SYNC FAILED (company ${companyId}):`, error.message);
      }
    }
  } finally {
    running = false;
  }
};

// Runs once ~30s after boot, then every `intervalMs` (default: every 6 hours).
export const startAttendanceAutoSync = (intervalMs = 6 * 60 * 60 * 1000) => {
  setTimeout(syncAllAutoSheets, 30 * 1000);
  setInterval(syncAllAutoSheets, intervalMs);
};
