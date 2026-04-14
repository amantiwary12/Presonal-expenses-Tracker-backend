import Budget from "../models/Budget.model.js";

export const setBudget = async (req, res) => {
  try {
    const { monthlyBudget } = req.body;

    // SINGLE CLEAN VALIDATION
    if (
      monthlyBudget === undefined ||
      isNaN(monthlyBudget) ||
      Number(monthlyBudget) <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid budget amount",
      });
    }

    const now = new Date();

    const budget = await Budget.findOneAndUpdate(
      {
        user: req.user,
        month: now.getMonth() + 1,
        year: now.getFullYear(),
      },
      {
        monthlyBudget: Number(monthlyBudget),
      },
      {
        new: true,
        upsert: true,
      }
    );

    res.status(200).json({
      success: true,
      budget,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};




export const getBudget = async (req, res) => {
  try {
    const now = new Date();

    const budget = await Budget.findOne({
      user: req.user,
      month: now.getMonth() + 1,
      year: now.getFullYear(),
    });

    res.status(200).json({
      success: true,
      budget,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getBudgetStatus = async (req, res) => {
  try {
    const now = new Date();

    const budget = await Budget.findOne({
      user: req.user,
      month: now.getMonth() + 1,
      year: now.getFullYear(),
    });

    if (!budget) {
      return res.status(200).json({
        success: true,
        exceeded: false,
      });
    }

    const expenses = await Transaction.aggregate([
      {
        $match: {
          user: req.user,
          type: "expense",
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

    res.status(200).json({
      success: true,
      exceeded: totalExpense > budget.monthlyBudget,
      totalExpense,
      budget: budget.monthlyBudget,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
