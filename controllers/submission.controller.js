//submission contoller 
import Form from "../models/form.model.js";
import FormSubmission from "../models/formSubmission.model.js";
import { sendEmail } from "../utils/sendEmail.js";

// Employee submits form
export const submitForm = async (req, res) => {
  try {
    const { formId, responses } = req.body;

    const form = await Form.findOne({
      _id: formId,
      company: req.user.company._id,
    });

    if (!form) {
      return res.status(404).json({
        success: false,
        message: "Form not found",
      });
    }

    const submission = await FormSubmission.create({
      form: formId,
      company: req.user.company._id,
      submittedBy: req.user._id,
      responses,
    });

    res.status(201).json({
      success: true,
      submission,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// HR gets all submissions
export const getFormSubmissions = async (req, res) => {
  try {

    if (req.user.role !== "HR") {
      return res.status(403).json({
        success: false,
        message: "Only HR can view submissions",
      });
    }

    const submissions = await FormSubmission.find({
      company: req.user.company._id,
    })
      .populate("submittedBy", "name mobileNumber")
      .populate("form", "title")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      submissions,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// HR approve/reject submission
export const updateSubmissionStatus = async (req, res) => {
  try {

    if (req.user.role !== "HR") {
      return res.status(403).json({
        success: false,
        message: "Only HR can approve/reject",
      });
    }

    const { id } = req.params;

    const { status, rejectionReason } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    const submission = await FormSubmission.findOne({
      _id: id,
      company: req.user.company._id,
    });

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: "Submission not found",
      });
    }

    submission.status = status;

    submission.approvedBy = req.user._id;

    submission.approvedAt = new Date();

    if (status === "rejected") {
      submission.rejectionReason = rejectionReason || "";
    }

    await submission.save();

    res.status(200).json({
      success: true,
      message: `Submission ${status}`,
      submission,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


export const approveForm = async (req, res) => {
  try {

    if (req.user.role !== "HR") {
      return res.status(403).json({
        success: false,
        message: "Only HR can approve forms",
      });
    }

    const submission = await FormSubmission.findOne({
      _id: req.params.id,
      company: req.user.company._id,
    });

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: "Submission not found",
      });
    }

    submission.status = "approved";
    submission.approvedBy = req.user._id;
    submission.approvedAt = new Date();

    await submission.save();

    res.status(200).json({
      success: true,
      message: "Form approved successfully",
      submission,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};