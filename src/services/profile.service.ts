import { Op } from "sequelize";
import {
  Country,
  ExportProfile,
  JwtPayload,
  ProfileQueryBody,
  SearchQuery,
} from "../types/app.types";
import { AppError } from "../error/App.error";
import { validationResult } from "express-validator";
import { Request } from "express";
import countries from "../desPath.json";
import countryNames from "../destPath.json";
import { Profile } from "../models/profile.model";
import axios from "axios";
import { write } from "fast-csv";

const GENDER_MAP: Record<string, string> = {
  male: "male",
  males: "male",
  man: "male",
  men: "male",
  boy: "male",
  boys: "male",
  female: "female",
  females: "female",
  girl: "female",
  girls: "female",
  woman: "female",
  women: "female",
};

const AGE_GROUP_MAP: Record<
  string,
  string | { min_age: number; max_age?: number }
> = {
  young: { min_age: 16, max_age: 24 },
  youth: { min_age: 16, max_age: 24 },
  youths: { min_age: 16, max_age: 24 },
  teen: { min_age: 13, max_age: 17 },
  teens: { min_age: 13, max_age: 17 },
  teenager: { min_age: 13, max_age: 17 },
  teenagers: { min_age: 13, max_age: 17 },
  adult: "adult",
  adults: "adult",
  seniors: { min_age: 60 },
  elderly: { min_age: 60 },
  old: { min_age: 60 },
};

const genderData = async (
  name: string,
): Promise<{
  gender: string;
  gender_probability: number;
}> => {
  try {
    const res = await axios.get("https://api.genderize.io/", {
      params: { name },
    });

    const { data } = res;
    const { gender, count } = data;
    if (gender === null || count === 0)
      throw new AppError("Genderize returned an invalid response", 502);

    return {
      gender,
      gender_probability: data.probability,
    };
  } catch (error) {
    throw new AppError("Failed to fetch data from Genderize API", 500);
  }
};

const ageData = async (
  name: string,
): Promise<{ age: number; age_group: string }> => {
  try {
    const res = await axios.get("https://api.agify.io/", {
      params: { name },
    });
    const age = res.data.age;
    if (age === null)
      throw new AppError("Agify returned an invalid response", 502);

    let age_group: string = "unknown";
    if (age <= 12) {
      age_group = "child";
    } else if (age > 12 && age <= 19) {
      age_group = "teenager";
    } else if (age > 19 && age <= 59) {
      age_group = "adult";
    } else if (age >= 60) {
      age_group = "senior";
    }
    return { age, age_group };
  } catch (error) {
    throw new Error("Failed to fetch data from Agify API");
  }
};

const nationalityData = async (
  name: string,
): Promise<{
  country_id: string;
  country_name: string;
  country_probability: number;
}> => {
  try {
    const res = await axios.get("https://api.nationalize.io/", {
      params: { name },
    });

    const countries: Country[] = res.data.country;
    if (!countries || countries.length === 0)
      throw new AppError("Nationalize returned an invalid response", 502);

    const country = countries.reduce((prev, current) =>
      prev.probability > current.probability ? prev : current,
    );

    const country_name =
      countryNames.find((c) => c.country_id === country.country_id)
        ?.country_name ?? "";

    return {
      country_id: country.country_id,
      country_name,
      country_probability: +country.probability.toFixed(2),
    };
  } catch (error) {
    console.error("Nationalize API error:", error);
    throw new Error("Failed to fetch data from Nationalize API");
  }
};

const filterResponse = (query: any) => {
  // Filtering the response
  const options: any = {};
  const queryOptions: any = {};
  const ageOptions: any = {};

  query.gender?.toLowerCase() === "male"
    ? (queryOptions.gender = "male")
    : query.gender?.toLowerCase() === "female"
      ? (queryOptions.gender = "female")
      : null;
  query.age_group?.toLocaleLowerCase()
    ? (queryOptions.age_group = query.age_group)
    : null;
  query.country_id?.toLocaleLowerCase()
    ? (queryOptions.country_id = query.country_id)
    : null;

  if (!isNaN(query.min_age!) || !isNaN(query.max_age!)) {
    if (Number(query.min_age)) ageOptions[Op.gte] = Number(query.min_age);
    if (Number(query.max_age)) ageOptions[Op.lte] = Number(query.max_age);
  }

  !isNaN(query.min_gender_probability!)
    ? (queryOptions.gender_probability = query.min_gender_probability)
    : null;
  !isNaN(query.min_country_probability!)
    ? (queryOptions.country_probability = query.min_country_probability)
    : null;

  // Sorting the response
  const validSortBy =
    query.sort_by?.toLowerCase() === "age" ||
    query.sort_by?.toLowerCase() === "created_at" ||
    query.sort_by?.toLowerCase() === "gender_probability"
      ? query.sort_by.toLowerCase()
      : null;

  const validOrder = query.order?.toLowerCase() === "desc" ? "desc" : "asc";

  // Pagination
  const safePage = !isNaN(query.page!) ? Number(query.page) : 1;
  const safeLimit =
    !isNaN(query.limit!) &&
    Number(query.limit) <= 50 &&
    Number(query.limit) >= 10
      ? Number(query.limit)
      : Number(query.limit) < 10
        ? 10
        : 50;
  const offset = (safePage - 1) * safeLimit;
  options.limit = safeLimit;
  options.offset = offset;
  if (!query.page || !query.limit) {
    options.limit = 50;
    options.offset = 0;
  }

  if (Object.getOwnPropertySymbols(ageOptions).length > 0)
    queryOptions.age = ageOptions;

  if (queryOptions && Object.keys(queryOptions).length > 0)
    options.where = queryOptions;

  if (query.sort_by && query.order) options.order = [[validSortBy, validOrder]];

  return { safePage, safeLimit, options };
};

// POST /api/profiles/
export async function addProfileService(
  req: Request<{}, {}, { name: string }, {}>,
) {
  const user = req.user as JwtPayload;
  if (!user) throw new AppError("Unauthorized", 401);
  if (user.role !== "admin") throw new AppError("Forbidden", 403);

  const { name } = req.body;
  if (!name) throw new AppError("Missing or empty name", 400);

  if (typeof name !== "string") throw new AppError("Name is not a string", 400);

  const { gender, gender_probability } = await genderData(name);
  const { age, age_group } = await ageData(name);
  const { country_id, country_name, country_probability } =
    await nationalityData(name);

  const newProfile = await Profile.create({
    name,
    gender,
    gender_probability,
    age,
    age_group,
    country_id,
    country_name,
    country_probability,
    created_at: new Date(),
  });

  return { newProfile };
}

// /api/profiles/export
export function csvExport(req: Request<{}, {}, {}, ExportProfile>) {
  const user = req.user;
  if (!user) throw new AppError("Unauthorized", 401);

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error(errors.array().map((e) => e.msg)[0]);
    throw new AppError(errors.array().map((e) => e.msg)[0], 400);
  }

  const { options } = filterResponse(req.query);
  return { options };
}

// /api/profiles
export async function filterProfiles(
  req: Request<{}, {}, {}, ProfileQueryBody>,
) {
  const user = req.user;
  if (!user) throw new AppError("Unauthorized", 401);

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error(errors.array().map((e) => e.msg));
    throw new AppError("Invalid parameter type", 400);
  }

  const apiVersion = req.headers["x-api-version"];
  if (!apiVersion) throw new AppError("API version header required", 400);

  //Query type validation
  const allowedQueries = [
    "gender",
    "age_group",
    "country_id",
    "min_age",
    "max_age",
    "min_gender_probability",
    "min_country_probability",
    "sort_by",
    "order",
    "page",
    "limit",
  ];
  const invalidQueries = Object.keys(req.query).filter(
    (key) => !allowedQueries.includes(key),
  );
  if (invalidQueries.length > 0)
    throw new AppError("Invalid query parameters", 400);

  const { safePage, safeLimit, options } = filterResponse(req.query);

  const { count, rows } = await Profile.findAndCountAll(options);
  if (count === 0) throw new AppError("Profile not found", 404);

  let totalPages = count / safeLimit;
  const total_pages = !Number.isInteger(totalPages)
    ? Math.ceil(totalPages)
    : totalPages;
  const links: { self: string; next: string; prev: string | null } = {
    self: `/api/profiles?page=${safePage}&limit=${safeLimit}`,
    next: `/api/profiles?page=${safePage + 1}&limit=${safeLimit}`,
    prev:
      safePage > 1
        ? `/api/profiles?page=${safePage - 1}&limit=${safeLimit}`
        : null,
  };

  return { safePage, safeLimit, total_pages, count, rows, links };
}

// /api/profiles/search
export async function ParseSearchQuery(req: Request<{}, {}, {}, SearchQuery>) {
  const user = req.user;
  if (!user) throw new AppError("Unauthorized", 401);

  const { q, page, limit } = req.query as SearchQuery;
  const options: any = {};
  const queryOptions: any = {};
  const ageOptions: any = {};
  let matched = false;

  const apiVersion = req.headers["x-api-version"];
  console.log(req.headers);
  console.log(apiVersion);
  if (!apiVersion) throw new AppError("API version header required", 400);

  // q Query validation
  if (!q) throw new AppError("Missing or empty parameter", 400);
  //Query type validation
  const allowedQueries = ["q", "limit", "page"];
  const invalidQueries = Object.keys(req.query).filter(
    (key) => !allowedQueries.includes(key),
  );
  if (invalidQueries.length > 0)
    throw new AppError("Invalid query parameters", 400);

  // Pagination
  const safePage = !isNaN(page!) ? Number(page) : 1;
  const safeLimit = !isNaN(limit!) && Number(limit) < 50 ? Number(limit) : 50;
  const offset = (safePage - 1) * safeLimit;
  options.limit = safeLimit;
  options.offset = offset;
  if (!page || !limit) {
    options.limit = 50;
    options.offset = 0;
  }

  const keywords = q.toLocaleLowerCase()
    ? q.toLocaleLowerCase().split(/\s+/)
    : null;

  // Parsing the gender
  for (const keyword of keywords!) {
    if (GENDER_MAP[keyword]) {
      queryOptions.gender = GENDER_MAP[keyword];
      matched = true;
      break;
    }
  }

  if (
    keywords?.join(" ").includes("male and female") ||
    keywords?.join(" ").includes("men and women") ||
    keywords?.join(" ").includes("boys and girls")
  ) {
    delete queryOptions.gender;
  }

  // Parsing the age group
  for (const keyword of keywords!) {
    if (
      typeof AGE_GROUP_MAP[keyword] === "string" &&
      AGE_GROUP_MAP[keyword] === "adult"
    ) {
      queryOptions.age_group = "adult";
      matched = true;
      break;
    } else if (AGE_GROUP_MAP[keyword]) {
      ageOptions[Op.gte] = (
        AGE_GROUP_MAP[keyword] as { min_age: number; max_age: number }
      ).min_age;
      (AGE_GROUP_MAP[keyword] as { min_age: number; max_age: number }).max_age
        ? (ageOptions[Op.lte] = (
            AGE_GROUP_MAP[keyword] as { min_age: number; max_age: number }
          ).max_age)
        : null;
      matched = true;
      break;
    }
  }

  const uniqueCountries = countries;
  const capitalize = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  // Parsing the country
  for (const keyword of keywords!) {
    if (uniqueCountries.includes(capitalize(keyword))) {
      queryOptions.country_name = capitalize(keyword);
      matched = true;
      break;
    }
  }

  //Parsing queries like above or older than or at least <age>
  const aboveMatch = q
    .toLocaleLowerCase()
    .match(/(above|over|older\s+than|at\s+least)\s+(\d+)/);
  if (aboveMatch) {
    if (aboveMatch[1] === "at least") {
      ageOptions[Op.gte] = parseInt(aboveMatch[2]!, 10);
      matched = true;
    } else {
      delete ageOptions[Op.gte];
      delete ageOptions[Op.lte];
      ageOptions[Op.gt] = parseInt(aboveMatch[2]!, 10);
      matched = true;
    }
  }

  //Parsing queries like below or younger than or at most <age>
  const belowMatch = q
    .toLocaleLowerCase()
    .match(/(below|under|younger\s+than|at\s+most)\s+(\d+)/);
  if (belowMatch) {
    if (belowMatch[1] === "at most") {
      ageOptions[Op.lte] = parseInt(belowMatch[2]!, 10);
      matched = true;
    } else {
      ageOptions[Op.lt] = parseInt(belowMatch[2]!, 10);
      matched = true;
    }
  }

  //Parsing queries like aged <age>
  const agedMatch = q.match(/aged?\s+(\d+)/);
  if (agedMatch) {
    ageOptions[Op.eq] = parseInt(agedMatch[1]!, 10);
    matched = true;
  }

  if (!matched) throw new AppError("Unable to interpret query", 400);
  if (Object.getOwnPropertySymbols(ageOptions).length > 0)
    queryOptions.age = ageOptions;

  options.where = queryOptions;

  const { count, rows } = await Profile.findAndCountAll(options);
  if (count === 0) throw new AppError("Profile not found", 404);

  let totalPages = count / safeLimit;
  const total_pages = !Number.isInteger(totalPages)
    ? Math.ceil(totalPages)
    : totalPages;
  const links: { self: string; next: string; prev: string | null } = {
    self: `/api/profiles?page=${safePage}&limit=${safeLimit}`,
    next: `/api/profiles?page=${safePage + 1}&limit=${safeLimit}`,
    prev:
      safePage > 1
        ? `/api/profiles?page=${safePage - 1}&limit=${safeLimit}`
        : null,
  };

  return { safePage, safeLimit, total_pages, count, rows, links };
}
