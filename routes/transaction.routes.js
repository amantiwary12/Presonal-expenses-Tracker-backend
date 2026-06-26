// transaction router

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
  allowRoles("Admin", "FinanceManager", "Manager", "Employee", "HR"),
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

/* SUMMARIES — must be defined before DELETE /:id and GET /:id to avoid param capture */
router.get(
  "/daily-expenses",
  authMiddleware,
  allowRoles("Admin", "FinanceManager", "Manager", "HR"),
  getDailyExpenses
);

router.get(
  "/dashboard",
  authMiddleware,
  allowRoles("Admin", "FinanceManager", "HR"),
  getDashboardData
);

/* FIX: /clear must come BEFORE /:id — otherwise Express matches "clear" as an id param */
router.delete(
  "/clear",
  authMiddleware,
  allowRoles("Admin"),
  clearTransactions
);

router.get(
  "/weekly-summary",
  authMiddleware,
  allowRoles("Admin", "FinanceManager", "Manager", "HR"),
  getWeeklySummary
);

router.get(
  "/monthly-summary",
  authMiddleware,
  allowRoles("Admin", "FinanceManager", "Manager", "HR"),
  getMonthlySummary
);

router.get(
  "/yearly-summary",
  authMiddleware,
  allowRoles("Admin", "FinanceManager", "Manager", "HR"),
  getYearlySummary
);

router.get(
  "/category-summary",
  authMiddleware,
  allowRoles("Admin", "FinanceManager", "Manager", "HR"),
  getCategorySummary
);

/* Employee included so personal dashboard can show their own summary */
router.get(
  "/summary",
  authMiddleware,
  allowRoles("Admin", "FinanceManager", "Manager", "HR", "Employee"),
  getSummary
);

router.get(
  "/export",
  authMiddleware,
  allowRoles("Admin", "FinanceManager", "Manager"),
  exportTransactions
);

/* PARAM ROUTES — must come after all fixed-path routes */
/* DELETE */
router.delete(
  "/:id",
  authMiddleware,
  allowRoles("Admin", "FinanceManager"),
  deleteTransaction
);

export default router;
