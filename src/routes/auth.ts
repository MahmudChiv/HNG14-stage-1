import { Router } from "express";
import {
  exchangeCliToken,
  getGithub,
  getGithubCallback,
  getUser,
  logout,
  refresh,
} from "../controllers/auth.controller";
import { authenticate } from "../middlewares/verifyJwt";
const router = Router();

router.get("/me", authenticate, getUser);
router.get("/github", getGithub);
router.get("/github/callback", getGithubCallback);

router.post("/logout", authenticate, logout);
router.post("/refresh", refresh);

router.post("/github/cli/token", exchangeCliToken);

export default router;
