import XLSX from "xlsx";
import Transaction from "../models/Transaction.model.js";
import Project from "../models/Project.model.js";

/*
UTILITY: Safe Date Parser
Handles:
- Excel serial numbers
- CSV strings
- Invalid values
*/
const parseDate = (value) => {
  if (!value) return new Date();

  // Excel serial number
  if (typeof value === "number") {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const parsed = new Date(
      excelEpoch.getTime() + value * 86400000
    );
    return isNaN(parsed) ? new Date() : parsed;
  }

  // String date (CSV)
  if (typeof value === "string") {
    const parsed = new Date(value);
    return isNaN(parsed) ? new Date() : parsed;
  }

  // Already Date object
  if (value instanceof Date) {
    return value;
  }

  return new Date();
};

export const importProjectData = async (req, res) => {
  try {
    const userId = req.user.id;
    const { projectId } = req.body;

    // 1. VALIDATIONS
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "File is required",
      });
    }

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: "Project ID is required",
      });
    }

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // 2. READ FILE
    const workbook = XLSX.read(req.file.buffer, {
      type: "buffer",
    });

    const sheet =
      workbook.Sheets[workbook.SheetNames[0]];

    const rows =
      XLSX.utils.sheet_to_json(sheet);

    if (!rows.length) {
      return res.status(400).json({
        success: false,
        message: "File is empty",
      });
    }

    // 3. PROCESS DATA
    let inserted = 0;
    let skipped = 0;

    const bulkData = [];

    for (const row of rows) {
      // FLEXIBLE MAPPING (handles different CSV formats)
      const amount = Number(
        row.Amount || row.amount
      );

      const type = (
        row.Type || row.type || ""
      ).toLowerCase();

      if (!amount || !type) {
        skipped++;
        continue;
      }

      const date = parseDate(
        row.Date || row.date
      );

      // Normalize date for duplicate check
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);

      const end = new Date(date);
      end.setHours(23, 59, 59, 999);

      const existing =
        await Transaction.findOne({
          project: projectId,
          amount,
          receiver:
            row.Receiver || row.receiver || "",
          date: { $gte: start, $lte: end },
        });

      if (existing) {
        skipped++;
        continue;
      }

      bulkData.push({
        user: userId,
        project: projectId,
        amount,
        type,
        category:
          row.Category ||
          row.category ||
          "General",
        receiver:
          row.Receiver ||
          row.receiver ||
          "",
        note:
          row.Note ||
          row.note ||
          "",
        date,
      });

      inserted++;
    }

    // 4. BULK INSERT (FAST)
    if (bulkData.length > 0) {
      await Transaction.insertMany(bulkData);
    }

    // 5. RESPONSE
    res.status(200).json({
      success: true,
      message: "Import completed",
      inserted,
      skipped,
      totalRows: rows.length,
    });
  } catch (error) {
    console.error("IMPORT ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};