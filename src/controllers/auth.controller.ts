import { Request, Response } from "express";
import {
  generateCodeChallenge,
  generateCodeVerifier,
  generateState,
} from "../utils/pkce.util";
import { User } from "../models/user.model";
import * as authService from "../services/auth.service";
import axios from "axios";
import dotenv from "dotenv";
import { signJwt } from "../utils/jwt.util";
import { AppError } from "../error/App.error";
import jwt from "jsonwebtoken";
dotenv.config();

export const getUser = async (req: Request, res: Response) => {
  const user = req.user;
  if (!user)
    return res.status(401).json({ status: "error", message: "Unauthorized" });

  const userData = await User.findByPk(user.id);

  return res.status(200).json({ status: "success", userData });
};

export const getGithub = (req: Request, res: Response) => {
  try {
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    const state = generateState();

    req.session.codeVerifier = codeVerifier;
    req.session.state = state;

    const params = new URLSearchParams({
      client_id: process.env.GITHUB_CLIENT_ID!,
      redirect_uri: process.env.GITHUB_CALLBACK_URL!,
      scope: "read:user user:email",
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });

    res.redirect(`https://github.com/login/oauth/authorize?${params}`);
  } catch (error) {
    console.error("Error logging in with github", error);
    return res.status(500).json({
      status: "error",
      message: "Internal Server error, failed to log in with github",
    });
  }
};

export const getGithubCallback = async (req: Request, res: Response) => {
  const { code, state } = req.query as { code: string; state: string };
  if (!state || state !== req.session.state)
    return res
      .status(400)
      .json({ status: "error", message: "Invalid state parameter" });

  const codeVerifier = req.session.codeVerifier;
  if (!codeVerifier)
    return res
      .status(400)
      .json({ status: "error", message: "Missing code verifier" });

  try {
    const tokenRes = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: process.env.GITHUB_CLIENT_ID!,
        client_secret: process.env.GITHUB_CLIENT_SECRET!,
        code,
        redirect_uri: process.env.GITHUB_CALLBACK_URL!,
        code_verifier: codeVerifier, // PKCE verification
      },
      { headers: { Accept: "application/json" } },
    );

    const githubAccessToken = tokenRes.data.access_token;
    if (!githubAccessToken) {
      return res.status(401).json({ error: "Failed to get access token" });
    }

    const [userRes, emailRes] = await Promise.all([
      axios.get("https://api.github.com/user", {
        headers: { Authorization: `Bearer ${githubAccessToken}` },
      }),
      axios.get("https://api.github.com/user/emails", {
        headers: { Authorization: `Bearer ${githubAccessToken}` },
      }),
    ]);

    const githubUser = userRes.data;
    const primaryEmail = emailRes.data.find(
      (email: { primary: boolean; email: string }) => email.primary,
    )?.email;

    const [user] = await User.findOrCreate({
      where: { github_id: String(githubUser.id) },
      defaults: {
        github_id: String(githubUser.id),
        username: githubUser.name || githubUser.login,
        email: primaryEmail,
        avatar_url: githubUser.avatar_url,
        role: "analyst",
        is_active: true,
      },
    });

    user.last_login_at = new Date();
    await user.save();
    const { accessToken, refreshToken } = signJwt(user.id, user.role);

    delete req.session.codeVerifier;
    delete req.session.state;

    return res
      .cookie("access_token", accessToken, {
        httpOnly: true,
        secure: false,
        sameSite: "strict",
        maxAge: 3 * 60 * 1000,
      })
      .cookie("refresh_token", refreshToken, {
        httpOnly: true,
        secure: false,
        sameSite: "strict",
        maxAge: 5 * 60 * 1000,
      })
      .redirect(`${process.env.FRONTEND_URL}/auth/success`);
  } catch (error) {
    console.error("Error getting callback", error);
    return res.status(500).json({
      status: "error",
      message: "Internal Server error, failed to get callback",
    });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    await authService.invalidateToken(req);
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
  } catch (error: any) {
    if (error instanceof AppError)
      return res.status(error.statusCode).json({ erros: error.message });

    console.error(error);
    return res.status(500).json({ error: "Internal Server Error!" });
  }
};

export const refresh = async (req: Request, res: Response) => {
  try {
    const { accessToken, newRefreshToken } =
      await authService.issueNewToken(req);

    res
      .cookie("accessToken", accessToken, {
        httpOnly: true,
        sameSite: "strict",
        maxAge: 3 * 60 * 1000,
      })
      .cookie("refreshToken", newRefreshToken, {
        httpOnly: true,
        sameSite: "strict",
        maxAge: 5 * 60 * 1000,
      })
      .json({
        status: "success",
        access_token: accessToken,
        refresh_token: newRefreshToken,
      });
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res
        .status(403)
        .json({ message: "Refresh token expired, please login again" });
      return;
    }
    res.status(403).json({ message: "Invalid refresh token" });
  }
};

export const exchangeCliToken = async (req: Request, res: Response) => {
  const { code, code_verifier } = req.body;

  if (!code || !code_verifier) {
    return res
      .status(400)
      .json({ status: "error", message: "Missing code or code_verifier" });
  }

  try {
    const tokenRes = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: process.env.CLI_GITHUB_CLIENT_ID!,
        client_secret: process.env.CLI_GITHUB_CLIENT_SECRET!,
        code,
        redirect_uri: `http://localhost:${req.body.port || 9876}/callback`,
        code_verifier, // CLI generated this, CLI sends it here
      },
      { headers: { Accept: "application/json" } },
    );

    const githubAccessToken = tokenRes.data.access_token;
    if (!githubAccessToken) {
      return res.status(401).json({ error: "Failed to get access token" });
    }

    const [userRes, emailRes] = await Promise.all([
      axios.get("https://api.github.com/user", {
        headers: { Authorization: `Bearer ${githubAccessToken}` },
      }),
      axios.get("https://api.github.com/user/emails", {
        headers: { Authorization: `Bearer ${githubAccessToken}` },
      }),
    ]);

    const githubUser = userRes.data;
    const primaryEmail = emailRes.data.find(
      (e: { primary: boolean; email: string }) => e.primary,
    )?.email;

    const [user] = await User.findOrCreate({
      where: { github_id: String(githubUser.id) },
      defaults: {
        github_id: String(githubUser.id),
        username: githubUser.name || githubUser.login,
        email: primaryEmail,
        avatar_url: githubUser.avatar_url,
        role: "analyst", // TRD says default is analyst
        is_active: true,
      },
    });

    user.last_login_at = new Date();
    await user.save();

    const { accessToken, refreshToken } = signJwt(user.id, user.role);

    // ✅ For CLI: return tokens as JSON, NOT as cookies
    return res.json({
      status: "success",
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ status: "error", message: "Token exchange failed" });
  }
};