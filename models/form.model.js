import mongoose from "mongoose";
import crypto from "crypto";

const fieldSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: true,
    },

    type: {
      type: String,
      required: true,
      enum: ["text", "textarea", "number", "date", "select"],
    },

    required: {
      type: Boolean,
      default: false,
    },

    options: {
      type: [String],
      default: [],
    },
  },
  { _id: false }
);

const formSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },

    description: {
      type: String,
      default: "",
    },

    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    fields: [fieldSchema],

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

    // Public QR sharing: when enabled, anyone with the link/QR can view
    // and submit this form without logging in.
    isPublic: {
      type: Boolean,
      default: false,
    },

    publicToken: {
      type: String,
      unique: true,
      sparse: true,
    },
  },
  { timestamps: true }
);

formSchema.methods.ensurePublicToken = function () {
  if (!this.publicToken) {
    this.publicToken = crypto.randomBytes(16).toString("hex");
  }
  return this.publicToken;
};

const Form = mongoose.model("Form", formSchema);

export default Form;