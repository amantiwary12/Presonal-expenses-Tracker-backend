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

      company: req.user.company?._id || req.user.company,
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
      company: req.user.company?._id || req.user.company,
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
        company: req.user.company?._id || req.user.company,
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


// HR ENABLE/DISABLE PUBLIC QR SHARING FOR A FORM
export const toggleFormShare = async (req, res) => {
  try {

    if (req.user.role !== "HR") {
      return res.status(403).json({
        success: false,
        message: "Only HR can share forms",
      });
    }

    const form = await Form.findOne({
      _id: req.params.id,
      company: req.user.company?._id || req.user.company,
    });

    if (!form) {
      return res.status(404).json({
        success: false,
        message: "Form not found",
      });
    }

    const isPublic = req.body.isPublic !== undefined ? !!req.body.isPublic : true;

    form.isPublic = isPublic;
    if (isPublic) {
      form.ensurePublicToken();
    }

    await form.save();

    res.status(200).json({
      success: true,
      form,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// PUBLIC: GET FORM BY SHARE TOKEN (no auth — used by QR code fill page)
export const getPublicForm = async (req, res) => {
  try {

    const form = await Form.findOne({
      publicToken: req.params.token,
      isPublic: true,
    }).select("title description fields");

    if (!form) {
      return res.status(404).json({
        success: false,
        message: "This form is not available",
      });
    }

    res.status(200).json({
      success: true,
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
      company: req.user.company?._id || req.user.company,
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