//transaction model
import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      default: null,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    type: {
      type: String,
      enum: ["income", "expense"],
      required: true,
    },

    category: {
      type: String,
      required: true,
    },

    receiver: {
      type: String,
    },

    date: {
      type: Date,
      default: Date.now,
    },

    note: {
      type: String,
    },

    screenshot: {
      url: {
        type: String,
      },
      public_id: {
        type: String,
      },
    },
    receipt: {
      type: String,
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

export default mongoose.model("Transaction", transactionSchema);
