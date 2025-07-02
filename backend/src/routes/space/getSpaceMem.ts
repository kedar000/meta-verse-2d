import {Router , Request , Response } from "express";
import authMiddleware from "../../middleware/authMiddlware";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();
router.get(
    '/get-space-members',
    authMiddleware,
    async(req : Request , res : any)=>{
        const { space } = req.params;

        if(!req.user || !req.user.id){
            return res.status(401).json({ error: "Unauthorized" });
        }
        try {
            const allMembers = await prisma.spaceMember.findMany({
                where : {
                    spaceId : space
                }
            })

            if(allMembers.length == 0) return res.status(200).json({mssg : "The space is Empty"});

            console.log(`All the memeber in space - ${space}  are ` , allMembers);

            return res.status(200).json({mssg : "Successfully got all members " , allMembers});

        } catch (error) {
            console.log(error);
            return res.status(500).json({mssg : "Error while getting the space-members" , error})
        }
    }
)

export default router;