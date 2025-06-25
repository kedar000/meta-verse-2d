// console.log("hello form index.js ")
import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const signup = require("./routes/user/sign-up").default;

app.use(express.json());
app.use("/api/v1" , signup)

app.listen(port, () => {
  console.log(` Server is running at http://localhost:${port}`);
});


