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
const client_1 = require("@prisma/client");
const express_1 = require("express");
const authMiddlware_1 = __importDefault(require("../../middleware/authMiddlware"));
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
router.get('/get-user', authMiddlware_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const currentUserId = req.user.id;
        const user = yield prisma.user.findUnique({
            where: {
                id: currentUserId
            }
        });
        console.log("User data : ", user);
        return res.status(200).json({ mssg: "User succesfully retrived ", user });
    }
    catch (error) {
        console.error("Error fetching users:", error);
        return res.status(500).json({ error: "Failed to fetch nearby users" });
    }
}));
exports.default = router;
