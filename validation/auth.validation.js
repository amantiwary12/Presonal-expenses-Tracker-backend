// backend/validation/auth.validation.js
import Joi from "joi";

export const registerSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(50)
    .required(),

  mobileNumber: Joi.string()
    .pattern(/^[0-9]{10}$/)
    .required(),

  password: Joi.string()
    .min(6)
    .max(20)
    .required(),

  companyName: Joi.string()  // ✅ MUST be here
    .min(2)
    .max(100)
    .required()
});

export const loginSchema = Joi.object({
  mobileNumber: Joi.string()
    .pattern(/^[0-9]{10}$/)
    .required(),

  password: Joi.string()
    .required()
});