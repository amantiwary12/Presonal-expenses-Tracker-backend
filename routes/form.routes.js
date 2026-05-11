//form route 
import express from "express";

import authMiddleware from "../middleware/auth.middleware.js";

import {
  createForm,
  getForms,
   updateForm,
  deleteForm,
} from "../controllers/form.controller.js";

const router = express.Router();

// HR create form
router.post("/", authMiddleware, createForm);

// Company employees get forms
router.get("/", authMiddleware, getForms);

// ONLY HR update form
router.put("/:id", authMiddleware, updateForm);

// ONLY HR delete form
router.delete("/:id", authMiddleware, deleteForm);


export default router;