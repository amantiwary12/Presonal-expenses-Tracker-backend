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
} from "../controllers/transaction.controller.js";

const router = express.Router();

router.put(
  "/:id",
  authMiddleware,
  upload.single("screenshot"),
  validate(updateTransactionSchema),
  updateTransaction,
);

router.get("/", authMiddleware, getTransactions);

router.delete("/:id", authMiddleware, deleteTransaction);

router.put(
  "/:id",
  authMiddleware,
  upload.single("screenshot"),
  validate(transactionSchema),
  updateTransaction,
);

router.get("/summary", authMiddleware, getSummary);

router.get("/weekly-summary", authMiddleware, getWeeklySummary);

router.get("/monthly-summary", authMiddleware, getMonthlySummary);

router.get("/yearly-summary", authMiddleware, getYearlySummary);

router.get("/category-summary", authMiddleware, getCategorySummary);

router.get("/dashboard", authMiddleware, getDashboardData);

router.get("/export", authMiddleware, exportTransactions);

router.get("/summary/weekly", authMiddleware, getWeeklySummary);

router.get("/summary/yearly", authMiddleware, getYearlySummary);

export default router;
