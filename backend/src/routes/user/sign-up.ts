import { Router , Request , Response} from "express";
import { Prisma, PrismaClient, User } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";


const router = Router()
const prisma= new PrismaClient();


router.post('/sign-up' , async(req : Request , res : any)=> {
    const { email , password } = req.body;
    if(!email || !password){
        return res.status(401).json({message : "Email or password is missing "})
    }
    try {
        const newUser = await prisma.user.create({
            data : {
                id :uuidv4(),
                email ,
                password
            }
        })

        console.log("New User Created : " , newUser)
        return res.status(200).json({Message : "User created successfully " , newUser})

    } catch (error) {
        return res.status(500).json({Message : "Error while creating the User" , error})
    }
    

})
export default router