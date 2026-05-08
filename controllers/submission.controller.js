//submission contoller 
import Form from "../models/form.model.js";
import Submission from "../models/formSubmission.model.js";
import { sendEmail } from "../utils/sendEmail.js";

export const submitForm = async (req, res) => {
  try {
    const { formId, responses } = req.body;

    const form = await Form.findById(formId);

    if (!form) {
      return res.status(404).json({ message: "Form not found" });
    }

    const submission = await Submission.create({
      form: form._id,
      company: req.user.company,
      submittedBy: req.user._id,
      responses,
    });

    // 🔔 SEND EMAIL TO HR + APPROVERS
    const emails = [
      ...form.notificationEmails,
    ];

    await sendEmail({
      to: emails,
      subject: "New Form Submission",
      text: `A new form "${form.title}" was submitted by ${req.user.name}`,
    });

    res.status(201).json({
      success: true,
      submission,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export const approveForm = async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id);

    submission.status = "approved";
    submission.approvedBy = req.user._id;

    await submission.save();

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};