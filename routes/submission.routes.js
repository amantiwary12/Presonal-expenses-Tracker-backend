//submissiob route 
import express from "express";
import authMiddleware from "../middleware/auth.middleware.js";

import {
  submitForm,
  approveForm,
} from "../controllers/submission.controller.js";

const router = express.Router();

router.post("/", authMiddleware, submitForm);
router.put("/:id/approve", authMiddleware, approveForm);

export default router;