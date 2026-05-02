//project controller 
import Transaction from "../models/transaction.model.js";
import Project from "../models/Project.model.js";
import { sendNotification } from "../utils/sendNotification.js";
import mongoose from "mongoose";

export const createProject = async (req, res) => {
  try {
    let { name, description, budget } = req.body;

    // Normalize input
    const cleanName = name?.trim();

    const cleanDescription = description?.trim() || "";

    const budgetNumber = Number(budget);

    // Validation
    if (!cleanName || !budgetNumber || budgetNumber <= 0) {
      return res.status(400).json({
        success: false,
        message: "Name and valid budget required",
      });
    }

    // Duplicate protection
    const existingProject = await Project.findOne({
      user: req.user._id,
      name: cleanName,
    });

    if (existingProject) {
      return res.status(400).json({
        success: false,
        message: "Project already exists",
      });
    }

    // Create project
    const project = await Project.create({
      user: req.user._id,
      name: cleanName,
      description: cleanDescription,
      budget: budgetNumber,
      status: "active",
    });

    res.status(201).json({
      success: true,
      project,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getProjects = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;

    const pageNumber = Number(page);

    const limitNumber = Number(limit);

    const query = {
      user: req.user._id,
    };

    // Status filter
    if (status) {
      query.status = status;
    }

    // Search
    if (search) {
      query.name = {
        $regex: search,
        $options: "i",
      };
    }

    const projects = await Project.find(query)
      .sort({ createdAt: -1 })
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber);

    const total = await Project.countDocuments(query);

    res.status(200).json({
      success: true,
      total,
      page: pageNumber,
      totalPages: Math.ceil(total / limitNumber),
      projects,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getProjectSummary = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID",
      });
    }

    const project = await Project.findOne({
      _id: id,
      user: req.user._id,
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const stats = await Transaction.aggregate([
      {
        $match: {
          project: project._id,
          user: req.user._id,
        },
      },
      {
        $group: {
          _id: null,
          totalSpent: {
            $sum: {
              $cond: [
                {
                  $eq: ["$type", "expense"],
                },
                "$amount",
                0,
              ],
            },
          },
          totalTransactions: {
            $sum: 1,
          },
        },
      },
    ]);

    const spent = Number(stats[0]?.totalSpent || 0);

    const transactionCount = stats[0]?.totalTransactions || 0;

    res.status(200).json({
      success: true,
      project: project.name,
      status: project.status,
      budget: project.budget,
      spent,
      remaining: project.budget - spent,
      transactions: transactionCount,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getProjectTransactions = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      page = 1,
      limit = 10,
      type,
      category,
      startDate,
      endDate,
    } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID",
      });
    }

    // Verify project exists
    const project = await Project.findOne({
      _id: id,
      user: req.user._id,
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const pageNumber = Number(page);

    const limitNumber = Number(limit);

    const query = {
      project: id,
      user: req.user._id,
    };

    if (type) {
      query.type = type;
    }

    if (category) {
      query.category = category;
    }

    if (startDate || endDate) {
      query.date = {};

      if (startDate) {
        query.date.$gte = new Date(startDate);
      }

      if (endDate) {
        query.date.$lte = new Date(endDate);
      }
    }

    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber);

    const total = await Transaction.countDocuments(query);

    res.status(200).json({
      success: true,
      project: project.name,
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

export const updateProjectStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID",
      });
    }

    const allowedStatus = [
      "active",
      "completed",
      "on-hold",
      "cancelled",
    ];

    if (!allowedStatus.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value",
      });
    }

    const existingProject = await Project.findOne({
      _id: id,
      user: req.user._id,
    });

    if (!existingProject) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const updateData = {
      status,
    };

    if (
      status === "completed" &&
      existingProject.status !== "completed"
    ) {
      updateData.completedAt = new Date();
    }

    if (status === "active") {
      updateData.completedAt = null;
    }

    const project = await Project.findOneAndUpdate(
      {
        _id: id,
        user: req.user._id,
      },
      updateData,
      {
        new: true,
      }
    );

    if (
      existingProject.status !== "completed" &&
      status === "completed"
    ) {
      sendNotification({
        userId: req.user,
        title: "Project Completed",
        message: `Project "${project.name}" has been completed`,
        type: "project",
      }).catch(console.error);
    }

    res.status(200).json({
      success: true,
      message: "Project status updated",
      project,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getProjectById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID",
      });
    }

    const project = await Project.findOne({
      _id: id,
      user: req.user._id,
    })
      .select("name description budget status startDate completedAt createdAt")
      .lean();

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    res.status(200).json({
      success: true,
      project,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getProjectDashboard = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID",
      });
    }

    // Find project
    const project = await Project.findOne({
      _id: id,
      user: req.user._id,
    }).lean();

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // Aggregate expenses
    const expenses = await Transaction.aggregate([
      {
        $match: {
          project: project._id,
          user: req.user._id,
          type: "expense",
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    const spent = Number(expenses[0]?.total || 0);

    const transactionCount = expenses[0]?.count || 0;

    const remaining = project.budget - spent;

    const usagePercentage =
      project.budget > 0 ? Math.round((spent / project.budget) * 100) : 0;

    res.status(200).json({
      success: true,
      project: project.name,
      status: project.status,
      budget: project.budget,
      spent,
      remaining,
      usagePercentage,
      transactions: transactionCount,
      completedAt: project.completedAt || null,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


export const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;

    // 1) Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID",
      });
    }

    // 2) Find project
    const project = await Project.findOne({
      _id: id,
      user: req.user._id,
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // 3) Find all related transactions
    const transactions = await Transaction.find({
      project: id,
      user: req.user._id,
    });

    // 4) Delete screenshots from Cloudinary
    for (const txn of transactions) {
      if (
        txn.screenshot &&
        txn.screenshot.public_id
      ) {
        try {
          await cloudinary.uploader.destroy(
            txn.screenshot.public_id
          );
        } catch (err) {
          console.log("Cloudinary delete error");
        }
      }
    }

    // 5) Delete transactions
    await Transaction.deleteMany({
      project: id,
      user: req.user._id,
    });

    // 6) Delete project
    await Project.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Project deleted successfully",
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// Get project with progress and transaction summary
export const getProjectWithProgress = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID",
      });
    }

    const project = await Project.findOne({
      _id: id,
      user: userId,
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const summary = await Transaction.aggregate([
      {
        $match: {
          project: new mongoose.Types.ObjectId(id),
          user: new mongoose.Types.ObjectId(userId),
          isDeleted: false,
        },
      },

      {
        $group: {
          _id: null,

          totalIncome: {
            $sum: {
              $cond: [
                { $eq: ["$type", "income"] },
                "$amount",
                0,
              ],
            },
          },

          totalExpense: {
            $sum: {
              $cond: [
                { $eq: ["$type", "expense"] },
                "$amount",
                0,
              ],
            },
          },

          transactionCount: {
            $sum: 1,
          },
        },
      },
    ]);

    const totalIncome =
      summary[0]?.totalIncome || 0;

    const totalExpense =
      summary[0]?.totalExpense || 0;

    const netProfit =
      totalIncome - totalExpense;

    const progress =
      project.budget > 0
        ? (totalExpense /
            project.budget) *
          100
        : 0;

    let statusLevel = "good";

    if (progress >= 100)
      statusLevel = "critical";
    else if (progress >= 80)
      statusLevel = "warning";
    else if (progress >= 50)
      statusLevel = "moderate";

    res.status(200).json({
      success: true,

      project: {
        ...project.toObject(),

        totalIncome,
        totalExpense,
        netProfit,

        progress: Math.min(
          progress,
          100
        ),

        statusLevel,

        transactionCount:
          summary[0]
            ?.transactionCount || 0,
      },
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};