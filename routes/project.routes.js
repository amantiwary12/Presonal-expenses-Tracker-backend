//project route
import express from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import allowRoles from "../middleware/allowRoles.js";

import {
  createProject,
  getProjectById,
  getProjectDashboard,
  getProjects,
  getProjectSummary,
  getProjectTransactions,
  updateProjectStatus,
  deleteProject,
  getProjectWithProgress,
} from "../controllers/project.controller.js";

const router = express.Router();

/* CREATE PROJECT */
router.post("/", authMiddleware, allowRoles("Admin", "Manager"), createProject);

/* GET ALL PROJECTS */
router.get(
  "/",
  authMiddleware,
  allowRoles("Admin", "Manager", "Employee", "HR"),
  getProjects,
);

/* GET PROJECT BY ID */
router.get(
  "/:id",
  authMiddleware,
  allowRoles("Admin", "Manager", "Employee", "HR"),
  getProjectById,
);

/* DASHBOARD */
router.get(
  "/:id/dashboard",
  authMiddleware,
  allowRoles("Admin", "Manager"),
  getProjectDashboard,
);

/* SUMMARY */
router.get(
  "/:id/summary",
  authMiddleware,
  allowRoles("Admin", "Manager"),
  getProjectSummary,
);

/* PROJECT TRANSACTIONS */
router.get(
  "/:id/transactions",
  authMiddleware,
  allowRoles("Admin", "Manager"),
  getProjectTransactions,
);

/* DELETE PROJECT */
router.delete(
  "/:id",
  authMiddleware,
  allowRoles("Admin", "Manager"),
  deleteProject,
);

/* UPDATE STATUS */
router.patch(
  "/:id/status",
  authMiddleware,
  allowRoles("Manager", "Admin"),
  updateProjectStatus,
);

router.get("/:id/progress", authMiddleware, getProjectWithProgress);

export default router;