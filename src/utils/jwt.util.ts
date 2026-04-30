import jwt from "jsonwebtoken";

export const signJwt = (userId: string, role: string) => {
  const payload = { id: userId, role };
  const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_KEY!, {
    expiresIn: "3m",
  });
  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_KEY!, {
    expiresIn: "5m",
  });

  return { accessToken, refreshToken };
};
