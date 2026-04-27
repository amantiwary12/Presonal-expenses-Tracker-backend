//budget model
import mongoose from "mongoose";

const budgetSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  category: {
    type: String,
    required: true
  },

  amount: {
    type: Number,
    required: true
  },

  month: {
    type: Number,
    required: true
  },

  date: {
  type: Date,
  default: Date.now
},

  year: {
    type: Number,
    required: true
  },

  alertThreshold: {
    type: Number,
    default: 80
  },
  spentAmount: {
  type: Number,
  default: 0
}

}, { timestamps: true });

budgetSchema.index(
  { user: 1, category: 1, month: 1, year: 1 },
  { unique: true }
);

const Budget =
  mongoose.models.Budget ||
  mongoose.model("Budget", budgetSchema);

export default Budget;