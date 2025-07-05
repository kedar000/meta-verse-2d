import { Router, Request, Response } from "express";
import authMiddleware from "../../middleware/authMiddlware";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

router.get(
  "/get-spaces",
  authMiddleware,
  async (req: Request, res: any) => {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const allSpaces = await prisma.space.findMany();

      if (allSpaces.length === 0) {
        return res.status(200).json({ message: "No spaces found" });
      }

      console.log("Fetched all spaces:", allSpaces);

      return res
        .status(200)
        .json({ message: "Successfully fetched all spaces", allSpaces });
    } catch (error) {
      console.error("Error while fetching spaces:", error);
      return res
        .status(500)
        .json({ message: "Error while fetching spaces", error });
    }
  }
);

export default router;