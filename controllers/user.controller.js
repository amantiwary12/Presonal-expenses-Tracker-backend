//user controller
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";

const MANAGER_ROLES = ["Admin", "SuperAdmin", "HR"];
const PRIVILEGED_ROLES = ["Admin", "SuperAdmin"];
const isPrivileged = (role) => PRIVILEGED_ROLES.includes(role);

/*
   CREATE USER (Admin/HR adds user to same company)
   HR cannot create Admin/SuperAdmin accounts (privilege-escalation guard)
*/
export const createUser = async (req, res) => {
  try {
    const { name, mobileNumber, email, password, role } = req.body;

    console.log("=== CREATE USER DEBUG ===");
    console.log("Request body:", { name, mobileNumber, role });
    console.log("Current user:", {
      id: req.user._id,
      role: req.user.role,
      company: req.user.company._id,
    });

    // ✅ 1. CHECK ROLE FIRST
    if (!MANAGER_ROLES.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Only Admin, SuperAdmin, or HR can create users",
      });
    }

    // ✅ 1b. HR cannot create Admin/SuperAdmin accounts
    if (req.user.role === "HR" && isPrivileged(role)) {
      return res.status(403).json({
        success: false,
        message: "HR cannot create Admin or SuperAdmin accounts",
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
      email: email?.trim() || null,
      password: hashedPassword,
      role,
      company: req.user.company._id, // Use company from logged-in user
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
        email: user.email,
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
      company: req.user.company._id,
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
   HR cannot edit Admin/SuperAdmin accounts, nor promote anyone to Admin/SuperAdmin
*/
export const updateUser = async (req, res) => {
  try {
    if (!MANAGER_ROLES.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Only Admin, SuperAdmin, or HR can update users",
      });
    }

    if (req.user.role === "HR") {
      if (isPrivileged(req.body.role)) {
        return res.status(403).json({
          success: false,
          message: "HR cannot promote a user to Admin or SuperAdmin",
        });
      }

      const targetUser = await User.findOne({
        _id: req.params.id,
        company: req.user.company._id,
      }).select("role");

      if (targetUser && isPrivileged(targetUser.role)) {
        return res.status(403).json({
          success: false,
          message: "HR cannot edit an Admin or SuperAdmin account",
        });
      }
    }

    const user = await User.findOneAndUpdate(
      {
        _id: req.params.id,
        company: req.user.company._id,
      },
      { name: req.body.name, role: req.body.role, email: req.body.email?.trim() || null },
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
   HR cannot delete Admin/SuperAdmin accounts
*/
export const deleteUser = async (req, res) => {
  try {
    if (!MANAGER_ROLES.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Only Admin, SuperAdmin, or HR can delete users",
      });
    }

    // Prevent deleting yourself
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete your own account",
      });
    }

    if (req.user.role === "HR") {
      const targetUser = await User.findOne({
        _id: req.params.id,
        company: req.user.company._id,
      }).select("role");

      if (targetUser && isPrivileged(targetUser.role)) {
        return res.status(403).json({
          success: false,
          message: "HR cannot delete an Admin or SuperAdmin account",
        });
      }
    }

    const user = await User.findOneAndDelete({
      _id: req.params.id,
      company: req.user.company._id,
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
   HR cannot toggle Admin/SuperAdmin accounts
*/
export const toggleUserStatus = async (req, res) => {
  try {
    if (!MANAGER_ROLES.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Only Admin, SuperAdmin, or HR can change user status",
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
      company: req.user.company._id,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (req.user.role === "HR" && isPrivileged(user.role)) {
      return res.status(403).json({
        success: false,
        message: "HR cannot change an Admin or SuperAdmin account's status",
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
   HR cannot reset an Admin/SuperAdmin account's password
*/
export const resetPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;

    if (!MANAGER_ROLES.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Only Admin, SuperAdmin, or HR can reset passwords",
      });
    }

    if (req.user.role === "HR") {
      const targetUser = await User.findOne({
        _id: req.params.id,
        company: req.user.company._id,
      }).select("role");

      if (targetUser && isPrivileged(targetUser.role)) {
        return res.status(403).json({
          success: false,
          message: "HR cannot reset an Admin or SuperAdmin account's password",
        });
      }
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const user = await User.findOneAndUpdate(
      {
        _id: req.params.id,
        company: req.user.company._id,
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
