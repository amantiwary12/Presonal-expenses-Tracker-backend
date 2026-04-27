//transaction controller
import Transaction from "../models/transaction.model.js";
import ExcelJS from "exceljs";
import Budget from "../models/Budget.model.js";
import Project from "../models/Project.model.js";
import { sendNotification } from "../utils/sendNotification.js";
import mongoose from "mongoose";
import fs from "fs";
import cloudinary from "../config/cloudinary.js";

const buildUserFilter = (req) => {
  const filter = {};

  // Employees see only their own data
  if (req.user.role === "Employee") {
    filter.user = req.user._id;
  }

  // Admin / Manager / FinanceManager see all
  return filter;
};  

export const createTransaction = async (req, res) => {
  try {
    const amount = Number(req.body.amount);

    if (!amount || amount <= 0 || isNaN(amount)) {
      return res.status(400).json({
        success: false,
        message: "Valid amount is required",
      });
    }

    if (!req.body.category) {
      return res.status(400).json({
        success: false,
        message: "Category is required",
      });
    }

    if (!["income", "expense"].includes(req.body.type)) {
      return res.status(400).json({
        success: false,
        message: "Type must be income or expense",
      });
    }

    let project = null;

    if (req.body.project) {
      project = await Project.findOne({
        _id: req.body.project,
        user: req.user._id,
      });

      if (!project) {
        return res.status(404).json({
          success: false,
          message: "Project not found",
        });
      }

      if (project.status === "completed") {
        return res.status(400).json({
          success: false,
          message: "Cannot add transaction to completed project",
        });
      }
    }

    const transaction = await Transaction.create({
      user: req.user._id,
      amount,
      receiver: req.body.receiver,
      date: req.body.date || new Date(),
      category: req.body.category,
      type: req.body.type,
      note: req.body.note,
      project: project?._id || null,

      screenshot: req.file
        ? {
            url: req.file.path,
            public_id: req.file.filename,
          }
        : null,
    });

    await sendNotification({
      userId: req.user,
      title: "New Transaction",
      message: "Transaction added successfully",
      type: "transaction",
    });

    res.status(201).json({
      success: true,
      transaction,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getDailyExpenses = async (req, res) => {
  try {
    const { startDate, endDate, project } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "startDate and endDate are required",
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start) || isNaN(end)) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format",
      });
    }

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    // Build match stage based on user role
    const matchStage = {
      type: "expense",
      date: {
        $gte: start,
        $lte: end,
      },
    };

    // Admin/Manager see all users, Employee sees only their own
    if (req.user.role === "Employee") {
      matchStage.user = new mongoose.Types.ObjectId(req.user._id);
    }
    // For Admin/Manager - no user filter (shows all users)

    if (project) {
      matchStage.project = project;
    }

    const expenses = await Transaction.aggregate([
      {
        $match: matchStage,
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$date",
              timezone: "Asia/Kolkata",
            },
          },
          total: {
            $sum: "$amount",
          },
        },
      },
      {
        $sort: {
          _id: 1,
        },
      },
    ]);

    res.status(200).json({
      success: true,
      count: expenses.length,
      data: expenses,
    });
  } catch (error) {
    console.error("DAILY EXPENSE ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// getTransactions with pagination, filtering by type, category and date range

export const getTransactions = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      startDate,
      endDate,
      type,
      category,
      project,
    } = req.query;

    const pageNumber = Number(page);
    const limitNumber = Number(limit);

    let query = {};

    // Role-based filter - Admin sees all, Employee sees only own
    if (req.user.role === "Employee") {
      query.user = req.user._id;
    }
    // For Admin/Manager - no user filter (shows all users)

    if (type) query.type = type;
    if (category) query.category = category;
    if (project) query.project = project;

    if (search) {
      query.$or = [
        { receiver: { $regex: search, $options: "i" } },
        { note: { $regex: search, $options: "i" } },
      ];
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setDate(end.getDate() + 1);
        query.date.$lt = end;
      }
    }

    const transactions = await Transaction.find(query)
      .populate('user', 'name mobileNumber role')
      .sort({ date: -1 })
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber);

    const total = await Transaction.countDocuments(query);

    res.status(200).json({
      success: true,
      total,
      page: pageNumber,
      totalPages: Math.ceil(total / limitNumber),
      transactions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// getWeeklySummary

export const getWeeklySummary = async (req, res) => {
  try {
    const now = new Date();
    const { project } = req.query;

    // Start of week (Monday)
    const startOfWeek = new Date(now);
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    // Build match stage based on user role
    const match = {
      date: {
        $gte: startOfWeek,
        $lt: endOfWeek,
      },
    };

    // Project filter
    if (project) {
      match.project = project;
    }

    // Role-based filter - Admin sees all, Employee sees only own
    if (req.user.role === "Employee") {
      match.user = req.user._id;
    }
    // For Admin/Manager - no user filter (shows all users)

    const summary = await Transaction.aggregate([
      {
        $match: match,
      },
      {
        $group: {
          _id: "$type",
          total: {
            $sum: "$amount",
          },
        },
      },
    ]);

    let income = 0;
    let expense = 0;

    summary.forEach((item) => {
      if (item._id === "income") {
        income = item.total;
      }
      if (item._id === "expense") {
        expense = item.total;
      }
    });

    res.status(200).json({
      success: true,
      period: "weekly",
      income,
      expense,
      balance: income - expense,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// getMonthlySummary

export const getMonthlySummary = async (req, res) => {
  try {
    const month = Number(req.query.month);
    const year = Number(req.query.year);
    const { project } = req.query;

    if (!month || month < 1 || month > 12 || !year || year < 2000) {
      return res.status(400).json({
        success: false,
        message: "Invalid month or year",
      });
    }

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);

    // Build match stage based on user role
    const match = {
      date: {
        $gte: start,
        $lt: end,
      },
    };

    if (project) {
      match.project = project;
    }

    // Role-based filter - Admin sees all, Employee sees only own
    if (req.user.role === "Employee") {
      match.user = req.user._id;
    }

    const summary = await Transaction.aggregate([
      {
        $match: match,
      },
      {
        $group: {
          _id: "$type",
          total: {
            $sum: "$amount",
          },
        },
      },
    ]);

    let income = 0;
    let expense = 0;

    summary.forEach((item) => {
      if (item._id === "income") income = item.total;
      if (item._id === "expense") expense = item.total;
    });

    res.status(200).json({
      success: true,
      month,
      year,
      income,
      expense,
      balance: income - expense,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// getYearlySummary

export const getYearlySummary = async (req, res) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();

    const { project } = req.query;

    const startOfYear = new Date(year, 0, 1);

    const endOfYear = new Date(year + 1, 0, 1);

    const summary = await Transaction.aggregate([
      {
        $match: {
          user: req.user._id,
          ...(project && { project }),
          date: {
            $gte: startOfYear,
            $lt: endOfYear,
          },
        },
      },
      {
        $group: {
          _id: "$type",
          total: {
            $sum: "$amount",
          },
        },
      },
    ]);

    let income = 0;
    let expense = 0;

    summary.forEach((item) => {
      if (item._id === "income") income = item.total;

      if (item._id === "expense") expense = item.total;
    });

    res.status(200).json({
      success: true,
      year,
      income,
      expense,
      balance: income - expense,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// getCategorySummary

export const getCategorySummary = async (req, res) => {
  try {
    const { startDate, endDate, project } = req.query;

    const matchStage = {
      user: req.user._id,
      type: "expense",
    };

    if (project) {
      matchStage.project = project;
    }

    if (startDate || endDate) {
      matchStage.date = {};

      if (startDate && !isNaN(new Date(startDate))) {
        matchStage.date.$gte = new Date(startDate);
      }

      if (endDate && !isNaN(new Date(endDate))) {
        const end = new Date(endDate);

        end.setDate(end.getDate() + 1);

        matchStage.date.$lt = end;
      }
    }

    const summary = await Transaction.aggregate([
      {
        $match: matchStage,
      },
      {
        $addFields: {
          category: {
            $ifNull: ["$category", "Uncategorized"],
          },
        },
      },
      {
        $group: {
          _id: "$category",
          total: {
            $sum: "$amount",
          },
          count: {
            $sum: 1,
          },
        },
      },
      {
        $sort: {
          total: -1,
        },
      },
    ]);

    res.status(200).json({
      success: true,
      summary,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// deleteTransaction

export const deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction ID",
      });
    }

    let query = { _id: id };

    // Employee can delete only own (if ever allowed)
    if (req.user.role === "Employee") {
      query.user = req.user._id;
    }

    const transaction = await Transaction.findOneAndDelete(query);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    // delete screenshot
    if (transaction.screenshot?.public_id) {
      await cloudinary.uploader.destroy(
        transaction.screenshot.public_id
      );
    }

    res.status(200).json({
      success: true,
      message: "Transaction deleted successfully",
      deletedTransactionId: id,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
// updateTransaction

export const updateTransaction = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction ID",
      });
    }

    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No data provided to update",
      });
    }

    const existingTransaction = await Transaction.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!existingTransaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    if (existingTransaction.project) {
      const project = await Project.findById(existingTransaction.project);

      if (project && project.status === "completed") {
        return res.status(400).json({
          success: false,
          message: "Cannot update transaction in completed project",
        });
      }
    }

    const updateData = {
      ...req.body,
    };

    if (req.file) {
      // Delete old screenshot from Cloudinary
      if (
        existingTransaction.screenshot &&
        existingTransaction.screenshot.public_id
      ) {
        await cloudinary.uploader.destroy(
          existingTransaction.screenshot.public_id,
        );
      }

      // Save new screenshot
      updateData.screenshot = {
        url: req.file.path,
        public_id: req.file.filename,
      };
    }

    if (updateData.type === "expense" && updateData.project) {
      const project = await Project.findById(updateData.project);

      const expenses = await Transaction.aggregate([
        {
          $match: {
            project: project._id,
            type: "expense",
            _id: {
              $ne: existingTransaction._id,
            },
          },
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: "$amount",
            },
          },
        },
      ]);

      const totalSpent = expenses[0]?.total || 0;

      const newAmount = updateData.amount ?? existingTransaction.amount;

      if (totalSpent + newAmount > project.budget) {
        return res.status(400).json({
          success: false,
          message: "Project budget exceeded",
        });
      }
    }

    const transaction = await Transaction.findOneAndUpdate(
      {
        _id: req.params.id,
        user: req.user._id,
      },
      updateData,
      {
        new: true,
        runValidators: true,
      },
    );

    res.status(200).json({
      success: true,
      transaction,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// getSummary

export const getSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const matchStage = {
      user: req.user._id,
    };

    if (startDate || endDate) {
      matchStage.date = {};

      if (startDate && !isNaN(new Date(startDate))) {
        matchStage.date.$gte = new Date(startDate);
      }

      if (endDate && !isNaN(new Date(endDate))) {
        const end = new Date(endDate);

        end.setDate(end.getDate() + 1);

        matchStage.date.$lt = end;
      }
    }

    const summary = await Transaction.aggregate([
      {
        $match: matchStage,
      },
      {
        $group: {
          _id: "$type",
          total: {
            $sum: "$amount",
          },
        },
      },
    ]);

    let income = 0;
    let expense = 0;

    summary.forEach((item) => {
      if (item._id === "income") income = item.total;

      if (item._id === "expense") expense = item.total;
    });

    res.status(200).json({
      success: true,
      totalIncome: income,
      totalExpense: expense,
      balance: income - expense,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// getCategoryByTypeSummary
export const getCategoryByTypeSummary = async (req, res) => {
  try {
    const { type, startDate, endDate, project } = req.query;

    const match = {
      user: req.user._id,
    };

    if (type) {
      const allowedTypes = ["income", "expense"];

      if (!allowedTypes.includes(type)) {
        return res.status(400).json({
          success: false,
          message: "Invalid transaction type",
        });
      }

      match.type = type;
    }

    if (project) {
      match.project = project;
    }

    if (startDate || endDate) {
      match.date = {};

      if (startDate && !isNaN(new Date(startDate))) {
        match.date.$gte = new Date(startDate);
      }

      if (endDate && !isNaN(new Date(endDate))) {
        const end = new Date(endDate);

        end.setDate(end.getDate() + 1);

        match.date.$lt = end;
      }
    }

    const summary = await Transaction.aggregate([
      {
        $match: match,
      },
      {
        $addFields: {
          category: {
            $ifNull: ["$category", "Uncategorized"],
          },
        },
      },
      {
        $group: {
          _id: "$category",
          total: {
            $sum: "$amount",
          },
        },
      },
      {
        $sort: {
          total: -1,
        },
      },
    ]);

    res.status(200).json({
      success: true,
      summary,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
// getDashboardData

export const getDashboardData = async (req, res) => {
  try {
   const match = {};

// Only Employee restricted
if (req.user.role === "Employee") {
  match.user = req.user._id;
}

const result = await Transaction.aggregate([
  {
    $match: match,
  },
      {
        $facet: {
          totals: [
            {
              $group: {
                _id: "$type",
                total: {
                  $sum: "$amount",
                },
              },
            },
          ],

          categorySummary: [
            {
              $match: {
                type: "expense",
              },
            },
            {
              $addFields: {
                category: {
                  $ifNull: ["$category", "Uncategorized"],
                },
              },
            },
            {
              $group: {
                _id: "$category",
                total: {
                  $sum: "$amount",
                },
              },
            },
            {
              $sort: {
                total: -1,
              },
            },
          ],
        },
      },
    ]);

    let income = 0;
    let expense = 0;

    result[0].totals.forEach((item) => {
      if (item._id === "income") income = item.total;

      if (item._id === "expense") expense = item.total;
    });

    res.status(200).json({
      success: true,
      totalIncome: income,
      totalExpense: expense,
      balance: income - expense,
      categorySummary: result[0].categorySummary,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//exportTransactions in excljs

export const exportTransactions = async (req, res) => {
  try {
    const { startDate, endDate, type, category, project } = req.query;

    const query = {
      user: req.user._id,
    };

    if (type) query.type = type;
    if (category) query.category = category;
    if (project) query.project = project;

    if (startDate || endDate) {
      query.date = {};

      if (startDate && !isNaN(new Date(startDate))) {
        query.date.$gte = new Date(startDate);
      }

      if (endDate && !isNaN(new Date(endDate))) {
        const end = new Date(endDate);

        end.setDate(end.getDate() + 1);

        query.date.$lt = end;
      }
    }

    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .lean();

    if (!transactions.length) {
      return res.status(404).json({
        success: false,
        message: "No transactions found",
      });
    }

    const workbook = new ExcelJS.Workbook();

    const worksheet = workbook.addWorksheet("Transactions");

    worksheet.columns = [
      {
        header: "Amount",
        key: "amount",
        width: 15,
      },
      {
        header: "Type",
        key: "type",
        width: 15,
      },
      {
        header: "Category",
        key: "category",
        width: 20,
      },
      {
        header: "Receiver",
        key: "receiver",
        width: 25,
      },
      {
        header: "Date",
        key: "date",
        width: 20,
      },
      {
        header: "Note",
        key: "note",
        width: 30,
      },
    ];

    worksheet.getRow(1).font = {
      bold: true,
    };

    transactions.forEach((txn) => {
      worksheet.addRow({
        amount: txn.amount,
        type: txn.type,
        category: txn.category || "Uncategorized",
        receiver: txn.receiver || "-",
        date: new Date(txn.date).toLocaleDateString(),
        note: txn.note || "-",
      });
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=transactions.xlsx",
    );

    await workbook.xlsx.write(res);

    res.end();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const clearTransactions = async (req, res) => {
  try {
    await Transaction.deleteMany({
      user: req.user._id,
    });

    res.status(200).json({
      success: true,
      message: "All transactions cleared",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
