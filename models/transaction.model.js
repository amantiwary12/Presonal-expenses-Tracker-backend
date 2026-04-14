import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  amount: {
    type: Number,
    required: true
  },

  type: {
    type: String,
    enum: ["income", "expense"],
    required: true
  },

  category: {
    type: String,
    required: true
  },

  receiver: {
    type: String
  },

  date: {
    type: Date,
    default: Date.now
  },

  note: {
    type: String
  },

  screenshot: {
    type: String
  }

}, { timestamps: true }
);


export default mongoose.model("Transaction", transactionSchema);