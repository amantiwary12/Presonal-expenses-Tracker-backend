import Transaction from "../models/transaction.model.js";
import ExcelJS from "exceljs";
import Budget from "../models/Budget.model.js";
import { sendNotification } from "../utils/sendNotification.js";

export const createTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.create({
      user: req.user,
      amount: req.body.amount,
      receiver: req.body.receiver,
      date: req.body.date || new Date(),
      category: req.body.category,
      type: req.body.type,
      note: req.body.note,
      screenshot: req.file?.path || null,
    });
    
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
            date: {
              $gte: new Date(
                now.getFullYear(),
                now.getMonth(),
                1
              ),
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

        await sendNotification(
          req.user.deviceToken || "test-device",
          "Budget Exceeded",
          `Limit: ${budget.monthlyBudget}, Spent: ${totalExpense}`
        );

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
      category
    } = req.query;

    const query = {
      user: req.user,
    };

    /* SEARCH */

    if (search) {
      query.$or = [
        {
          receiver: {
            $regex: search,
            $options: "i",
          },
        },
        {
          category: {
            $regex: search,
            $options: "i",
          },
        },
        {
          note: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    /* DATE FILTER */

    if (startDate || endDate) {
      query.date = {};

      if (startDate) {
        query.date.$gte = new Date(startDate);
      }

      if (endDate) {
        query.date.$lte = new Date(endDate);
      }
    }

    /* TYPE FILTER */

    if (type) {
      query.type = type;
    }

    /* CATEGORY FILTER */

    if (category) {
      query.category = category;
    }

    const transactions =
      await Transaction.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit));

    const total =
      await Transaction.countDocuments(query);

    res.status(200).json({
      success: true,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
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

    // Start of week (Sunday)
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const summary = await Transaction.aggregate([
      {
        $match: {
          user: req.user,
          date: { $gte: startOfWeek },
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
      if (item._id === "income") income = item.total;
      if (item._id === "expense") expense = item.total;
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

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);

    const transactions = await Transaction.find({
      user: req.user,
      date: {
        $gte: start,
        $lt: end,
      },
    });

    let income = 0;
    let expense = 0;

    transactions.forEach((t) => {
      if (t.type === "income") {
        income += t.amount;
      } else {
        expense += t.amount;
      }
    });

    res.json({
      success: true,
      month,
      year,
      income,
      expense,
      balance: income - expense,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// getYearlySummary

export const getYearlySummary = async (req, res) => {
  try {
    const now = new Date();

    const startOfYear = new Date(
      now.getFullYear(),
      0,
      1
    );

    const summary = await Transaction.aggregate([
      {
        $match: {
          user: req.user,
          date: { $gte: startOfYear },
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
      if (item._id === "income") income = item.total;
      if (item._id === "expense") expense = item.total;
    });

    res.status(200).json({
      success: true,
      period: "yearly",
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
    const summary = await Transaction.aggregate([
      {
        $match: {
          user: req.user,
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

    res.json({
      success: true,
      summary,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// deleteTransaction

export const deleteTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findOneAndDelete({
      _id: req.params.id,
      user: req.user,
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
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
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No data provided to update",
      });
    }

    const updateData = {
      ...req.body,
    };

    if (req.file) {
      updateData.screenshot = req.file.path;
    }

    const transaction = await Transaction.findOneAndUpdate(
      {
        _id: req.params.id,
        user: req.user,
      },
      updateData,
      {
        new: true,
        runValidators: true,
      },
    );

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

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
    const transactions = await Transaction.find({
      user: req.user,
    });

    let income = 0;
    let expense = 0;

    transactions.forEach((t) => {
      if (t.type === "income") {
        income += t.amount;
      } else {
        expense += t.amount;
      }
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
    const { type } = req.query;

    let match = {
      user: req.user,
    };

    if (type) {
      match.type = type;
    }

    const summary = await Transaction.aggregate([
      {
        $match: match,
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

    res.json({
      success: true,
      summary,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// getDashboardData

export const getDashboardData = async (req, res) => {
  try {
    const transactions = await Transaction.find({
      user: req.user,
    });

    let income = 0;
    let expense = 0;

    transactions.forEach((t) => {
      if (t.type === "income") {
        income += t.amount;
      } else {
        expense += t.amount;
      }
    });

    const categorySummary = await Transaction.aggregate([
      {
        $match: {
          user: req.user,
          type: "expense",
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
    ]);

    res.json({
      success: true,
      totalIncome: income,
      totalExpense: expense,
      balance: income - expense,
      categorySummary,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};



//exportTransactions in excljs

export const exportTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find({
      user: req.user,
    }).sort({ createdAt: -1 });

    if (!transactions.length) {
      return res.status(404).json({
        success: false,
        message: "No transactions found",
      });
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet =
      workbook.addWorksheet("Transactions");

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

    transactions.forEach((txn) => {
      worksheet.addRow({
        amount: txn.amount,
        type: txn.type,
        category: txn.category,
        receiver: txn.receiver,
        date: txn.date,
        note: txn.note,
      });
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=transactions.xlsx"
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


