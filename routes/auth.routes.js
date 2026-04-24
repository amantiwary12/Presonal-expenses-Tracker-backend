//auth route
import express from "express";

import {
  registerUser,
  loginUser,
  getMe,
} from "../controllers/auth.controller.js";

import validate from "../middleware/validate.middleware.js";

import authMiddleware from "../middleware/auth.middleware.js";

import { registerSchema, loginSchema } from "../validation/auth.validation.js";

const router = express.Router();

/*
   REGISTER USER
   POST /api/auth/register
*/
router.post("/register", validate(registerSchema), registerUser);

/*
   LOGIN USER
   POST /api/auth/login
*/
router.post("/login", validate(loginSchema), loginUser);

/*
   GET CURRENT USER
   GET /api/auth/me
*/
router.get("/me", authMiddleware, getMe);

export default router;
