import { Router , Request , Response} from "express";
import { Prisma, PrismaClient, User } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import createToken from "../../utils/jwt";


const router = Router()
const prisma= new PrismaClient();


router.post(
    "/" ,
     async(req : Request , res : any)=> {
    const { email , password } = req.body;
    if(!email || !password){
        return res.status(401).json({message : "Email or password is missing "})
    }

    const existing = await prisma.user.findUnique({
        where : {
            email : email
        }
    })
    if (existing) return res.status(400).json({ msg: "User already exists" });
    try {
        const newUser = await prisma.user.create({
            data : {
                id :uuidv4(),
                email ,
                password
            }
        })
        const token = createToken(newUser.id);

        console.log("New User Created : " , newUser)
        console.log("New User Token  : " , token)
        return res.status(200).json({Message : "User created successfully " , newUser , token : token})

    } catch (error) {
        return res.status(500).json({Message : "Error while creating the User" , error})
    }
    

})
export default router