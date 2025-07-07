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
const authMiddlware_1 = __importDefault(require("../../middleware/authMiddlware"));
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
router.get('/get-space-members', authMiddlware_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { space } = req.query;
    if (!req.user || !req.user.id) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    if (typeof space !== "string") {
        return res.status(400).json({ error: "Invalid or missing space ID" });
    }
    try {
        const allMembers = yield prisma.spaceMember.findMany({
            where: {
                spaceId: space
            }
        });
        if (allMembers.length == 0)
            return res.status(200).json({ mssg: "The space is Empty" });
        console.log(`All the memeber in space - ${space}  are `, allMembers);
        return res.status(200).json({ mssg: "Successfully got all members ", allMembers });
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ mssg: "Error while getting the space-members", error });
    }
}));
exports.default = router;
