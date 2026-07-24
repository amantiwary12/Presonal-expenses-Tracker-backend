//submission route
import express from "express";
import rateLimit from "express-rate-limit";

import authMiddleware from "../middleware/auth.middleware.js";

import {
  submitForm,
  submitPublicForm,
  getFormSubmissions,
  getMySubmissions,
  updateSubmissionStatus,
  approveForm,
} from "../controllers/submission.controller.js";

const router = express.Router();

// Public submissions have no login to gate them, so cap volume per IP
const publicSubmitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: "Too many submissions, please try again later" },
});

// PUBLIC: submit a form reached via its QR/share link — no auth
router.post("/public/:token", publicSubmitLimiter, submitPublicForm);

// Get logged-in user's own submissions
router.get("/my", authMiddleware, getMySubmissions);

// Employee submit form
router.post("/", authMiddleware, submitForm);

// HR view all submissions
router.get("/", authMiddleware, getFormSubmissions);

// HR approve/reject
router.put("/:id/status", authMiddleware, updateSubmissionStatus);

// HR approve directly
router.put("/:id/approve", authMiddleware, approveForm);

export default router;