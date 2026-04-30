import rateLimit from "express-rate-limit";

// For /auth/* routes — 10 requests per minute
export const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per window
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false,
  message: {
    status: "error",
    message: "Too many requests, please try again later.",
  },
});

// For all other routes — 60 requests per minute per user
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit per authenticated user, not per IP
    // This way CLI and frontend users each get their own 60/min bucket
    return (req as any).user?.id || req.ip;
  },
  message: {
    status: "error",
    message: "Too many requests, please try again later.",
  },
});
