const { Router } = require("express");
const authMiddleware = require("../middleware/auth.middleware");
const { authorizeRoles } = require("../middleware/role.middleware");
const dashboardController = require("../controllers/dashboard.controller");

const router = Router();

/**
 * 🔹 Summary (ANALYST + ADMIN)
 */
router.get(
  "/summary",
  authMiddleware.authMiddleware,
  authorizeRoles("ANALYST", "ADMIN"),
  dashboardController.getSummary
);

/**
 * 🔹 Recent Transactions (ANALYST + ADMIN)
 */
router.get(
  "/recent",
  authMiddleware.authMiddleware,
  authorizeRoles("ANALYST", "ADMIN"),
  dashboardController.getRecentTransactions
);

module.exports = router;