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
const uuid_1 = require("uuid");
const client_1 = require("@prisma/client");
const grid1_1 = __importDefault(require("../controllers/grid/grid1"));
const prisma = new client_1.PrismaClient();
function startWebSocket() {
    const wss = new ws_1.WebSocketServer({ port: 8080, path: '/ws' });
    const connectedUsers = new Map(); // userId -> socket
    wss.on('connection', (ws, req) => __awaiter(this, void 0, void 0, function* () {
        console.log("<- Web Socket Connected successfully ->");
        const url = new URL(req.url, `http://${req.headers.host}`);
        const token = url.searchParams.get('token');
        const spaceId = url.searchParams.get('space');
        if (!token)
            return ws.close();
        try {
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
            const userId = decoded.id;
            ws.userId = userId;
            connectedUsers.set(userId, ws);
            const user = yield prisma.user.findUnique({
                where: { id: userId },
                select: { displayName: true }
            });
            const displayName = (user === null || user === void 0 ? void 0 : user.displayName) || "Unknown";
            ws.displayName = displayName;
            const initialX = 25;
            const initialY = 25;
            const now = new Date();
            yield prisma.userPosition.upsert({
                where: { userId },
                update: {},
                create: {
                    userId,
                    x: initialX,
                    y: initialY,
                    lastUpdatedAt: now,
                    lastMovedAt: now
                }
            });
            if (!spaceId)
                return ws.close();
            yield prisma.spaceMember.create({
                data: {
                    id: (0, uuid_1.v4)(),
                    spaceId: spaceId,
                    userId: userId,
                }
            });
            console.log(`User ${userId} (${displayName}) added to space ${spaceId}`);
            // 🧠 Handle incoming messages
            ws.on('message', (raw) => __awaiter(this, void 0, void 0, function* () {
                const msg = JSON.parse(raw.toString());
                console.log("RECEIVED MESSAGE - ", msg);
                switch (msg.type) {
                    case 'MOVE': {
                        const { x, y } = msg;
                        const validMove = (0, grid1_1.default)(x, y);
                        if (validMove) {
                            const now = new Date();
                            yield prisma.userPosition.upsert({
                                where: { userId },
                                update: { x, y, spaceId, lastUpdatedAt: now, lastMovedAt: now },
                                create: { userId, x, y, spaceId, lastUpdatedAt: now, lastMovedAt: now }
                            });
                            connectedUsers.forEach((clientWs, id) => {
                                if (id !== userId) {
                                    clientWs.send(JSON.stringify({
                                        type: 'POSITION_UPDATE',
                                        userId,
                                        displayName,
                                        x,
                                        y,
                                        spaceId,
                                    }));
                                }
                            });
                            console.log(`MOVE: ${userId} (${displayName}) -> x:${x}, y:${y}`);
                        }
                        else {
                            console.error("Invalid Move");
                        }
                        break;
                    }
                    // 📡 WebRTC Signaling - Offer
                    case 'offer': {
                        const { targetId, offer } = msg;
                        const targetSocket = connectedUsers.get(targetId);
                        console.log(`[WebRTC] Offer from ${userId} → ${targetId}`);
                        if (targetSocket) {
                            targetSocket.send(JSON.stringify({
                                type: 'offer',
                                from: userId,
                                offer,
                            }));
                        }
                        else {
                            console.warn(`[WebRTC] Target user ${targetId} not connected (offer)`);
                        }
                        break;
                    }
                    // 📡 WebRTC Signaling - Answer
                    case 'answer': {
                        const { targetId, answer } = msg;
                        const targetSocket = connectedUsers.get(targetId);
                        console.log(`[WebRTC] Answer from ${userId} → ${targetId}`);
                        if (targetSocket) {
                            targetSocket.send(JSON.stringify({
                                type: 'answer',
                                from: userId,
                                answer,
                            }));
                        }
                        else {
                            console.warn(`[WebRTC] Target user ${targetId} not connected (answer)`);
                        }
                        break;
                    }
                    // 📡 WebRTC Signaling - ICE Candidate
                    case 'candidate': {
                        const { targetId, candidate } = msg;
                        const targetSocket = connectedUsers.get(targetId);
                        console.log(`[WebRTC] Candidate from ${userId} → ${targetId}`);
                        if (targetSocket) {
                            targetSocket.send(JSON.stringify({
                                type: 'candidate',
                                from: userId,
                                candidate,
                            }));
                        }
                        else {
                            console.warn(`[WebRTC] Target user ${targetId} not connected (candidate)`);
                        }
                        break;
                    }
                    default:
                        console.warn("Unknown message type:", msg.type);
                }
            }));
            ws.on('close', () => __awaiter(this, void 0, void 0, function* () {
                console.log("<- Web Socket Disconnected ->");
                try {
                    yield prisma.spaceMember.delete({
                        where: {
                            userId_spaceId: {
                                userId,
                                spaceId
                            }
                        }
                    });
                    console.log(`User ${userId} removed from space ${spaceId}`);
                }
                catch (error) {
                    console.error('Failed to remove user from spaceMember:', error);
                }
                connectedUsers.delete(userId);
            }));
        }
        catch (err) {
            console.error('JWT error:', err);
            ws.close();
        }
    }));
}
