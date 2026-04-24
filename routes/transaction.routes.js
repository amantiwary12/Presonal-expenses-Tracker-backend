import express from "express";

import upload from "../middleware/upload.middleware.js";
import authMiddleware from "../middleware/auth.middleware.js";
import validate from "../middleware/validate.middleware.js";
import allowRoles from "../middleware/allowRoles.js";

import {
  transactionSchema,
  updateTransactionSchema,
} from "../validation/transaction.validation.js";

import {
  createTransaction,
  getTransactions,
  deleteTransaction,
  updateTransaction,
  getSummary,
  getMonthlySummary,
  getWeeklySummary,
  getYearlySummary,
  getCategorySummary,
  getDashboardData,
  exportTransactions,
  clearTransactions,
  getDailyExpenses,
} from "../controllers/transaction.controller.js";

const router = express.Router();

/* CREATE */
router.post(
  "/",
  authMiddleware,
  allowRoles("Admin", "FinanceManager", "Employee"),
  upload.single("screenshot"),
  validate(transactionSchema),
  createTransaction
);

/* READ */
router.get(
  "/",
  authMiddleware,
  allowRoles("Admin", "FinanceManager", "Manager", "Employee"),
  getTransactions
);

/* UPDATE */
router.put(
  "/:id",
  authMiddleware,
  allowRoles("Admin", "FinanceManager"),
  upload.single("screenshot"),
  validate(updateTransactionSchema),
  updateTransaction
);

/* DELETE */
router.delete(
  "/:id",
  authMiddleware,
  allowRoles("Admin", "FinanceManager"),
  deleteTransaction
);

/* SUMMARIES */
router.get(
  "/daily-expenses",
  authMiddleware,
  allowRoles("Admin", "FinanceManager", "Manager"),
  getDailyExpenses
);

router.get(
  "/dashboard",
  authMiddleware,
  allowRoles("Admin", "FinanceManager"),
  getDashboardData
);

router.delete(
  "/clear",
  authMiddleware,
  allowRoles("Admin"),
  clearTransactions
);

export default router;