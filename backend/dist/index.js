"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// console.log("hello form index.js ")
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const movement_1 = __importDefault(require("./socket/movement"));
const prisma_1 = require("./db/prisma");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
const signup = require("./routes/user/sign-up").default;
const signin = require("./routes/user/sign-in").default;
const userInfo = require("./routes/user/userInfo").default;
const regionUser = require('./routes/adjacentUser/getUser').default;
const createSpace = require('./routes/space/createSpace').default;
const getSpace = require('./routes/space/getSpaces').default;
const getSpaceMembers = require('./routes/space/getSpaceMem').default;
app.use("/api/v1/sign-up", signup);
app.use("/api/v1/sign-in", signin);
app.use("/api/v1/user", userInfo);
app.use("/api/v1/region", regionUser);
app.use("/api/v1/region", regionUser);
app.use("/api/v1", createSpace);
app.use("/api/v1", getSpace);
app.use("/api/v1", getSpaceMembers);
(0, movement_1.default)();
function startServer() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield (0, prisma_1.connectDB)();
            app.listen(PORT, () => {
                console.log(`Server is running on http://localhost:${PORT}`);
            });
        }
        catch (error) {
            console.error("Error starting the server: ", error);
            process.exit(1);
        }
    });
}
process.on("SIGINT", () => __awaiter(void 0, void 0, void 0, function* () {
    yield (0, prisma_1.disconnectDB)();
    process.exit(0);
}));
startServer();
