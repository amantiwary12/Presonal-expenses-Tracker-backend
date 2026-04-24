// controllers/budget.controller.js - COMPLETE REWRITE
import Budget from "../models/Budget.model.js";
import Transaction from "../models/transaction.model.js";
import { sendNotification } from "../utils/sendNotification.js";

// Create or update category budget
export const setCategoryBudget = async (req, res) => {
  try {
    const {
      category,
      amount,
      month,
      year,
      alertThreshold
    } = req.body;

    // Validation
    if (!category || !amount || !month || !year) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: category, amount, month, year"
      });
    }

    // Always create new budget
    const budget = await Budget.create({
      user: req.user._id,
      category,
      amount,
      month,
      year,
      alertThreshold: alertThreshold || 80
    });

    res.status(201).json({
      success: true,
      message: "Budget created successfully",
      budget
    });

  } catch (error) {

    console.error("CREATE BUDGET ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message
    });

  }
};

// Get budgets with actual spent amounts
export const getBudgetsWithSpent = async (req, res) => {
  try {
    const userId = req.user;
    const { month, year } = req.query;

    const filter = { user: userId };
    if (month && year) {
      filter.month = parseInt(month);
      filter.year = parseInt(year);
    }

    const budgets = await Budget.find(filter).sort({ createdAt: -1 });
    
    // Calculate spent amount for each budget
    const budgetsWithSpent = await Promise.all(budgets.map(async (budget) => {
      const startDate = new Date(budget.year, budget.month - 1, 1);
      const endDate = new Date(budget.year, budget.month, 0);
      
      const expenses = await Transaction.aggregate([
        {
          $match: {
           user: req.user._id,
            type: "expense",
            category: budget.category,
            date: { $gte: startDate, $lte: endDate }
          }
        },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]);
      
      const spent = expenses[0]?.total || 0;
      
      return {
        ...budget.toObject(),
        spent,
        remaining: budget.amount - spent,
        percentageUsed: budget.amount > 0 ? (spent / budget.amount) * 100 : 0,
      };
    }));

    res.status(200).json({
      success: true,
      count: budgetsWithSpent.length,
      budgets: budgetsWithSpent,
    });
  } catch (error) {
    console.error("GET BUDGET ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get budget status (check if any budget exceeded)
export const getBudgetStatus = async (req, res) => {
  try {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    
    const budgets = await Budget.find({
      user: req.user._id,
      month,
      year
    });
    
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    let totalBudget = 0;
    let totalSpent = 0;
    const exceededCategories = [];
    
    for (const budget of budgets) {
      const expenses = await Transaction.aggregate([
        {
          $match: {
            user: req.user._id,
            type: "expense",
            category: budget.category,
            date: { $gte: startDate, $lte: endDate }
          }
        },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]);
      
      const spent = expenses[0]?.total || 0;
      totalBudget += budget.amount;
      totalSpent += spent;
      
      if (spent > budget.amount) {
        exceededCategories.push({
          category: budget.category,
          budget: budget.amount,
          spent,
          excess: spent - budget.amount
        });
      }
    }
    
    res.status(200).json({
      success: true,
      totalBudget,
      totalSpent,
      remaining: totalBudget - totalSpent,
      percentageUsed: totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0,
      exceededCategories,
      isExceeded: exceededCategories.length > 0
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


export const updateSpentAmount = async (req, res) => {
  try {
    const { id } = req.params;
    const { spentAmount } = req.body;

    // Validate input
    if (!spentAmount || spentAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid spent amount is required",
      });
    }

    // Find budget securely
    const budget = await Budget.findOne({
      _id: id,
      user: req.user._id,
    });

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: "Budget not found",
      });
    }

    const currentSpent = budget.spentAmount || 0;
    const newSpentAmount = currentSpent + spentAmount;

    // Prevent exceeding budget
    if (newSpentAmount > budget.amount) {
      return res.status(400).json({
        success: false,
        message: `Cannot add ${spentAmount}. Total would exceed budget of ${budget.amount}`,
      });
    }

    // Atomic update
    const updatedBudget = await Budget.findOneAndUpdate(
      {
        _id: id,
        user: req.user._id,
      },
      {
        $inc: { spentAmount: spentAmount },
      },
      {
        new: true,
      }
    );

    res.status(200).json({
      success: true,
      message: `Added ${spentAmount} to spent amount`,
      budget: updatedBudget,
      addedAmount: spentAmount,
      totalSpent: updatedBudget.spentAmount,
      remaining: updatedBudget.amount - updatedBudget.spentAmount,
    });

  } catch (error) {
    console.error("Update spent error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update spent amount",
    });
  }
};

export const deleteBudget = async (req, res) => {
  try {
    const { id } = req.params;

    const budget = await Budget.findOneAndDelete({
      _id: id,
      user: req.user._id,
    });

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: "Budget not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Budget deleted successfully",
    });

  } catch (error) {
    console.error("DELETE BUDGET ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const editSpentAmount = async (req, res) => {
  try {
    const { id } = req.params;
    const { spentAmount } = req.body;

    if (spentAmount === undefined || spentAmount < 0) {
      return res.status(400).json({
        success: false,
        message: "Valid spent amount is required"
      });
    }

    const budget = await Budget.findOne({
      _id: id,
      user: req.user._id
    });

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: "Budget not found"
      });
    }

    if (spentAmount > budget.amount) {
      return res.status(400).json({
        success: false,
        message: "Spent cannot exceed budget amount"
      });
    }

    budget.spentAmount = spentAmount;

    await budget.save();

    res.status(200).json({
      success: true,
      message: "Spent amount updated successfully",
      totalSpent: spentAmount,
      remaining: budget.amount - spentAmount,
      budget
    });

  } catch (error) {
    console.error("Edit spent error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update spent amount"
    });
  }
};

export const removeSpentAmount = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid amount is required"
      });
    }

    const budget = await Budget.findOne({
      _id: id,
      user: req.user._id
    });

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: "Budget not found"
      });
    }

    const currentSpent = budget.spentAmount || 0;

    if (amount > currentSpent) {
      return res.status(400).json({
        success: false,
        message: "Cannot remove more than spent amount"
      });
    }

    const newSpent = currentSpent - amount;

    budget.spentAmount = newSpent;

    await budget.save();

    res.status(200).json({
      success: true,
      message: "Spent amount removed successfully",
      totalSpent: newSpent,
      remaining: budget.amount - newSpent,
      budget
    });

  } catch (error) {
    console.error("Remove spent error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to remove spent amount"
    });
  }
};