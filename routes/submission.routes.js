//submission route
import express from "express";

import authMiddleware from "../middleware/auth.middleware.js";

import {
  submitForm,
  getFormSubmissions, 
  updateSubmissionStatus,
  approveForm,
} from "../controllers/submission.controller.js";

const router = express.Router();

// Employee submit form
router.post("/", authMiddleware, submitForm);

// HR view all submissions
router.get("/", authMiddleware, getFormSubmissions);

// HR approve/reject
router.put("/:id/status", authMiddleware, updateSubmissionStatus);

// HR approve directly
router.put("/:id/approve", authMiddleware, approveForm);

export default router;