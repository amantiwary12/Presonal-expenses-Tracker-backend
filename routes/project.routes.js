import express from "express";
import authMiddleware from "../middleware/auth.middleware.js";

import {
  createProject,
  getProjectById,
  getProjectDashboard,
  getProjects,
  getProjectSummary,
  getProjectTransactions,
  updateProjectStatus,
} from "../controllers/project.controller.js";

const router = express.Router();

router.post("/", authMiddleware, createProject);

router.get("/", authMiddleware, getProjects);

router.get("/:id", authMiddleware, getProjectById);

router.get("/:id/dashboard", authMiddleware, getProjectDashboard);

router.get("/:id/summary", authMiddleware, getProjectSummary);

router.get("/:id/transactions", authMiddleware, getProjectTransactions);

router.patch("/:id/status", authMiddleware, updateProjectStatus);



export default router;
