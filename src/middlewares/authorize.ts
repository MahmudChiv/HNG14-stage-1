import { Request, Response, NextFunction } from "express";

export const requireRole = (role: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user;

    if (!user || user.role !== role) {
      res.status(403).json({ message: "Forbidden: insufficient permissions" });
      return;
    }

    next();
  };
};

