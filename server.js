require("dotenv").config();
const app = require("./src/app");

const coonectToDB = require("./src/config/db");
coonectToDB();

app.listen(3000, () => {
  console.log("Server is running on port 3000");
})