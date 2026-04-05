const express = require("express")
const authMiddleware = require("../middleware/auth.middleware")
const { authorizeRoles } = require("../middleware/role.middleware")
const accountController = require("../controllers/account.controller")

const router = express.Router()

/**
 * - POST /api/accounts/
 * - Create a new account
 * - Only ADMIN allowed
 */
router.post(
  "/",
  authMiddleware.authMiddleware,
  authorizeRoles("ADMIN"),
  accountController.createAccountController
)

/**
 * - GET /api/accounts/
 * - Get all accounts of logged-in user
 * - VIEWER + ANALYST + ADMIN allowed
 */
router.get(
  "/",
  authMiddleware.authMiddleware,
  authorizeRoles("VIEWER", "ANALYST", "ADMIN"),
  accountController.getUserAccountsController
)

/**
 * - GET /api/accounts/balance/:accountId
 * - VIEWER + ANALYST + ADMIN allowed
 */
router.get(
  "/balance/:accountId",
  authMiddleware.authMiddleware,
  authorizeRoles("VIEWER", "ANALYST", "ADMIN"),
  accountController.getAccountBalanceController
)

module.exports = router