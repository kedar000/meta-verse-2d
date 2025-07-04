// console.log("hello form index.js ")
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import startWebSocket from "./socket/movement";
import { connectDB, disconnectDB } from "./db/prisma";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors())
app.use(express.json());


const signup = require("./routes/user/sign-up").default;
const signin = require("./routes/user/sign-in").default;
const regionUser = require('./routes/adjacentUser/getUser').default;
const createSpace = require('./routes/space/createSpace').default;
const getSpace= require('./routes/space/getSpaces').default;
const getSpaceMembers= require('./routes/space/getSpaceMem').default;

app.use("/api/v1/sign-up" , signup)
app.use("/api/v1/sign-in" , signin)
app.use("/api/v1/region" , regionUser);
app.use("/api/v1" , createSpace);
app.use("/api/v1" , getSpace);
app.use("/api/v1" , getSpaceMembers);

startWebSocket()

async function startServer(){
    try {
        await connectDB();
        app.listen(PORT,()=>{
            console.log(`Server is running on http://localhost:${PORT}`);
        })
    } catch (error) {
        console.error("Error starting the server: ", error);
        process.exit(1);
    }
}

process.on("SIGINT",async ()=>{
    await disconnectDB();
    process.exit(0);
})
startServer();

