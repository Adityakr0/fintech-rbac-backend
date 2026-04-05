const mongoose = require("mongoose");
const ledgerModel = require("./ledger.model");

const accountSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: [true, "Account must be associated with a user"],
        index: true
    },
    status: {
        type: String,
        enum: {
            values: ["ACTIVE", "FROZEN", "CLOSED"],
            message: "Status can be either ACTIVE, FROZEN or CLOSED",
        },
        default: "ACTIVE"
    },
    currency: {
        type: String,
        required: [true, "Currency is required for creating an account"],
        default: "INR"
    }
}, {
    timestamps: true
});

accountSchema.index({ user: 1, status: 1 });

/**
 * 📊 Optimized Balance Calculation
 * Sums all CREDITs and subtracts all DEBITs for this specific account.
 */
accountSchema.methods.getBalance = async function () {
    try {
        const balanceData = await ledgerModel.aggregate([
            {
                // Mongoose automatically casts this._id to the correct ObjectId type
                $match: { account: this._id } 
            },
            {
                $group: {
                    _id: null,
                    totalDebit: {
                        $sum: {
                            $cond: [{ $eq: ["$type", "DEBIT"] }, "$amount", 0]
                        }
                    },
                    totalCredit: {
                        $sum: {
                            $cond: [{ $eq: ["$type", "CREDIT"] }, "$amount", 0]
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    balance: { $subtract: ["$totalCredit", "$totalDebit"] }
                }
            }
        ]);

        // Return 0 if no ledger entries exist, otherwise return the calculated balance
        return balanceData.length > 0 ? balanceData[0].balance : 0;

    } catch (error) {
        console.error("Error calculating balance:", error);
        return 0;
    }
};

const accountModel = mongoose.model("account", accountSchema);
module.exports = accountModel;