import express from "express";

import authMiddleware from "../middleware/auth.middleware.js";
import allowRoles from "../middleware/allowRoles.js";

import { importUpload }
  from "../middleware/importUpload.middleware.js";

import {
  importProjectData,
} from "../controllers/import.controller.js";

const router = express.Router();

router.post(
  "/import-project-data",

  authMiddleware,

  allowRoles(
    "Admin",
    "FinanceManager",
    "Manager"
  ),

  importUpload.single("file"),

  importProjectData
);

export default router; 