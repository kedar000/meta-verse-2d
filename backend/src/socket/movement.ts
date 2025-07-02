// websocketServer.ts
import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from "uuid";
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
        const spaceId = url.searchParams.get('space');

        if (!token) return ws.close();
        // if(spaceId) return ws.close();

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

            if (typeof spaceId === "undefined" || spaceId === null) {
                 return ws.close();
            }
            await prisma.spaceMember.create({
                data : {
                    id : uuidv4(),
                    spaceId : spaceId ,
                    userId : userId,
                }
            })

            ws.on('message', async (raw) => {
            const msg = JSON.parse(raw.toString());
            console.log("RECIEVED MESSAGE - ", msg)
            if (msg.type === 'MOVE') {
                const { x, y } = msg;

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
                        spaceId,
                        lastUpdatedAt: now,
                        lastMovedAt: now
                    },
                    create: {
                        userId,
                        x,
                        y,
                        spaceId,
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

            ws.on('close', async () => {
                console.log("<- Web Socket Disconnected ->")
                try {
                    await prisma.spaceMember.delete({
                        where: {
                            userId_spaceId: {
                                userId: userId,
                                spaceId: spaceId
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
