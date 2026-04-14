import Joi from "joi";

export const transactionSchema = Joi.object({
  title: Joi.string()
    .min(2)
    .max(100)
    .required(),

  amount: Joi.number()
    .positive()
    .required(),

  type: Joi.string()
    .valid("income", "expense")
    .required(),

  category: Joi.string()
    .valid(
      "Food",
      "Travel",
      "Shopping",
      "Bills",
      "Salary",
      "Other"
    )
    .required(),

  date: Joi.date()
    .optional()
});