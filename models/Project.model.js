import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    name: {
      type: String,
      required: true,
    },

    description: String,

    budget: {
      type: Number,
      required: true,
    },

    startDate: {
      type: Date,
      default: Date.now,
    },

    status: {
      type: String,
      enum: ["active", "completed", "paused", "on-hold", "cancelled"],
      default: "active",
    },
    completedAt: {
      type: Date,
    },
  },
  { timestamps: true },
);

export default mongoose.model("Project", projectSchema);
