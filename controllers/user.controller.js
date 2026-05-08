//user controller
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";

/*
   CREATE USER (Admin adds user to same company)
*/
export const createUser = async (req, res) => {
  try {
    const { name, mobileNumber, password, role } = req.body;

    console.log("=== CREATE USER DEBUG ===");
    console.log("Request body:", { name, mobileNumber, role });
    console.log("Current user:", {
      id: req.user._id,
      role: req.user.role,
      company: req.user.company,
    });

    // ✅ 1. CHECK ROLE FIRST
    if (req.user.role !== "Admin" && req.user.role !== "SuperAdmin") {
      return res.status(403).json({
        success: false,
        message: "Only Admin or SuperAdmin can create users",
      });
    }

    // ✅ 2. CHECK IF COMPANY EXISTS
    if (!req.user.company) {
      console.error("ERROR: User has no company assigned!");
      return res.status(400).json({
        success: false,
        message: "User does not belong to any company. Please contact support.",
      });
    }

    // ✅ 3. CHECK EXISTING USER
    const existingUser = await User.findOne({ mobileNumber });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    // ✅ 4. HASH PASSWORD
    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ 5. CREATE USER
    const user = await User.create({
      name,
      mobileNumber,
      password: hashedPassword,
      role,
      company: req.user.company, // Use company from logged-in user
      isActive: true,
    });

    console.log("User created successfully:", user._id);

    res.status(201).json({
      success: true,
      message: "User created successfully",
      user: {
        _id: user._id,
        name: user.name,
        mobileNumber: user.mobileNumber,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
    });

  } catch (error) {
    console.error("Create user error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/*
   GET ALL USERS (ONLY SAME COMPANY)
*/
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({
      company: req.user.company,
    })
      .select("-password")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    console.error("Get all users error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/*
   UPDATE USER (ONLY SAME COMPANY)
*/
export const updateUser = async (req, res) => {
  try {
    // Allow Admin or SuperAdmin to update
    if (req.user.role !== "Admin" && req.user.role !== "SuperAdmin") {
      return res.status(403).json({
        success: false,
        message: "Only Admin or SuperAdmin can update users",
      });
    }

    const user = await User.findOneAndUpdate(
      {
        _id: req.params.id,
        company: req.user.company,
      },
      { name: req.body.name, role: req.body.role },
      { new: true },
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      message: "User updated",
      user,
    });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/*
   DELETE USER (ONLY SAME COMPANY)
*/
export const deleteUser = async (req, res) => {
  try {
    // Allow Admin or SuperAdmin to delete
    if (req.user.role !== "Admin" && req.user.role !== "SuperAdmin") {
      return res.status(403).json({
        success: false,
        message: "Only Admin or SuperAdmin can delete users",
      });
    }

    // Prevent deleting yourself
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete your own account",
      });
    }

    const user = await User.findOneAndDelete({
      _id: req.params.id,
      company: req.user.company,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      message: "User deleted",
    });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/*
   TOGGLE USER STATUS (ONLY SAME COMPANY)
*/
export const toggleUserStatus = async (req, res) => {
  try {
    // Allow Admin or SuperAdmin to toggle status
    if (req.user.role !== "Admin" && req.user.role !== "SuperAdmin") {
      return res.status(403).json({
        success: false,
        message: "Only Admin or SuperAdmin can change user status",
      });
    }

    // Prevent deactivating yourself
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot change your own status",
      });
    }

    const user = await User.findOne({
      _id: req.params.id,
      company: req.user.company,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.json({
      success: true,
      message: "User status updated",
      isActive: user.isActive,
    });
  } catch (error) {
    console.error("Toggle status error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/*
   RESET PASSWORD (ONLY SAME COMPANY)
*/
export const resetPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;

    // Allow Admin or SuperAdmin to reset passwords
    if (req.user.role !== "Admin" && req.user.role !== "SuperAdmin") {
      return res.status(403).json({
        success: false,
        message: "Only Admin or SuperAdmin can reset passwords",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const user = await User.findOneAndUpdate(
      {
        _id: req.params.id,
        company: req.user.company,
      },
      { password: hashedPassword },
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
