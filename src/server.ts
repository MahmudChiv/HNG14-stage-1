import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth";
import appRoutes from "./routes/api/api.profile";
import { sequelize } from "./config/db.config";
import session from "express-session";
import cookieParser from "cookie-parser";
import { JwtPayload } from "./types/app.types";
import { authLimiter, apiLimiter } from "./middlewares/rateLimit.middleware";
import morgan from "morgan";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.set("trust proxy", 1);

app.use(express.json());
app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL || "http://localhost:5173",
      "http://localhost:5173",
    ],
    credentials: true,
    allowedHeaders: [
      // 👈 add this
      "Content-Type",
      "Authorization",
      "x-api-version",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  }),
);
app.use(morgan(":method :url :status :response-time ms"));
app.use(cookieParser());
app.use(
  session({
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 10 * 60 * 1000,
    },
  }),
);
app.use("/auth", authLimiter);
app.use("/api", apiLimiter);
app.use("/auth", authRoutes);
app.use("/api", appRoutes);

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
declare module "express-session" {
  interface SessionData {
    codeVerifier: string;
    state: string;
  }
}

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log("Database connected...");
    await sequelize.sync();
    console.log("Database synced...");
  } catch (error) {
    console.error("Error connecting to the database:", error);
  }
};
connectDB();

app.get("/", (req, res) => {
  res.send("API is running 🚀");
});

app.listen(process.env.PORT!, () =>
  console.log(`Server running on http://localhost:${process.env.PORT!}`),
);
