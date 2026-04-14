import Transaction from "../models/transaction.model.js";

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

export const getTransactions = async (req, res) => {
  try {
    const {
      type,
      category,
      startDate,
      endDate,
      page = 1,
      limit = 5
    } = req.query;

    let filter = {
      user: req.user
    };

    if (type) {
      filter.type = type;
    }

    if (category) {
      filter.category = category;
    }

    if (startDate && endDate) {
      filter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const skip =
      (Number(page) - 1) * Number(limit);

    const transactions = await Transaction
      .find(filter)
      .sort({ date: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total =
      await Transaction.countDocuments(
        filter
      );

    res.json({
      success: true,
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(
        total / Number(limit)
      ),
      transactions
    });

  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};



export const getWeeklySummary = async (req, res) => {
  try {
    const now = new Date();

    const firstDayOfWeek = new Date(now);
    firstDayOfWeek.setDate(
      now.getDate() - now.getDay()
    );
    firstDayOfWeek.setHours(0, 0, 0, 0);

    const lastDayOfWeek = new Date(firstDayOfWeek);
    lastDayOfWeek.setDate(
      firstDayOfWeek.getDate() + 7
    );

    const transactions = await Transaction.find({
      user: req.user,
      date: {
        $gte: firstDayOfWeek,
        $lt: lastDayOfWeek
      }
    });

    let income = 0;
    let expense = 0;

    transactions.forEach(t => {
      if (t.type === "income") {
        income += t.amount;
      } else {
        expense += t.amount;
      }
    });

    res.json({
      success: true,
      weekStart: firstDayOfWeek,
      weekEnd: lastDayOfWeek,
      income,
      expense,
      balance: income - expense
    });

  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};



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
        $lt: end
      }
    });

    let income = 0;
    let expense = 0;

    transactions.forEach(t => {
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
      balance: income - expense
    });

  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};



export const getYearlySummary = async (req, res) => {
  try {
    const year =
      Number(req.query.year) ||
      new Date().getFullYear();

    const start = new Date(year, 0, 1);
    const end = new Date(year + 1, 0, 1);

    const transactions = await Transaction.find({
      user: req.user,
      date: {
        $gte: start,
        $lt: end
      }
    });

    let income = 0;
    let expense = 0;

    transactions.forEach(t => {
      if (t.type === "income") {
        income += t.amount;
      } else {
        expense += t.amount;
      }
    });

    res.json({
      success: true,
      year,
      income,
      expense,
      balance: income - expense
    });

  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};




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

export const updateTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findOneAndUpdate(
      {
        _id: req.params.id,
        user: req.user,
      },
      req.body,
      { new: true },
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
