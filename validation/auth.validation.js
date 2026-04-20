//auth validation
import Joi from "joi";

export const registerSchema = Joi.object({
  mobileNumber: Joi.string()
    .pattern(/^[0-9]{10}$/)
    .required()
    .messages({
      "string.pattern.base":
        "Mobile number must be 10 digits"
    }),

  password: Joi.string()
    .min(6)
    .max(20)
    .required(),

  name: Joi.string()
    .min(2)
    .max(50)
    .required()
});

export const loginSchema = Joi.object({
  mobileNumber: Joi.string()
    .pattern(/^[0-9]{10}$/)
    .required(),

  password: Joi.string()
    .required()
});