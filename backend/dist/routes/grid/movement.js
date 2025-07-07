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
exports.default = startWebSocket;
// websocketServer.ts
const ws_1 = require("ws");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
function startWebSocket() {
    const wss = new ws_1.WebSocketServer({ port: 8080, path: '/ws' });
    const connectedUsers = new Map(); // userId -> socket
    wss.on('connection', (ws, req) => __awaiter(this, void 0, void 0, function* () {
        console.log("<- Web Socket Connected successfully ->");
        const url = new URL(req.url, `http://${req.headers.host}`);
        const token = url.searchParams.get('token');
        if (!token)
            return ws.close();
        try {
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
            const userId = decoded.id;
            ws.userId = userId;
            connectedUsers.set(userId, ws);
            ws.on('message', (raw) => __awaiter(this, void 0, void 0, function* () {
                const msg = JSON.parse(raw.toString());
                console.log("RECIEVED MESSAGE - ", msg);
                if (msg.type === 'MOVE') {
                    const { x, y, spaceId } = msg;
                    // validate bounds here if needed
                    // update in DB
                    const now = new Date();
                    yield prisma.userPosition.upsert({
                        where: { userId },
                        update: {
                            x,
                            y,
                            // spaceId,
                            lastUpdatedAt: now,
                            lastMovedAt: now
                        },
                        create: {
                            userId,
                            x,
                            y,
                            // spaceId,
                            lastUpdatedAt: now,
                            lastMovedAt: now
                        },
                    });
                    // broadcast to others (very naive for now)
                    connectedUsers.forEach((clientWs, id) => {
                        if (id !== userId) {
                            clientWs.send(JSON.stringify({
                                type: 'POSITION_UPDATE',
                                userId,
                                x,
                                y,
                                spaceId,
                            }));
                        }
                    });
                }
            }));
            ws.on('close', () => {
                connectedUsers.delete(userId);
            });
        }
        catch (err) {
            console.error('JWT error:', err);
            ws.close();
        }
    }));
}
