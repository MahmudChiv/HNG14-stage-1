import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth";
import appRoutes from "./routes/api/api.profile";
import { sequelize } from "./config/db.config";
import session from "express-session";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { JwtPayload } from "./types/app.types";
dotenv.config();

const app = express();

app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:5173", // your frontend URL — can't be * with credentials
    credentials: true, // ← required for cookies to work cross-origin
  }),
);
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
