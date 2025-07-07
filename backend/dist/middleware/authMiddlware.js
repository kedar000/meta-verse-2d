"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || '';
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    console.log("<- Reached AuthMiddlware ->");
    if (!authHeader) {
        res.status(401).json({ error: "Authorization header is missing" });
        return;
    }
    if (!authHeader.startsWith("Bearer ")) {
        res.status(401).json({ error: "Invalid Authorization scheme. Must use Bearer token" });
        return;
    }
    const token = authHeader.split(" ")[1].trim();
    if (!token) {
        res.status(401).json({ error: "Token is missing" });
        return;
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    }
    catch (err) {
        res.status(401).json({ error: "Invalid or expired token" });
        return;
    }
};
exports.default = authMiddleware;
