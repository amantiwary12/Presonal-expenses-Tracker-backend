//transaction route
import express from "express";

import upload from "../middleware/upload.middleware.js";

import authMiddleware from "../middleware/auth.middleware.js";

import validate from "../middleware/validate.middleware.js";

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
  upload.single("screenshot"),
  validate(transactionSchema),
  createTransaction,
);

/* READ */
router.get("/", authMiddleware, getTransactions);

/* UPDATE */
router.put(
  "/:id",
  authMiddleware,
  upload.single("screenshot"),
  validate(updateTransactionSchema),
  updateTransaction,
);

/* DELETE */
router.delete("/:id", authMiddleware, deleteTransaction);

/* SUMMARIES */
router.get("/summary", authMiddleware, getSummary);

router.get("/daily-expenses", authMiddleware, getDailyExpenses);

router.get("/weekly-summary", authMiddleware, getWeeklySummary);

router.get("/monthly-summary", authMiddleware, getMonthlySummary);

router.get("/yearly-summary", authMiddleware, getYearlySummary);

router.get("/summary/category", authMiddleware, getCategorySummary);

router.get("/dashboard", authMiddleware, getDashboardData);

router.get("/export", authMiddleware, exportTransactions);

router.delete("/clear", authMiddleware, clearTransactions);

export default router;
