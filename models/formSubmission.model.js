//form submission 
import mongoose from "mongoose";

const submissionSchema = new mongoose.Schema(
  {
    form: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Form",
      required: true,
    },

    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // Set when a form was submitted via public QR link by someone with no account
    guestName: {
      type: String,
      trim: true,
    },

    guestContact: {
      type: String,
      trim: true,
    },

    responses: [
      {
        fieldLabel: String,
        value: mongoose.Schema.Types.Mixed,
      },
    ],

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    approvedBy: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "User",
},

approvedAt: {
  type: Date,
},

rejectionReason: {
  type: String,
},
  },
  { timestamps: true }
);

export default mongoose.model("FormSubmission", submissionSchema);