import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    
    console.log("DECODED:", decoded);

    // ✅ FIX: Populate company data
    const user = await User.findById(decoded.id)
      .select("-password")
      .populate("company");  // ← THIS IS CRITICAL

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    // ✅ Set complete user object with populated company
    req.user = {
      _id: user._id,
      id: user._id,
      name: user.name,
      role: user.role,
      mobileNumber: user.mobileNumber,
      company: user.company,  // This will now have company data
      isActive: user.isActive,
    };

    console.log("REQ USER with populated company:", {
      id: req.user._id,
      role: req.user.role,
      company: req.user.company?._id,
      companyName: req.user.company?.name,
    });

    next();
  } catch (error) {
    console.error("Auth error:", error);
    return res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }
};

export default authMiddleware;