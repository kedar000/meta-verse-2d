import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET ||''

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  console.log("<- Reached AuthMiddlware ->")
  if (!authHeader) {
    res.status(401).json({ error: "Authorization header is missing" });
    return ;
  }

  if (!authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Invalid Authorization scheme. Must use Bearer token" });
    return ;
  }

  const token = authHeader.split(" ")[1].trim();
  if (!token) {
    res.status(401).json({ error: "Token is missing" });
    return; 
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; 
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid or expired token" });
    return; 
  }
};

export default authMiddleware;