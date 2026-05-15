import mongoose from "mongoose";

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
  },
  { timestamps: true }
);

const Form = mongoose.model("Form", formSchema);

export default Form;