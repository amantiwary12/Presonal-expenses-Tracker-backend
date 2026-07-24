import express from "express";

import authMiddleware from "../middleware/auth.middleware.js";
import allowRoles from "../middleware/allowRoles.js";

import {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus,
  resetPassword,
} from "../controllers/user.controller.js";

const router = express.Router();

/*
   USER MANAGEMENT ROUTES
*/

router.get("/", authMiddleware, allowRoles("Admin", "SuperAdmin", "HR" ), getAllUsers);

router.post("/", authMiddleware, allowRoles("Admin", "SuperAdmin", "HR"), createUser);

router.put(
  "/:id",
  authMiddleware,
  allowRoles("Admin", "SuperAdmin", "HR"),
  updateUser,
);

router.delete(
  "/:id",
  authMiddleware,
  allowRoles("Admin", "SuperAdmin", "HR"),
  deleteUser,
);

router.patch(
  "/:id/status",
  authMiddleware,
  allowRoles("Admin", "SuperAdmin", "HR"),
  toggleUserStatus,
);

router.patch(
  "/:id/reset-password",
  authMiddleware,
  allowRoles("Admin", "SuperAdmin", "HR"),
  resetPassword,
);

export default router;
