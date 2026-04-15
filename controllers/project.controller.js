import Transaction from "../models/transaction.model.js";
import Project from "../models/Project.model.js";
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
      user: req.user,
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
      user: req.user,
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
      user: req.user,
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
      user: req.user,
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
          user: req.user,
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
      user: req.user,
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
      user: req.user,
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

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID",
      });
    }

    // Validate status
    const allowedStatus = ["active", "completed", "on-hold", "cancelled"];

    if (!allowedStatus.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value",
      });
    }

    // Build update object
    const updateData = {
      status,
    };

    // Set completedAt only when completed
    if (status === "completed") {
      updateData.completedAt = new Date();
    }

    // Optional but important:
    // remove completedAt if reopening project
    if (status === "active") {
      updateData.completedAt = null;
    }

    const project = await Project.findOneAndUpdate(
      {
        _id: id,
        user: req.user,
      },
      updateData,
      {
        new: true,
      },
    );

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
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
      user: req.user,
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
      user: req.user,
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
          user: req.user,
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
