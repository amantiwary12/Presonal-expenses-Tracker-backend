import Form from "../models/form.model.js";


// HR CREATE FORM
export const createForm = async (req, res) => {
  try {

    if (req.user.role !== "HR") {
      return res.status(403).json({
        success: false,
        message: "Only HR can create forms",
      });
    }

    const {
      title,
      description,
      fields,
      approvers,
      notificationEmails,
    } = req.body;

    const form = await Form.create({
      title,
      description,
      fields,
      approvers,
      notificationEmails,

      createdBy: req.user._id,

      company: req.user.company,
    });

    res.status(201).json({
      success: true,
      form,
    });

  } catch (error) {

    console.error("CREATE FORM ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// GET ALL FORMS
export const getForms = async (req, res) => {
  try {

    const forms = await Form.find({
      company: req.user.company,
    })
      .populate("createdBy", "name")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      forms,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// HR UPDATE FORM
export const updateForm = async (req, res) => {
  try {

    if (req.user.role !== "HR") {
      return res.status(403).json({
        success: false,
        message: "Only HR can update forms",
      });
    }

    const form = await Form.findOneAndUpdate(
      {
        _id: req.params.id,
        company: req.user.company,
      },
      req.body,
      {
        new: true,
      }
    );

    if (!form) {
      return res.status(404).json({
        success: false,
        message: "Form not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Form updated successfully",
      form,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// HR DELETE FORM
export const deleteForm = async (req, res) => {
  try {

    if (req.user.role !== "HR") {
      return res.status(403).json({
        success: false,
        message: "Only HR can delete forms",
      });
    }

    const form = await Form.findOneAndDelete({
      _id: req.params.id,
      company: req.user.company,
    });

    if (!form) {
      return res.status(404).json({
        success: false,
        message: "Form not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Form deleted successfully",
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};