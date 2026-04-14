import express from "express";

import { registerUser, loginUser } from "../controllers/auth.controller.js";

import validate from "../middleware/validate.middleware.js";

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

export default router;
