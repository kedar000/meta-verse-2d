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
const express_1 = require("express");
const client_1 = require("@prisma/client");
const uuid_1 = require("uuid");
const jwt_1 = __importDefault(require("../../utils/jwt"));
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
router.post("/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(401).json({ message: "Email or password is missing " });
    }
    const existing = yield prisma.user.findUnique({
        where: {
            email: email
        }
    });
    if (existing)
        return res.status(400).json({ msg: "User already exists" });
    try {
        const newUser = yield prisma.user.create({
            data: {
                id: (0, uuid_1.v4)(),
                email,
                password
            }
        });
        const token = (0, jwt_1.default)(newUser.id);
        console.log("New User Created : ", newUser);
        console.log("New User Token  : ", token);
        return res.status(200).json({ Message: "User created successfully ", newUser, token: token });
    }
    catch (error) {
        return res.status(500).json({ Message: "Error while creating the User", error });
    }
}));
exports.default = router;
