//form route 
import express from "express";

import authMiddleware from "../middleware/auth.middleware.js";

import {
  createForm,
  getForms,
   updateForm,
  deleteForm,
  toggleFormShare,
  getPublicForm,
} from "../controllers/form.controller.js";

const router = express.Router();

// PUBLIC: fetch a form by its QR/share token — no auth (must come before "/:id" routes)
router.get("/public/:token", getPublicForm);

// HR create form
router.post("/", authMiddleware, createForm);

// Company employees get forms
router.get("/", authMiddleware, getForms);

// ONLY HR update form
router.put("/:id", authMiddleware, updateForm);

// ONLY HR enable/disable QR public sharing for a form
router.put("/:id/share", authMiddleware, toggleFormShare);

// ONLY HR delete form
router.delete("/:id", authMiddleware, deleteForm);


export default router;