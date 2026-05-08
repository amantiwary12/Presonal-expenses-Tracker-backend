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
