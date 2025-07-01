// websocketServer.ts
import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import isValidMove from '../controllers/grid/grid1';

const prisma = new PrismaClient();

export default function startWebSocket (){

    const wss = new WebSocketServer({ port: 8080, path: '/ws' });
    const connectedUsers = new Map<string, WebSocket>(); // userId -> socket

    wss.on('connection', async (ws, req) => {
        console.log("<- Web Socket Connected successfully ->")
        const url = new URL(req.url!, `http://${req.headers.host}`);
        const token = url.searchParams.get('token');

        if (!token) return ws.close();

        try {
            const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
            const userId = decoded.id;
            (ws as any).userId = userId;
            connectedUsers.set(userId, ws);
            const initialX = 10;
            const initialY = 10;
            const now = new Date();

            await prisma.userPosition.upsert({
            where: { userId },
            update: {}, // don't overwrite if already exists
            create: {
                userId,
                x: initialX,
                y: initialY,
                lastUpdatedAt: now,
                lastMovedAt: now
            }
            })
            console.log("Initial position is added to the database - x : 10 , y : 10")

            ws.on('message', async (raw) => {
            const msg = JSON.parse(raw.toString());
            console.log("RECIEVED MESSAGE - ", msg)
            if (msg.type === 'MOVE') {
                const { x, y, spaceId } = msg;

                // validate bounds here if needed
                const validMove : Boolean = isValidMove(x , y);

                if(validMove){
                    // update in DB
                    const now = new Date(); 
                    await prisma.userPosition.upsert({
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
                    console.log("Recieved Message is send to all User")
                }
                else{
                    console.error("Invalid Move")
                }
            }
            });

            ws.on('close', () => {
                console.log("<- Web Socket Disconnected ->")
                connectedUsers.delete(userId);
            });
        } catch (err) {
            console.error('JWT error:', err);
            ws.close();
        }
    });

}
