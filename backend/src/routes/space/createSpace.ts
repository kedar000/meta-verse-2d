import { PrismaClient } from "@prisma/client";
import { Router , Request , Response} from "express";
import authMiddleware from "../../middleware/authMiddlware";
import { v4 as uuidv4 } from "uuid";

enum SpaceMemberRole {
  OWNER,
  ADMIN,
  MEMBER
}
const route = Router()
const prisma = new PrismaClient();
route.post(
    '/create-space',
    authMiddleware,
    async(req : Request , res : any)=>{
        const {
            name ,
            description,
            maxMembers,
        } = req.body;

        if(!name){ 
            return res.status(401).json({Error : "Enter space Name"});
        }

        if (!req.user || !req.user.id) { // getUserId
            return res.status(401).json({ error: "Unauthorized" });
        }
        const currentUserId = req.user.id;
        const spaceId = uuidv4()

        try {
            const newSpace = await prisma.space.create({ // create a space 
                data : {
                    id : spaceId,
                    name : name,
                    description : description,
                    maxMembers : maxMembers,
                    createdById : currentUserId
                }
            })
            console.log("New Space Created : " , newSpace);
            // getting issue while joing in the room 
            
            // const spcaeMember = await prisma.spaceMember.create({
            //     data : {
            //         id : uuidv4(),
            //         userId : currentUserId,
            //         spaceId : newSpace.id,
            //         role : "OWNER"
            //     }
            // })

            // console.log("Enrolled in SpaceMemeber " , spcaeMember)
            return res.status(200).json({mssg : "New Space created successfully"})

        } catch (error) {
            console.log("Error : " , error)
            return res.status(500).json({Msgg : "Error while inserting data in DB" , error})
        }

    }
)
export default route;