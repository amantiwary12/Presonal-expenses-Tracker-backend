//form model
import mongoose from "mongoose";

const formSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: String,

    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // HR
      required: true,
    },

    fields: [
      {
        label: String,
        type: String, // text, number, date, select, file
        required: Boolean,
        options: [String], // for dropdown
      },
    ],

    approvers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    notificationEmails: [
      {
        type: String,
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("Form", formSchema);