import { Request } from "express";
import { AppError } from "../error/App.error";
import redisClient from "../config/redis";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model";
import { signJwt } from "../utils/jwt.util";

export const invalidateToken = async (req: Request) => {
  const user = req.user;
  if (!user) throw new AppError("Unauthorized, you're not logged in!", 401);

  const accessToken = req.cookies.accessToken;
  const refreshToken = req.cookies.refreshToken;
  if (!accessToken || !refreshToken) throw new AppError("No tokens found", 401);

  await redisClient.set(`blacklist: ${accessToken}`, "true", {
    expiration: {
      type: "EX",
      value: 3 * 60,
    },
  });
  await redisClient.set(`blacklist: ${refreshToken}`, "true", {
    expiration: {
      type: "EX",
      value: 5 * 60 * 60,
    },
  });
  return;
};

export const  issueNewToken = async (req: Request) => {
  const token = req.cookies?.refreshToken;
  if (!token) throw new AppError("No refresh token", 401);

  const decoded = jwt.verify(
    token,
    process.env.JWT_REFRESH_KEY as string,
  ) as jwt.JwtPayload;
  if (!decoded) throw new AppError("Invalid token", 401);

  const user = await User.findOne({
    where: { id: decoded.id },
  });

  if (!user) throw new AppError("No user, forbidden", 403);
  const { accessToken, refreshToken: newRefreshToken } = signJwt(
    user.id,
    user.role,
  );
  return { accessToken, newRefreshToken };
};
