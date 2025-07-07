"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const createToken = (userId) => {
    const jwtSecret = process.env.JWT_SECRET;
    console.log("Reached function createToken , ", jwtSecret);
    if (jwtSecret == null || jwtSecret == undefined) {
        return console.error("Check the jwt secret ", jwtSecret);
    }
    return jsonwebtoken_1.default.sign({ id: userId }, jwtSecret, {
    // expiresIn : process.env.JWT_EXPIRES_IN,
    });
};
exports.default = createToken;
