import express from "express";
import { createUser } from "../controllers/user.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/authorize.middleware.js";

const router = express.Router();

/*
   CREATE USER
   POST /api/users
   Only Admin can create users
*/

router.post(
  "/",
  authMiddleware,
  authorizeRoles("Admin"),
  createUser
);

export default router;