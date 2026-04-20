//transaction validation
import Joi from "joi";

/* CREATE schema */

export const transactionSchema = Joi.object({
  amount: Joi.number()
    .positive()
    .required(),

  receiver: Joi.string()
    .min(2)
    .max(100)
   .allow("")
   .optional(),

   project: Joi.string()
  .optional()
  .allow(null),

  date: Joi.date()
    .optional(),

  category: Joi.string()
    .valid(
      "Food",
      "Travel",
      "Shopping",
       "Transport",   // ← ADD THIS
      "Bills",
      "Other",
      "Salary",
      "Education",
      "Entertainment",
      "Healthcare"
    )
    .required(),

  type: Joi.string()
    .valid("income", "expense")
    .required(),

  note: Joi.string()
  .max(500)
    .allow("")
    .optional(),
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

  note: Joi.string()
   .max(500)
    .allow("")
    .optional(),
});