import Joi from "joi";

/* CREATE schema */

export const transactionSchema = Joi.object({
  amount: Joi.number()
    .positive()
    .required(),

  receiver: Joi.string()
    .min(2)
    .max(100)
    .required(),

  date: Joi.date()
    .required(),

  category: Joi.string()
    .valid(
      "Food",
      "Travel",
      "Shopping",
      "Bills",
      "Other",
      "Salary"
    )
    .required(),

  type: Joi.string()
    .valid("income", "expense")
    .required(),

  note: Joi.string().allow("")
});


/* UPDATE schema — paste HERE */

export const updateTransactionSchema = Joi.object({
  amount: Joi.number().positive(),

  receiver: Joi.string()
    .min(2)
    .max(100),

  date: Joi.date(),

  category: Joi.string().valid(
    "Food",
    "Travel",
    "Shopping",
    "Bills",
    "Other",
    "Salary"
  ),

  type: Joi.string().valid(
    "income",
    "expense"
  ),

  note: Joi.string().allow("")
});