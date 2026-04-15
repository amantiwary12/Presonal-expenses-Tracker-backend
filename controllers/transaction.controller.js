import Transaction from "../models/transaction.model.js";
import ExcelJS from "exceljs";
import Budget from "../models/Budget.model.js";
import Project from "../models/Project.model.js";
import { sendNotification } from "../utils/sendNotification.js";
import mongoose from "mongoose";
import fs from "fs";

export const createTransaction = async (req, res) => {
  try {
    // STEP 1 — Check project status FIRST
    if (req.body.project) {
      const project = await Project.findById(req.body.project);

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

      // BUDGET CHECK (NEW)
      if (req.body.type === "expense") {
        const expenses = await Transaction.aggregate([
          {
            $match: {
              project: project._id,
              user: req.user,
              type: "expense",
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

        const totalSpent = Number(expenses[0]?.total || 0);

        const newAmount = Number(req.body.amount);

        if (totalSpent + newAmount > project.budget) {
          return res.status(400).json({
            success: false,
            message: "Project budget exceeded",
          });
        }
      }
    }

    // STEP 2 — Now create transaction
    const transaction = await Transaction.create({
      user: req.user,
      amount: req.body.amount,
      receiver: req.body.receiver,
      date: req.body.date || new Date(),
      category: req.body.category,
      type: req.body.type,
      note: req.body.note,
      project: req.body.project || null,
      screenshot: req.file?.path || null,
    });

    // STEP 3 — Personal budget check
    if (transaction.project === null) {
      const now = new Date();

      const budget = await Budget.findOne({
        user: req.user,
        month: now.getMonth() + 1,
        year: now.getFullYear(),
      });

      if (budget && transaction.type === "expense") {
        const expenses = await Transaction.aggregate([
          {
            $match: {
              user: req.user,
              type: "expense",
              project: null,
              date: {
                $gte: new Date(now.getFullYear(), now.getMonth(), 1),
              },
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: "$amount" },
            },
          },
        ]);

        const totalExpense = expenses[0]?.total || 0;

        if (totalExpense > budget.monthlyBudget) {
          console.log("Budget exceeded");
        }
      }
    }

    res.status(201).json({
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

    const pageNumber = Number(page) || 1;
    const limitNumber = Number(limit) || 10;

    const query = {
      user: req.user,
    };

    /* PROJECT FILTER */

    if (project) {
      query.project = project;
    }

    /* DATE FILTER */

    if (startDate || endDate) {
      query.date = {};

      if (startDate && !isNaN(new Date(startDate))) {
        query.date.$gte = new Date(startDate);
      }

      if (endDate && !isNaN(new Date(endDate))) {
        query.date.$lte = new Date(endDate);
      }
    }

    const transactions = await Transaction.find(query)
      .sort({ date: -1, createdAt: -1 })
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

    // Monday start
    const startOfWeek = new Date(now);

    const day = now.getDay();

    const diff =
      now.getDate() - day + (day === 0 ? -6 : 1);

    startOfWeek.setDate(diff);

    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);

    endOfWeek.setDate(startOfWeek.getDate() + 7);

    const summary = await Transaction.aggregate([
      {
        $match: {
          user: req.user,
          ...(project && { project }),
          date: {
            $gte: startOfWeek,
            $lt: endOfWeek,
          },
        },
      },
      {
        $group: {
          _id: "$type",
          total: { $sum: "$amount" },
        },
      },
    ]);

    let income = 0;
    let expense = 0;

    summary.forEach((item) => {
      if (item._id === "income")
        income = item.total;

      if (item._id === "expense")
        expense = item.total;
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

    if (
      !month ||
      month < 1 ||
      month > 12 ||
      !year ||
      year < 2000
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid month or year",
      });
    }

    const start =
      new Date(year, month - 1, 1);

    const end =
      new Date(year, month, 1);

    const summary =
      await Transaction.aggregate([
        {
          $match: {
            user: req.user,
            ...(project && { project }),
            date: {
              $gte: start,
              $lt: end,
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
      if (item._id === "income")
        income = item.total;

      if (item._id === "expense")
        expense = item.total;
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

    const year =
      Number(req.query.year) ||
      new Date().getFullYear();

    const { project } = req.query;

    const startOfYear =
      new Date(year, 0, 1);

    const endOfYear =
      new Date(year + 1, 0, 1);

    const summary =
      await Transaction.aggregate([
        {
          $match: {
            user: req.user,
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
      if (item._id === "income")
        income = item.total;

      if (item._id === "expense")
        expense = item.total;
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

    const {
      startDate,
      endDate,
      project,
    } = req.query;

    const matchStage = {
      user: req.user,
      type: "expense",
    };

    if (project) {
      matchStage.project = project;
    }

    if (startDate || endDate) {
      matchStage.date = {};

      if (
        startDate &&
        !isNaN(new Date(startDate))
      ) {
        matchStage.date.$gte =
          new Date(startDate);
      }

      if (
        endDate &&
        !isNaN(new Date(endDate))
      ) {
        const end =
          new Date(endDate);

        end.setDate(
          end.getDate() + 1
        );

        matchStage.date.$lt = end;
      }
    }

    const summary =
      await Transaction.aggregate([
        {
          $match: matchStage,
        },
        {
          $addFields: {
            category: {
              $ifNull: [
                "$category",
                "Uncategorized",
              ],
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

    if (
      !mongoose.Types.ObjectId.isValid(
        req.params.id
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction ID",
      });
    }

    const transaction =
      await Transaction.findOneAndDelete({
        _id: req.params.id,
        user: req.user,
      });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    if (transaction.screenshot) {
      fs.unlink(
        transaction.screenshot,
        (err) => {
          if (err)
            console.log(
              "File delete error"
            );
        }
      );
    }

    if (transaction.project) {
      await updateProjectSpending(
        transaction.project
      );
    }

    res.status(200).json({
      success: true,
      message: "Transaction deleted",
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

    if (
      !mongoose.Types.ObjectId.isValid(
        req.params.id
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction ID",
      });
    }

    if (
      !req.body ||
      Object.keys(req.body).length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "No data provided to update",
      });
    }

    const existingTransaction =
      await Transaction.findOne({
        _id: req.params.id,
        user: req.user,
      });

    if (!existingTransaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    if (existingTransaction.project) {
      const project =
        await Project.findById(
          existingTransaction.project
        );

      if (
        project &&
        project.status === "completed"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Cannot update transaction in completed project",
        });
      }
    }

    const updateData = {
      ...req.body,
    };

    if (req.file) {

      if (
        existingTransaction.screenshot
      ) {
        fs.unlink(
          existingTransaction.screenshot,
          (err) => {
            if (err)
              console.log(
                "File delete error"
              );
          }
        );
      }

      updateData.screenshot =
        req.file.path;
    }

    if (
      updateData.type === "expense" &&
      updateData.project
    ) {
      const project =
        await Project.findById(
          updateData.project
        );

      const expenses =
        await Transaction.aggregate([
          {
            $match: {
              project: project._id,
              type: "expense",
              _id: {
                $ne:
                  existingTransaction._id,
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

      const totalSpent =
        expenses[0]?.total || 0;

      const newAmount =
        updateData.amount ??
        existingTransaction.amount;

      if (
        totalSpent +
          newAmount >
        project.budget
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Project budget exceeded",
        });
      }
    }

    const transaction =
      await Transaction.findOneAndUpdate(
        {
          _id: req.params.id,
          user: req.user,
        },
        updateData,
        {
          new: true,
          runValidators: true,
        }
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
      user: req.user,
    };

    if (startDate || endDate) {
      matchStage.date = {};

      if (
        startDate &&
        !isNaN(new Date(startDate))
      ) {
        matchStage.date.$gte =
          new Date(startDate);
      }

      if (
        endDate &&
        !isNaN(new Date(endDate))
      ) {
        const end =
          new Date(endDate);

        end.setDate(
          end.getDate() + 1
        );

        matchStage.date.$lt = end;
      }
    }

    const summary =
      await Transaction.aggregate([
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
      if (item._id === "income")
        income = item.total;

      if (item._id === "expense")
        expense = item.total;
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

    const {
      type,
      startDate,
      endDate,
      project,
    } = req.query;

    const match = {
      user: req.user,
    };

    if (type) {
      const allowedTypes = [
        "income",
        "expense",
      ];

      if (!allowedTypes.includes(type)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid transaction type",
        });
      }

      match.type = type;
    }

    if (project) {
      match.project = project;
    }

    if (startDate || endDate) {
      match.date = {};

      if (
        startDate &&
        !isNaN(new Date(startDate))
      ) {
        match.date.$gte =
          new Date(startDate);
      }

      if (
        endDate &&
        !isNaN(new Date(endDate))
      ) {
        const end =
          new Date(endDate);

        end.setDate(
          end.getDate() + 1
        );

        match.date.$lt = end;
      }
    }

    const summary =
      await Transaction.aggregate([
        {
          $match: match,
        },
        {
          $addFields: {
            category: {
              $ifNull: [
                "$category",
                "Uncategorized",
              ],
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

    const result =
      await Transaction.aggregate([
        {
          $match: {
            user: req.user,
          },
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
                    $ifNull: [
                      "$category",
                      "Uncategorized",
                    ],
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
      if (item._id === "income")
        income = item.total;

      if (item._id === "expense")
        expense = item.total;
    });

    res.status(200).json({
      success: true,
      totalIncome: income,
      totalExpense: expense,
      balance: income - expense,
      categorySummary:
        result[0].categorySummary,
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

    const {
      startDate,
      endDate,
      type,
      category,
      project,
    } = req.query;

    const query = {
      user: req.user,
    };

    if (type) query.type = type;
    if (category) query.category = category;
    if (project) query.project = project;

    if (startDate || endDate) {
      query.date = {};

      if (
        startDate &&
        !isNaN(new Date(startDate))
      ) {
        query.date.$gte =
          new Date(startDate);
      }

      if (
        endDate &&
        !isNaN(new Date(endDate))
      ) {
        const end =
          new Date(endDate);

        end.setDate(
          end.getDate() + 1
        );

        query.date.$lt = end;
      }
    }

    const transactions =
      await Transaction.find(query)
        .sort({ createdAt: -1 })
        .lean();

    if (!transactions.length) {
      return res.status(404).json({
        success: false,
        message:
          "No transactions found",
      });
    }

    const workbook =
      new ExcelJS.Workbook();

    const worksheet =
      workbook.addWorksheet(
        "Transactions"
      );

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
        category:
          txn.category ||
          "Uncategorized",
        receiver:
          txn.receiver || "-",
        date: new Date(
          txn.date
        ).toLocaleDateString(),
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