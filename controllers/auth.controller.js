//auth controller
import User from "../models/user.model.js";
import generateToken from "../utils/generateToken.js";
import { hashPassword, comparePassword } from "../utils/hashPassword.js";

export const registerUser = async (req, res) => {
  try {
    const { name, mobileNumber, password } = req.body;

    const existingUser = await User.findOne({
      mobileNumber,
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Mobile number already registered",
      });
    }

    const hashedPassword = await hashPassword(password);

    const user = await User.create({
      name,
      mobileNumber,
      password: hashedPassword,

      /*
         FORCE DEFAULT ROLE
      */

      role: "Employee",
    });

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      token: generateToken(user),
      user: {
        _id: user._id,
        name: user.name,
        mobileNumber: user.mobileNumber,
        role: user.role,
      },
    });
  } catch (error) {
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
       mobileNumber: mobileNumber.trim()
    });

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

    res.json({
      success: true,
      message: "User logged in successfully",
      token: generateToken(user),
      user: {
        _id: user._id,
        name: user.name,
        mobileNumber: user.mobileNumber,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


export const getMe = async (req, res) => {
  try {
    console.log("INSIDE getMe controller");

    return res.status(200).json({
      success: true,
      user: req.user,
    });

  } catch (error) {
    console.error("GET ME ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};



