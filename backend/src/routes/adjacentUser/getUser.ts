import { PrismaClient } from "@prisma/client";
import { Router , Request , Response} from "express";
import { verify } from "jsonwebtoken";
import authMiddleware from "../../middleware/authMiddlware";
import isValidMove from "../../controllers/grid/grid1";
import { actualRegion } from "../../controllers/region/region";

const router =  Router();
const prisma = new PrismaClient();

router.get(
    '/get-user',
    authMiddleware,
    async(req : Request, res : any)=>{

        if (!req.user || !req.user.id) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const currentUserId = req.user.id;

        const number_x = Number(req.query.x); 
        const number_y = Number(req.query.y); 

        const adjacentRegion : number[][] = actualRegion(number_x , number_y); // get the valid region around the user 

        const validPositions = adjacentRegion.filter(([x, y]) => isValidMove(x, y));

        if (validPositions.length === 0) {
        return res.status(200).json({ nearbyUsers: [] });
        }

        const filters = validPositions.map(([x, y]) => ({ x, y }));

        try {
        const nearbyUsers = await prisma.userPosition.findMany({
            where: {
            OR: filters,
            NOT: { userId: currentUserId }

            }
        });
        console.log("Fetched All near by users : " , nearbyUsers)
        return res.status(200).json({ nearbyUsers });
        } catch (error) {
        console.error("Error fetching users:", error);
        return res.status(500).json({ error: "Failed to fetch nearby users" });
        }
        
    }
)

export default router;
