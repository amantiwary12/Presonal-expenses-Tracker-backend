//user controller 
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";

/*
   CREATE USER (Admin adds user to same company)
*/
export const createUser = async (req, res) => {
  try {
    const { name, mobileNumber, password, role } = req.body;

    // ✅ 1. CHECK ROLE FIRST
    if (req.user.role !== "Admin") {
      return res.status(403).json({
        success: false,
        message: "Only admin can create users",
      });
    }

    // ✅ 2. CHECK EXISTING USER
    const existingUser = await User.findOne({ mobileNumber });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    // ✅ 3. HASH PASSWORD
    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ 4. CREATE USER IN SAME COMPANY
    const user = await User.create({
      name,
      mobileNumber,
      password: hashedPassword,
      role,
      company: req.user.company,
    });

    // ✅ 5. RESPONSE
    res.status(201).json({
      success: true,
      message: "User created successfully",
      user,
    });

  } catch (error) {
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
      company: req.user.company   // ✅ FIXED HERE
    })
      .select("-password")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: users.length,
      users,
    });

  } catch (error) {
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
    const user = await User.findOneAndUpdate(
      {
        _id: req.params.id,
        company: req.user.company, // ✅ PROTECT
      },
      req.body,
      { new: true }
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
    const user = await User.findOneAndDelete({
      _id: req.params.id,
      company: req.user.company, // ✅ PROTECT
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
    const user = await User.findOne({
      _id: req.params.id,
      company: req.user.company, // ✅ PROTECT
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

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const user = await User.findOneAndUpdate(
      {
        _id: req.params.id,
        company: req.user.company, // ✅ PROTECT
      },
      { password: hashedPassword }
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
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};