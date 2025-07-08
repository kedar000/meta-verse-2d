// websocketServer.ts
import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from "uuid";
import { PrismaClient } from '@prisma/client';
import isValidMove from '../controllers/grid/grid1';

const prisma = new PrismaClient();

export default function startWebSocket() {
  const wss = new WebSocketServer({ port: 8080, path: '/ws' });
  const connectedUsers = new Map<string, WebSocket>(); // userId -> socket

  wss.on('connection', async (ws, req) => {
    console.log("<- Web Socket Connected successfully ->");

    const url = new URL(req.url!, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');
    const spaceId = url.searchParams.get('space');

    if (!token) return ws.close();

    try {
      const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
      const userId = decoded.id;
      (ws as any).userId = userId;
      connectedUsers.set(userId, ws);

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { displayName: true }
      });

      const displayName = user?.displayName || "Unknown";
      (ws as any).displayName = displayName;

      const initialX = 25;
      const initialY = 25;
      const now = new Date();

      await prisma.userPosition.upsert({
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

      if (!spaceId) return ws.close();

      await prisma.spaceMember.create({
        data: {
          id: uuidv4(),
          spaceId: spaceId,
          userId: userId,
        }
      });

      console.log(`User ${userId} (${displayName}) added to space ${spaceId}`);

      // 🧠 Handle incoming messages
      ws.on('message', async (raw) => {
        const msg = JSON.parse(raw.toString());
        console.log("RECEIVED MESSAGE - ", msg);

        switch (msg.type) {
          case 'MOVE': {
            const { x, y } = msg;
            const validMove = isValidMove(x, y);

            if (validMove) {
              const now = new Date();

              await prisma.userPosition.upsert({
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
            } else {
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
            } else {
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
            } else {
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
            } else {
              console.warn(`[WebRTC] Target user ${targetId} not connected (candidate)`);
            }
            break;
          }

          default:
            console.warn("Unknown message type:", msg.type);
        }
      });

      ws.on('close', async () => {
        console.log("<- Web Socket Disconnected ->");
        try {
          await prisma.spaceMember.delete({
            where: {
              userId_spaceId: {
                userId,
                spaceId
              }
            }
          });
          console.log(`User ${userId} removed from space ${spaceId}`);
        } catch (error) {
          console.error('Failed to remove user from spaceMember:', error);
        }

        connectedUsers.delete(userId);
      });

    } catch (err) {
      console.error('JWT error:', err);
      ws.close();
    }
  });
}