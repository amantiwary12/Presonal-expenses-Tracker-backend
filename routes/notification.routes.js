//notification route
import express from "express";
import allowRoles from "../middleware/allowRoles.js";

import authMiddleware from "../middleware/auth.middleware.js";

import {
  getNotifications,
  markNotificationAsRead,
  deleteNotification,
} from "../controllers/notification.controller.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/", getNotifications);

router.patch(
  "/:id/read",
  markNotificationAsRead
);

router.delete(
  "/:id",
  deleteNotification
);

router.delete(
  "/:id",
  allowRoles("Admin", "FinanceManager"),
  deleteNotification
);


export default router;