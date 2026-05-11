//form controller 
import Form from "../models/form.model.js";

export const createForm = async (req, res) => {
  try {
    if (req.user.role !== "HR") {
      return res.status(403).json({ message: "Only HR can create forms" });
    }

    const form = await Form.create({
      ...req.body,
      createdBy: req.user._id,
      company: req.user.company,
    });

    res.status(201).json({
      success: true,
      form,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export const getForms = async (req, res) => {
  try {
    const forms = await Form.find({
      company: req.user.company,
    });

    res.json({ success: true, forms });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export const updateForm = async (req, res) => {
  try {

    // ONLY HR
    if (req.user.role !== "HR") {
      return res.status(403).json({
        success: false,
        message: "Only HR can edit forms",
      });
    }

    const { id } = req.params;

    const form = await Form.findOne({
      _id: id,
      company: req.user.company,
    });

    if (!form) {
      return res.status(404).json({
        success: false,
        message: "Form not found",
      });
    }

    // Update fields
    form.title = req.body.title || form.title;
    form.description =
      req.body.description || form.description;

    form.fields = req.body.fields || form.fields;

    await form.save();

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


export const deleteForm = async (req, res) => {
  try {

    // ONLY HR
    if (req.user.role !== "HR") {
      return res.status(403).json({
        success: false,
        message: "Only HR can delete forms",
      });
    }

    const { id } = req.params;

    const form = await Form.findOneAndDelete({
      _id: id,
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