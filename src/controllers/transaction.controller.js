const transactionModel = require("../models/transaction.model");
const ledgerModel = require("../models/ledger.model");
const accountModel = require("../models/account.model");
const emailService = require("../services/email.service");
const mongoose = require("mongoose");

// POST /api/transactions
async function createTransaction(req, res) {
    const { fromAccount, toAccount, amount, category, description, idempotencyKey } = req.body;
    const transferAmount = parseFloat(amount);

    // Requirement #1: User Status Check
    if (req.user.status !== "ACTIVE") {
        return res.status(403).json({ message: "Account inactive. Access denied." });
    }

    const fromAcc = await accountModel.findById(fromAccount);
    const toAcc = await accountModel.findById(toAccount);

    if (!fromAcc || !toAcc) return res.status(400).json({ message: "Account not found" });

    // Requirement #2: Balance Validation
    const balance = await fromAcc.getBalance();
    if (balance < transferAmount) {
        return res.status(400).json({ message: `Insufficient funds. Balance: ${balance}` });
    }

    const session = await mongoose.startSession();
    try {
        session.startTransaction();

        const [transaction] = await transactionModel.create([{
            fromAccount, toAccount, amount: transferAmount, category, description, idempotencyKey, status: "PENDING"
        }], { session, ordered: true });

        // Double-entry record
        await ledgerModel.create([
            { account: fromAccount, amount: transferAmount, transaction: transaction._id, type: "DEBIT" },
            { account: toAccount, amount: transferAmount, transaction: transaction._id, type: "CREDIT" }
        ], { session, ordered: true });

        await transactionModel.findByIdAndUpdate(transaction._id, { status: "COMPLETED" }, { session });

        await session.commitTransaction();

        // Background email task
        emailService.sendTransactionEmail(req.user.email, req.user.name, transferAmount, "Transfer")
            .catch(err => console.error("Mail worker error:", err));

        return res.status(201).json({ message: "Transaction successful", transaction });
    } catch (err) {
        await session.abortTransaction();
        return res.status(500).json({ message: "Transaction failed", error: err.message });
    } finally {
        session.endSession();
    }
}

// GET /api/transactions/my-history (Requirement #2: Filtering)
async function getMyTransactionHistory(req, res) {
    try {
        const { type, category, startDate, endDate } = req.query;
        const userAccounts = await accountModel.find({ user: req.user._id }).select("_id");
        const accountIds = userAccounts.map(acc => acc._id);

        let query = { account: { $in: accountIds } };

        if (type) query.type = type.toUpperCase();
        if (category) query.category = category;

        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }

        const history = await ledgerModel.find(query)
            .sort({ createdAt: -1 })
            .populate("transaction")
            .populate("account", "currency");

        return res.json({ count: history.length, history });
    } catch (err) {
        return res.status(500).json({ message: "Fetch failed" });
    }
}

// DELETE /api/transactions/:id (Requirement #2 & #4: Admin CRUD/Access)
async function deleteTransaction(req, res) {
    try {
        const { id } = req.params;
        // Financial logic: We use a status reversal instead of a hard delete
        const tx = await transactionModel.findByIdAndUpdate(id, { status: "REVERSED" }, { new: true });
        if (!tx) return res.status(404).json({ message: "Record not found" });
        return res.json({ message: "Record reversed/deleted successfully", tx });
    } catch (err) {
        return res.status(500).json({ message: "Delete failed" });
    }
}

// POST /api/transactions/system/initial-funds
async function createInitialFundsTransaction(req, res) {
    const { toAccount, amount, category, description, idempotencyKey } = req.body;
    const session = await mongoose.startSession();
    try {
        session.startTransaction();
        const [transaction] = await transactionModel.create([{
            toAccount, amount, category, description, idempotencyKey, status: "PENDING"
        }], { session, ordered: true });

        await ledgerModel.create([{ account: toAccount, amount, transaction: transaction._id, type: "CREDIT" }], { session, ordered: true });
        await transactionModel.findByIdAndUpdate(transaction._id, { status: "COMPLETED" }, { session });

        await session.commitTransaction();
        return res.status(201).json({ message: "Initial funds added", transaction });
    } catch (err) {
        await session.abortTransaction();
        return res.status(500).json({ message: "Funding failed" });
    } finally {
        session.endSession();
    }
}

module.exports = { createTransaction, createInitialFundsTransaction, getMyTransactionHistory, deleteTransaction };