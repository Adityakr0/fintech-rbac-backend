const express = require("express")
const cookieParser = require("cookie-parser")

const app = express()

app.use(express.json())
app.use(cookieParser())

/**
 * - Routes required
 */
const authRouter = require("./routes/auth.routes")
const accountRouter = require("./routes/account.routes")
const transactionRoutes = require("./routes/transaction.routes")
const dashboardRoutes = require("./routes/dashboard.routes")

/**
 * - Base Route
 */
app.get("/", (req, res) => {
    res.send("Ledger Service is up and running")
})

/**
 * - Use Routes
 */
app.use("/api/auth", authRouter)
app.use("/api/accounts", accountRouter)
app.use("/api/transactions", transactionRoutes)
app.use("/api/dashboard", dashboardRoutes)

module.exports = app