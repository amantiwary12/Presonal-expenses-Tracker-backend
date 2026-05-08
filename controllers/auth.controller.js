//auth controller
import User from "../models/user.model.js";
import generateToken from "../utils/generateToken.js";
import { hashPassword, comparePassword } from "../utils/hashPassword.js";
import Company from "../models/Company.model.js";

export const registerUser = async (req, res) => {
  try {
    const { name, mobileNumber, password, companyName } = req.body;

    const existingUser = await User.findOne({ mobileNumber });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Mobile number already registered",
      });
    }

    const hashedPassword = await hashPassword(password);

    // ✅ CREATE NEW COMPANY
    const company = await Company.create({
      name: companyName || `${name}'s Company`,
    });

    // ✅ CREATE USER AS ADMIN
    const user = await User.create({
      name,
      mobileNumber,
      password: hashedPassword,
      role: "Admin",
      company: company._id,
    });

    // ✅ Generate token
    const token = generateToken(user);

    // ✅ Return user with company
    res.status(201).json({
      success: true,
      message: "User registered successfully",
      token,
      user: {
        _id: user._id,
        name: user.name,
        mobileNumber: user.mobileNumber,
        role: user.role,
        company: {
          _id: company._id,
          name: company.name,
        },
        isActive: user.isActive,
      },
    });

  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { mobileNumber, password } = req.body;

    const user = await User.findOne({
      mobileNumber: mobileNumber.trim(),
    }).populate("company");  // ← Populate company

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not found",
      });
    }

    const isMatch = await comparePassword(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const token = generateToken(user);

    res.json({
      success: true,
      message: "User logged in successfully",
      token,
      user: {
        _id: user._id,
        name: user.name,
        mobileNumber: user.mobileNumber,
        role: user.role,
        company: user.company,  // ← Full company object
        isActive: user.isActive,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getMe = async (req, res) => {
  try {
    console.log("INSIDE getMe controller");
    console.log("req.user:", req.user);

    // ✅ Fetch full user with company populated
    const user = await User.findById(req.user._id)
      .select("-password")
      .populate("company");  // ← IMPORTANT: Populate company data

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        mobileNumber: user.mobileNumber,
        role: user.role,
        isActive: user.isActive,
        company: user.company,  // ← Now this will have company data
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("GET ME ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};