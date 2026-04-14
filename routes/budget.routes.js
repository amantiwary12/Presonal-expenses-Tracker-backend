import express from "express";
import authMiddleware from "../middleware/auth.middleware.js";

import {
  setBudget,
  getBudget,
  getBudgetStatus,
} from "../controllers/budget.controller.js";

const router = express.Router();

router.post("/", authMiddleware, setBudget);

router.get("/", authMiddleware, getBudget);

router.get("/status", authMiddleware, getBudgetStatus);

export default router;
