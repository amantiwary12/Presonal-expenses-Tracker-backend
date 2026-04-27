import XLSX from "xlsx";
import Transaction from "../models/transaction.model.js";
import Project from "../models/Project.model.js";

export const importProjectData = async (req, res) => {
  try {
    const userId = req.user.id;
    const { projectId } = req.body;

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

    const workbook = XLSX.read(
      req.file.buffer,
      { type: "buffer" }
    );

    const sheetName =
      workbook.SheetNames[0];

    const sheet =
      workbook.Sheets[sheetName];

    const rows =
      XLSX.utils.sheet_to_json(sheet);

    if (rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Excel is empty",
      });
    }

    const transactions = [];

    for (const row of rows) {
      if (!row.Amount || !row.Type) continue;

      transactions.push({
        user: userId,
        project: projectId,

        amount: Number(row.Amount),

        type:
          row.Type.toLowerCase(),

        category:
          row.Category || "General",

        receiver:
          row.Receiver || "",

        note:
          row.Note || "",

        date:
          row.Date
            ? new Date(row.Date)
            : new Date(),
      });
    }

    await Transaction.insertMany(
      transactions
    );

    res.status(200).json({
      success: true,
      message: "Import successful",
      totalImported:
        transactions.length,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Import failed",
    });
  }
};