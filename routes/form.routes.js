//form routes 
import express from "express";
import authMiddleware from "../middleware/auth.middleware.js";

import { createForm, getForms } from "../controllers/form.controller.js";

const router = express.Router();

router.post("/", authMiddleware, createForm);
router.get("/", authMiddleware, getForms);

export default router;

