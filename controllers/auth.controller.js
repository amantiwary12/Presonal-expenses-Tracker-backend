//auth controller 
import User from "../models/user.model.js";
import generateToken from "../utils/generateToken.js";
import { hashPassword, comparePassword } from "../utils/hashPassword.js";

export const registerUser = async (req, res) => {
  try {
   const { name, mobileNumber, password } = req.body;

    const existingUser = await User.findOne({ mobileNumber });

    if (existingUser) {
      return res.status(400).json({
        message: "Mobile number already registered",
      });
    }

    const hashedPassword = await hashPassword(password);

    const user = await User.create({
        name,
      mobileNumber,
      password: hashedPassword,
    });

    res.status(201).json({
      message: "User registered successfully",
  token: generateToken(user._id),
  user: {
    id: user._id,
    mobileNumber: user.mobileNumber
  }
});
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { mobileNumber, password } = req.body;

    const user = await User.findOne({ mobileNumber });

    if (!user) {
      return res.status(400).json({
        message: "User not found",
      });
    }

    const isMatch = await comparePassword(
      password,
      user.password
    );

    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid credentials",
      });
    }

    res.json({
      message: "User logged in successfully",
  token: generateToken(user._id),
  user: {
    id: user._id,
    mobileNumber: user.mobileNumber
  }
});
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
