import { Router , Request , Response} from "express";
import { Prisma, PrismaClient, User } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import createToken from "../../utils/jwt";
import authMiddleware from "../../middleware/authMiddlware";


const router = Router()
const prisma= new PrismaClient();

router.post(
    "/",
    async (req: Request, res: any) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(401).json({ error: "Mail or Password is missing " });
  }

  const user = await prisma.user.findFirst({
    where: {
      email,
      password,
    },
  });

  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = createToken(user.id);
  return res.status(200).json({ message: "Sign-in successful", token });
});

export default router;