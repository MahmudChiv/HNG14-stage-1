import { Request, Response } from "express";
import { AppError } from "../error/App.error";
import { Profile } from "../models/profile.model";
import {
  addProfileService,
  csvExport,
  filterProfiles,
  ParseSearchQuery,
} from "../services/profile.service";
import {
  ExportProfile,
  ProfileQueryBody,
  SearchQuery,
} from "../types/app.types";
import { write } from "fast-csv";

// POST /api/profiles/
export const addProfile = async (req: Request, res: Response) => {
  try {
    const { newProfile } = await addProfileService(req);
    return res.status(200).json({
      status: "success",
      data: newProfile,
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
};

// /api/profiles/export
export const exportProfiles = async (
  req: Request<{}, {}, {}, ExportProfile>,
  res: Response,
) => {
  try {
    const { format } = req.query;
    const { options } = csvExport(req);
    const profiles = await Profile.findAll(options);

    res.setHeader("Content-Type", `text/${format?.toLocaleLowerCase()}`);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=profiles_${new Date()}.${format?.toLocaleLowerCase()}`,
    );
    write(
      profiles.map((p) => p.dataValues),
      { headers: true },
    ).pipe(res);
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
};

export const getProfileWithFiltering = async (req: Request, res: Response) => {
  try {
    const { safePage, safeLimit, total_pages, links, count, rows } =
      await filterProfiles(req);

    return res.status(200).json({
      status: "success",
      page: safePage,
      limit: safeLimit,
      total: count,
      total_pages,
      links,
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
};

export const getProfilesWithSearchQueries = async (
  req: Request<{}, {}, {}, SearchQuery>,
  res: Response,
) => {
  try {
    const { safeLimit, safePage, count, rows, total_pages, links } =
      await ParseSearchQuery(req);

    return res.status(200).json({
      status: "success",
      page: safePage,
      limit: safeLimit,
      total: count,
      total_pages,
      links,
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
};

export const getSingleProfile = async (
  req: Request<{ id: string }, {}, {}, SearchQuery>,
  res: Response,
) => {
  try {
    const user = req.user;
    if (!user)
      return res
        .status(401)
        .json({ status: "error", message: "Unauthorized, log in first" });

    const { id } = req.params;
    const profile = await Profile.findByPk(id);
    return res.status(200).json({ status: "success", profile });
  } catch (error) {
    console.error("Error fetching the profile", error);
    return res
      .status(500)
      .json({ status: "error", message: "Error fetching the profile" });
  }
};
