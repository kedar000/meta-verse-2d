import { PrismaClient } from "@prisma/client";
import { Request, Response, Router } from "express";

const router = Router();
const prisma = new PrismaClient();

router.get(
  '/:id',
  async (req: Request, res: any) => {
    try {
      const userId = req.params.id;
        console.log(userId)
      const user = await prisma.user.findUnique({
        where: {
          id: userId
        }
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      console.log("User data:", user);
      return res.status(200).json({ message: "User successfully retrieved", user });
    } catch (error) {
      console.error("Error fetching user:", error);
      return res.status(500).json({ error: "Failed to fetch user" });
    }
  }
);

export default router;