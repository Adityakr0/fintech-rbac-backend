const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
    fromAccount: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "account",
        required: false, // Optional for system-to-user deposits
        index: true
    },
    toAccount: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "account",
        required: [true, "Recipient account is required"],
        index: true
    },
    amount: {
        type: Number,
        required: [true, "Transaction amount is required"],
        min: [0, "Amount cannot be negative"]
    },
    category: {
        type: String,
        required: [true, "Category is required (e.g., Salary, Rent, Food)"],
        index: true
    },
    description: {
        type: String,
        trim: true
    },
    status: {
        type: String,
        enum: ["PENDING", "COMPLETED", "FAILED", "REVERSED"],
        default: "PENDING"
    },
    idempotencyKey: {
        type: String,
        required: true,
        unique: true,
        index: true
    }
}, { timestamps: true });

module.exports = mongoose.model("transaction", transactionSchema);