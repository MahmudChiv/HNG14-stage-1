import { Request, Response, Router } from "express";
import { Profile } from "./db.model";
import { AppError } from "./App.error";
import { ProfileQueryBody, SearchQuery } from "./app.types";
import { Op } from "sequelize";
import { Pool } from "pg";
import { filterProfiles, ParseSearchQuery } from "./app.service";
import { getProfilesQueriesValidation } from "./app.validation";

const router = Router();
const pool = new Pool();

router.get(
  "/profiles",
  getProfilesQueriesValidation,
  async (req: Request<{}, {}, {}, ProfileQueryBody>, res: Response) => {
    try {
      const { safePage, safeLimit, options } = filterProfiles(req);
      const { count, rows } = await Profile.findAndCountAll(options);
      if (count === 0) return res
        .status(404)
        .json({ status: "error", message: "Profile not found" });

      return res.status(200).json({
        status: "success",
        page: safePage,
        limit: safeLimit,
        total: count,
        data: rows,
      });
    } catch (error) {
      if (error instanceof AppError)
        return res
          .status(error.statusCode)
          .json({ status: "error", message: error.message });

      console.error("Error processing request:", error);
      return res
        .status(500)
        .json({ status: "error", message: "Error processing request" });
    }
  },
);

router.get(
  "/profiles/search",
  async (req: Request<{}, {}, {}, SearchQuery>, res: Response) => {
    try {
      const { safeLimit, safePage, options } = ParseSearchQuery(req.query);
      const { count, rows } = await Profile.findAndCountAll(options);
      if (count === 0)
        return res
          .status(404)
          .json({ status: "error", message: "Profile not found" });

      return res.status(200).json({
        status: "success",
        page: safePage,
        limit: safeLimit,
        total: count,
        data: rows,
      });
    } catch (error) {
      if (error instanceof AppError)
        return res
          .status(error.statusCode)
          .json({ status: "error", message: error.message });

      console.error("Error processing search request:", error);
      return res
        .status(500)
        .json({ status: "error", message: "Error processing search request" });
    }
  },
);

export default router;
