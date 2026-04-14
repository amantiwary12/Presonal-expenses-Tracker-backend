import express from "express";

import upload from "../middleware/upload.middleware.js";

import authMiddleware from "../middleware/auth.middleware.js";

import validate from "../middleware/validate.middleware.js";

import { transactionSchema } from "../validation/transaction.validation.js";

import {
  createTransaction,
  getTransactions,
  deleteTransaction,
  updateTransaction,
  getSummary,
  getMonthlySummary,
  getWeeklySummary,
  getYearlySummary,
} from "../controllers/transaction.controller.js";

const router = express.Router();

/*
   CREATE TRANSACTION
   POST /api/transactions/add
*/
router.post(
  "/add",
  authMiddleware,
  upload.single("screenshot"),
  validate(transactionSchema),
  createTransaction,
);

/*
   GET ALL TRANSACTIONS
   GET /api/transactions
*/
router.get("/", authMiddleware, getTransactions);

/*
   DELETE TRANSACTION
   DELETE /api/transactions/:id
*/
router.delete("/:id", authMiddleware, deleteTransaction);

router.put("/:id", authMiddleware, updateTransaction);

router.get("/summary", authMiddleware, getSummary);

router.get("/weekly-summary", authMiddleware, getWeeklySummary);

router.get("/monthly-summary", authMiddleware, getMonthlySummary);

router.get("/yearly-summary", authMiddleware, getYearlySummary);

export default router;
