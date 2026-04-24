//user model
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    role: {
      type: String,
      enum: [
        "SuperAdmin",
        "Admin",
        "FinanceManager",
        "Manager",
        "Employee",
        "Viewer",
      ],
      default: "Employee",
    },

    mobileNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
    },
  },
  {
    timestamps: true,
  },
);

const User =
  mongoose.models.User ||
  mongoose.model("User", userSchema);

export default User;
