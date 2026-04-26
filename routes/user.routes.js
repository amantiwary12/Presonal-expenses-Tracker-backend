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

router.get(
  "/",
  authMiddleware,
  allowRoles("Admin", "SuperAdmin"),
  getAllUsers
);

router.post(
  "/",
  authMiddleware,
  allowRoles("Admin", "SuperAdmin"),
  createUser
);

router.put(
  "/:id",
  authMiddleware,
  allowRoles("Admin", "SuperAdmin"),
  updateUser
);

router.delete(
  "/:id",
  authMiddleware,
  allowRoles("Admin", "SuperAdmin"),
  deleteUser
);

router.patch(
  "/:id/status",
  authMiddleware,
  allowRoles("Admin", "SuperAdmin"),
  toggleUserStatus
);

router.patch(
  "/:id/reset-password",
  authMiddleware,
  allowRoles("Admin", "SuperAdmin"),
  resetPassword
);

export default router;