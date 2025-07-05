import { PrismaClient } from "@prisma/client";
import { Request , Response , Router } from "express";
import authMiddleware from "../../middleware/authMiddlware";
const router = Router();
const prisma = new PrismaClient()

router.get(
    '/get-user',
    authMiddleware,
    async(req : Request , res : any)=>{
        try {
            if (!req.user || !req.user.id) {
                return res.status(401).json({ error: "Unauthorized" });
            }
            const currentUserId = req.user.id;

            const user = await prisma.user.findUnique({
                where : {
                    id : currentUserId
                }
            })
            console.log("User data : " , user)
            return res.status(200).json({mssg : "User succesfully retrived " , user});
        } catch (error) {
            console.error("Error fetching users:", error);
            return res.status(500).json({ error: "Failed to fetch nearby users" });
        }
    }
)

export default router;