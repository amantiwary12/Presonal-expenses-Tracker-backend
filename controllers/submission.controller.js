// //submission contoller 
// import Form from "../models/form.model.js";
// import FormSubmission from "../models/formSubmission.model.js";
// import { sendEmail } from "../utils/sendEmail.js";

// // Employee submits form
// export const submitForm = async (req, res) => {
//   try {
//     const { formId, responses } = req.body;

//     const form = await Form.findOne({
//       _id: formId,
//       company: req.user.company._id,
//     });

//     if (!form) {
//       return res.status(404).json({
//         success: false,
//         message: "Form not found",
//       });
//     }

//     const submission = await FormSubmission.create({
//       form: formId,
//       company: req.user.company._id,
//       submittedBy: req.user._id,
//       responses,
//     });

//     res.status(201).json({
//       success: true,
//       submission,
//     });

//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };


// // HR gets all submissions
// export const getFormSubmissions = async (req, res) => {
//   try {

//     if (req.user.role !== "HR") {
//       return res.status(403).json({
//         success: false,
//         message: "Only HR can view submissions",
//       });
//     }

//     const submissions = await FormSubmission.find({
//       company: req.user.company._id,
//     })
//       .populate("submittedBy", "name mobileNumber")
//       .populate("form", "title")
//       .sort({ createdAt: -1 });

//     res.status(200).json({
//       success: true,
//       submissions,
//     });

//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };


// // HR approve/reject submission
// export const updateSubmissionStatus = async (req, res) => {
//   try {

//     if (req.user.role !== "HR") {
//       return res.status(403).json({
//         success: false,
//         message: "Only HR can approve/reject",
//       });
//     }

//     const { id } = req.params;

//     const { status, rejectionReason } = req.body;

//     if (!["approved", "rejected"].includes(status)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid status",
//       });
//     }

//     const submission = await FormSubmission.findOne({
//       _id: id,
//       company: req.user.company._id,
//     });

//     if (!submission) {
//       return res.status(404).json({
//         success: false,
//         message: "Submission not found",
//       });
//     }

//     submission.status = status;

//     submission.approvedBy = req.user._id;

//     submission.approvedAt = new Date();

//     if (status === "rejected") {
//       submission.rejectionReason = rejectionReason || "";
//     }

//     await submission.save();

//     res.status(200).json({
//       success: true,
//       message: `Submission ${status}`,
//       submission,
//     });

//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };


// export const approveForm = async (req, res) => {
//   try {

//     if (req.user.role !== "HR") {
//       return res.status(403).json({
//         success: false,
//         message: "Only HR can approve forms",
//       });
//     }

//     const submission = await FormSubmission.findOne({
//       _id: req.params.id,
//       company: req.user.company._id,
//     });

//     if (!submission) {
//       return res.status(404).json({
//         success: false,
//         message: "Submission not found",
//       });
//     }

//     submission.status = "approved";
//     submission.approvedBy = req.user._id;
//     submission.approvedAt = new Date();

//     await submission.save();

//     res.status(200).json({
//       success: true,
//       message: "Form approved successfully",
//       submission,
//     });

//   } catch (error) {

//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });

//   }
// };





// submission.controller.js  ✅ FULLY UPDATED
import Form from "../models/form.model.js";
import FormSubmission from "../models/formSubmission.model.js";
import User from "../models/user.model.js";
import { sendNotification } from "../utils/sendNotification.js";
import { sendEmail } from "../utils/sendEmail.js";

// ─────────────────────────────────────────────
// POST /api/submissions
// ANY logged-in user (Employee, Admin, Manager, FinanceManager etc.) can submit
// HR cannot submit (they create forms, not fill them)
// ─────────────────────────────────────────────
export const submitForm = async (req, res) => {
  try {
    // ✅ HR should not fill their own forms
    if (req.user.role === "HR") {
      return res.status(403).json({
        success: false,
        message: "HR cannot submit forms. HR creates and reviews forms.",
      });
    }

    const { formId, responses } = req.body;

    if (!formId) {
      return res.status(400).json({ success: false, message: "formId is required" });
    }

    // Find the form — must belong to same company
    const form = await Form.findOne({
      _id: formId,
      company: req.user.company?._id || req.user.company,
    }).populate("createdBy", "email");

    if (!form) {
      return res.status(404).json({ success: false, message: "Form not found" });
    }



    // Create submission
    const submission = await FormSubmission.create({
      form: formId,
      company: req.user.company?._id || req.user.company,
      submittedBy: req.user._id,
      responses,
    });

    // ─────────────────────────────────────────
    // GATHER RECIPIENTS: all HR users + the approvers HR selected on the form
    // ─────────────────────────────────────────
    const hrUsers = await User.find({
      company: req.user.company._id,
      role: "HR",
      isActive: true,
    });

    const approverUsers =
      form.approvers && form.approvers.length > 0
        ? await User.find({ _id: { $in: form.approvers } })
        : [];

    // Manually-entered notification emails on the form (kept for backward compatibility)
    const manualEmails = (form.notificationEmails || [])
      .map((email) => email?.trim())
      .filter(Boolean);
    if (form.createdBy?.email) manualEmails.push(form.createdBy.email.trim());

    const hrEmails = [
      ...new Set([...hrUsers.map((u) => u.email).filter(Boolean), ...manualEmails]),
    ];
    const approverEmails = [
      ...new Set(
        approverUsers.map((u) => u.email).filter((email) => email && !hrEmails.includes(email))
      ),
    ];

    // ─────────────────────────────────────────
    // SEND EMAILS
    // ─────────────────────────────────────────
    let responseSummary = `Form: ${form.title}\n`;
    responseSummary += `Submitted By: ${req.user.name} (${req.user.mobileNumber || "N/A"})\n`;
    responseSummary += `Date: ${new Date().toLocaleString()}\n\n`;
    responseSummary += `Responses:\n`;
    responses.forEach((resp) => {
      responseSummary += `- ${resp.fieldLabel}: ${resp.value}\n`;
    });

    const emailJobs = [];

    hrEmails.forEach((email) => {
      emailJobs.push(
        sendEmail({
          to: email,
          subject: `New Submission for Form: ${form.title}`,
          text: `A new form submission has been received and is awaiting review.\n\n${responseSummary}`,
        }).catch((err) => console.error(`Error sending email to ${email}:`, err))
      );
    });

    approverEmails.forEach((email) => {
      emailJobs.push(
        sendEmail({
          to: email,
          subject: `Approval Needed: ${form.title}`,
          text: `${req.user.name} submitted "${form.title}" and you have been selected as an approver for this form.\n\n${responseSummary}`,
        }).catch((err) => console.error(`Error sending email to ${email}:`, err))
      );
    });

    // ─────────────────────────────────────────
    // NOTIFY ALL HR MEMBERS IN THE COMPANY (in-app)
    // ─────────────────────────────────────────
    const notifyPromises = hrUsers.map((hrUser) =>
      sendNotification({
        userId: hrUser._id,
        title: "New Form Submission",
        message: `${req.user.name} submitted "${form.title}". Please review it.`,
        type: "form",
      })
    );

    // ─────────────────────────────────────────
    // NOTIFY APPROVERS THAT HR SELECTED IN THE FORM (in-app)
    // ─────────────────────────────────────────
    approverUsers.forEach((approverUser) => {
      notifyPromises.push(
        sendNotification({
          userId: approverUser._id,
          title: "Form Submitted — Your Approval Needed",
          message: `${req.user.name} submitted "${form.title}". You are listed as an approver.`,
          type: "form",
        })
      );
    });

    // Respond immediately — don't make the submitter wait on email/SMTP delivery.
    // Emails/notifications run in the background; each job already has its own .catch.
    Promise.allSettled([...emailJobs, ...notifyPromises]);

    res.status(201).json({
      success: true,
      message: "Form submitted successfully. HR has been notified.",
      submission,
    });
  } catch (error) {
    console.error("SUBMIT FORM ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────
// POST /api/submissions/public/:token
// PUBLIC — no login required. Reached by scanning a form's QR code.
// Submitter identity is whatever name/contact they typed on the form.
// ─────────────────────────────────────────────
export const submitPublicForm = async (req, res) => {
  try {
    const { guestName, guestContact, responses } = req.body;

    if (!guestName || !guestName.trim()) {
      return res.status(400).json({ success: false, message: "Name is required" });
    }
    if (!Array.isArray(responses)) {
      return res.status(400).json({ success: false, message: "responses is required" });
    }

    const form = await Form.findOne({
      publicToken: req.params.token,
      isPublic: true,
    }).populate("createdBy", "email");

    if (!form) {
      return res.status(404).json({ success: false, message: "This form is not available" });
    }

    const submission = await FormSubmission.create({
      form: form._id,
      company: form.company,
      guestName: guestName.trim(),
      guestContact: (guestContact || "").trim(),
      responses,
    });

    const hrUsers = await User.find({
      company: form.company,
      role: "HR",
      isActive: true,
    });

    const approverUsers =
      form.approvers && form.approvers.length > 0
        ? await User.find({ _id: { $in: form.approvers } })
        : [];

    const manualEmails = (form.notificationEmails || [])
      .map((email) => email?.trim())
      .filter(Boolean);
    if (form.createdBy?.email) manualEmails.push(form.createdBy.email.trim());

    const hrEmails = [
      ...new Set([...hrUsers.map((u) => u.email).filter(Boolean), ...manualEmails]),
    ];
    const approverEmails = [
      ...new Set(
        approverUsers.map((u) => u.email).filter((email) => email && !hrEmails.includes(email))
      ),
    ];

    let responseSummary = `Form: ${form.title}\n`;
    responseSummary += `Submitted By: ${guestName.trim()} (${guestContact?.trim() || "N/A"}) — via public QR link\n`;
    responseSummary += `Date: ${new Date().toLocaleString()}\n\n`;
    responseSummary += `Responses:\n`;
    responses.forEach((resp) => {
      responseSummary += `- ${resp.fieldLabel}: ${resp.value}\n`;
    });

    const emailJobs = [];

    hrEmails.forEach((email) => {
      emailJobs.push(
        sendEmail({
          to: email,
          subject: `New Submission for Form: ${form.title}`,
          text: `A new form submission has been received and is awaiting review.\n\n${responseSummary}`,
        }).catch((err) => console.error(`Error sending email to ${email}:`, err))
      );
    });

    approverEmails.forEach((email) => {
      emailJobs.push(
        sendEmail({
          to: email,
          subject: `Approval Needed: ${form.title}`,
          text: `${guestName.trim()} submitted "${form.title}" and you have been selected as an approver for this form.\n\n${responseSummary}`,
        }).catch((err) => console.error(`Error sending email to ${email}:`, err))
      );
    });

    const notifyPromises = hrUsers.map((hrUser) =>
      sendNotification({
        userId: hrUser._id,
        title: "New Form Submission",
        message: `${guestName.trim()} submitted "${form.title}" via QR link. Please review it.`,
        type: "form",
      })
    );

    approverUsers.forEach((approverUser) => {
      notifyPromises.push(
        sendNotification({
          userId: approverUser._id,
          title: "Form Submitted — Your Approval Needed",
          message: `${guestName.trim()} submitted "${form.title}" via QR link. You are listed as an approver.`,
          type: "form",
        })
      );
    });

    // Respond immediately — don't make the guest wait on email/SMTP delivery.
    Promise.allSettled([...emailJobs, ...notifyPromises]);

    res.status(201).json({
      success: true,
      message: "Form submitted successfully.",
      submission,
    });
  } catch (error) {
    console.error("SUBMIT PUBLIC FORM ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────
// GET /api/submissions
// HR only — view all submissions for their company
// ─────────────────────────────────────────────
export const getFormSubmissions = async (req, res) => {
  try {
    if (req.user.role !== "HR") {
      return res.status(403).json({
        success: false,
        message: "Only HR can view all submissions",
      });
    }

    const submissions = await FormSubmission.find({
      company: req.user.company._id,
    })
      .populate("submittedBy", "name mobileNumber role")
      .populate("form", "title description")
      .populate("approvedBy", "name")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, submissions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────
// GET /api/submissions/my
// Any logged-in user — see their OWN submissions
// ─────────────────────────────────────────────
export const getMySubmissions = async (req, res) => {
  try {
    const submissions = await FormSubmission.find({
      submittedBy: req.user._id,
      company: req.user.company._id,
    })
      .populate("form", "title description")
      .populate("approvedBy", "name")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, submissions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────
// PUT /api/submissions/:id/status
// HR approve or reject a submission
// ─────────────────────────────────────────────
export const updateSubmissionStatus = async (req, res) => {
  try {
    if (req.user.role !== "HR") {
      return res.status(403).json({
        success: false,
        message: "Only HR can approve or reject submissions",
      });
    }

    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const submission = await FormSubmission.findOne({
      _id: id,
      company: req.user.company._id,
    }).populate("form", "title").populate("submittedBy", "name _id");

    if (!submission) {
      return res.status(404).json({ success: false, message: "Submission not found" });
    }

    submission.status = status;
    submission.approvedBy = req.user._id;
    submission.approvedAt = new Date();

    if (status === "rejected") {
      submission.rejectionReason = rejectionReason || "";
    }

    await submission.save();

    // ✅ Notify the person who submitted the form about the decision
    if (submission.submittedBy?._id) {
      const statusText = status === "approved" ? "approved ✅" : "rejected ❌";
      const msg =
        status === "approved"
          ? `Your submission for "${submission.form?.title}" has been approved by HR.`
          : `Your submission for "${submission.form?.title}" was rejected. Reason: ${rejectionReason || "No reason provided"}`;

      await sendNotification({
        userId: submission.submittedBy._id,
        title: `Form ${statusText}`,
        message: msg,
        type: "form",
      });
    }

    res.status(200).json({
      success: true,
      message: `Submission ${status} successfully`,
      submission,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────
// PUT /api/submissions/:id/approve  (shortcut)
// ─────────────────────────────────────────────
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
    }).populate("form", "title").populate("submittedBy", "name _id");

    if (!submission) {
      return res.status(404).json({ success: false, message: "Submission not found" });
    }

    submission.status = "approved";
    submission.approvedBy = req.user._id;
    submission.approvedAt = new Date();
    await submission.save();

    // Notify the submitter
    if (submission.submittedBy?._id) {
      await sendNotification({
        userId: submission.submittedBy._id,
        title: "Form Approved ✅",
        message: `Your submission for "${submission.form?.title}" has been approved by HR.`,
        type: "form",
      });
    }

    res.status(200).json({
      success: true,
      message: "Form approved successfully",
      submission,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};