const ledgerModel = require("../models/ledger.model");
const accountModel = require("../models/account.model");

/**
 * 🔹 GET /api/dashboard/summary
 */
async function getSummary(req, res) {
  try {
    const userId = req.user._id;

    const userAccounts = await accountModel.find({ user: userId }).select("_id");
    const accountIds = userAccounts.map(acc => acc._id);

    const result = await ledgerModel.aggregate([
      {
        $match: {
          account: { $in: accountIds }
        }
      },
      {
        $group: {
          _id: "$type",
          total: { $sum: "$amount" }
        }
      }
    ]);

    let totalIncome = 0;
    let totalExpense = 0;

    result.forEach(item => {
      if (item._id === "CREDIT") totalIncome = item.total;
      if (item._id === "DEBIT") totalExpense = item.total;
    });

    return res.json({
      totalIncome,
      totalExpense,
      netBalance: totalIncome - totalExpense
    });

  } catch (err) {
    return res.status(500).json({
      message: "Failed to fetch dashboard summary"
    });
  }
}

/**
 * 🔹 GET /api/dashboard/recent
 */
async function getRecentTransactions(req, res) {
  try {
    const userId = req.user._id;

    const userAccounts = await accountModel.find({ user: userId }).select("_id");
    const accountIds = userAccounts.map(acc => acc._id);

    const recentTransactions = await ledgerModel
      .find({ account: { $in: accountIds } })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("account", "name")
      .populate("transaction");

    return res.json({
      recentTransactions
    });

  } catch (err) {
    return res.status(500).json({
      message: "Failed to fetch recent transactions"
    });
  }
}

module.exports = {
  getSummary,
  getRecentTransactions
};