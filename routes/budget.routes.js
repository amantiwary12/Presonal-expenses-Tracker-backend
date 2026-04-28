// //budget route
// import express from "express";
// import authMiddleware from "../middleware/auth.middleware.js";
// import allowRoles from "../middleware/allowRoles.js";

// import {
//   deleteBudget,
//   editSpentAmount,
//   getBudgetStatus,
//   getBudgetsWithSpent,
//   removeSpentAmount,
//   setCategoryBudget,
//   updateSpentAmount,
// } from "../controllers/budget.controller.js";

// const router = express.Router();

// /* CREATE BUDGET */
// router.post(
//   "/",
//   authMiddleware,
//   allowRoles("Admin", "FinanceManager"),
//   setCategoryBudget,
// );

// /* GET BUDGETS */
// router.get(
//   "/",
//   authMiddleware,
//   allowRoles("Admin", "FinanceManager", "Manager"),
//   getBudgetsWithSpent,
// );

// /* UPDATE SPENT */
// router.patch(
//   "/:id/spent",
//   authMiddleware,
//   allowRoles("Admin", "FinanceManager"),
//   updateSpentAmount,
// );

// /* EDIT SPENT */
// router.patch(
//   "/:id/spent/edit",
//   authMiddleware,
//   allowRoles("Admin", "FinanceManager"),
//   editSpentAmount,
// );

// /* REMOVE SPENT */
// router.patch(
//   "/:id/spent/remove",
//   authMiddleware,
//   allowRoles("Admin", "FinanceManager"),
//   removeSpentAmount,
// );

// /* STATUS */
// router.get(
//   "/status",
//   authMiddleware,
//   allowRoles("Admin", "FinanceManager", "Manager"),
//   getBudgetStatus,
// );

// /* DELETE */
// router.delete("/:id", authMiddleware, allowRoles("Admin"), deleteBudget);

// export default router;




import express from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import allowRoles from "../middleware/allowRoles.js";

import {
  deleteBudget,
  editSpentAmount,
  getBudgetStatus,
  getBudgetsWithSpent,
  removeSpentAmount,
  setCategoryBudget,
  updateSpentAmount,
} from "../controllers/budget.controller.js";

const router = express.Router();

/* CREATE BUDGET - Only Admin/FinanceManager */
router.post(
  "/",
  authMiddleware,
  allowRoles("Admin", "FinanceManager"),
  setCategoryBudget,
);

/* GET BUDGETS - ✅ ADD Employee to allowed roles */
router.get(
  "/",
  authMiddleware,
  allowRoles("Admin", "FinanceManager", "Manager", "Employee"),  // ← Added Employee
  getBudgetsWithSpent,
);

/* UPDATE SPENT */
router.patch(
  "/:id/spent",
  authMiddleware,
  allowRoles("Admin", "FinanceManager"),
  updateSpentAmount,
);

/* EDIT SPENT */
router.patch(
  "/:id/spent/edit",
  authMiddleware,
  allowRoles("Admin", "FinanceManager"),
  editSpentAmount,
);

/* REMOVE SPENT */
router.patch(
  "/:id/spent/remove",
  authMiddleware,
  allowRoles("Admin", "FinanceManager"),
  removeSpentAmount,
);

/* STATUS - ✅ ADD Employee to allowed roles */
router.get(
  "/status",
  authMiddleware,
  allowRoles("Admin", "FinanceManager", "Manager", "Employee"),  // ← Added Employee
  getBudgetStatus,
);

/* DELETE */
router.delete("/:id", authMiddleware, allowRoles("Admin"), deleteBudget);

export default router;