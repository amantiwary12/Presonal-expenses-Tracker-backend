//budget route
import express from "express";
import authMiddleware from "../middleware/auth.middleware.js";

import {
  deleteBudget,
  editSpentAmount,
  // setBudget,
  // getBudget,
  getBudgetStatus,
  getBudgetsWithSpent,
  removeSpentAmount,
  setCategoryBudget,
  updateSpentAmount,
} from "../controllers/budget.controller.js";

const router = express.Router();

router.post("/", authMiddleware, setCategoryBudget);

router.get("/", authMiddleware, getBudgetsWithSpent);

router.patch("/:id/spent", authMiddleware, updateSpentAmount);

router.get("/status", authMiddleware, getBudgetStatus);

router.delete("/:id", authMiddleware, deleteBudget);

router.patch("/:id/spent/edit", authMiddleware, editSpentAmount);

router.patch("/:id/spent/remove", authMiddleware, removeSpentAmount);

export default router;
