const { Router } = require('express');
const authMiddleware = require('../middleware/auth.middleware');
const { authorizeRoles } = require('../middleware/role.middleware');
const transactionController = require("../controllers/transaction.controller");

const router = Router();

// 1. Personal History: Open to all authenticated users (Viewer, Analyst, Admin)
router.get("/my-history", authMiddleware.authMiddleware, transactionController.getMyTransactionHistory);

// 2. Create Transaction: Admin only (or adjust as per business logic)
router.post("/", authMiddleware.authMiddleware, authorizeRoles("ADMIN"), transactionController.createTransaction);

// 3. System Funding: Restricted to Admin
router.post("/system/initial-funds", authMiddleware.authMiddleware, authorizeRoles("ADMIN"), transactionController.createInitialFundsTransaction);

// 4. Delete/Reverse Record: Admin only (Strict Access Control)
router.delete("/:id", authMiddleware.authMiddleware, authorizeRoles("ADMIN"), transactionController.deleteTransaction);

module.exports = router;