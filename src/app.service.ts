import { Op } from "sequelize";
import { ProfileQueryBody, SearchQuery } from "./app.types";
import { match } from "node:assert";
import { AppError } from "./App.error";
import path from "path";
import fs from "fs";
import { validationResult } from "express-validator";
import { Request } from "express";
import countries from "./desPath.json";

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

// /api/profiles
export function filterProfiles(req: Request<{}, {}, {}, ProfileQueryBody>) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error(errors.array().map((e) => e.msg));
    throw new AppError("Invalid parameter type", 400);
  }
  const {
    gender,
    age_group,
    country_id,
    min_age,
    max_age,
    min_gender_probability,
    min_country_probability,
    sort_by,
    order,
    page,
    limit,
  } = req.query;

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

  const options: any = {};
  const queryOptions: any = {};
  const ageOptions: any = {};

  // Filtering the response

  gender?.toLowerCase() === "male"
    ? (queryOptions.gender = "male")
    : gender?.toLowerCase() === "female"
      ? (queryOptions.gender = "female")
      : null;
  age_group?.toLocaleLowerCase() ? (queryOptions.age_group = age_group) : null;
  country_id?.toLocaleLowerCase()
    ? (queryOptions.country_id = country_id)
    : null;

  if (!isNaN(min_age!) || !isNaN(max_age!)) {
    if (Number(min_age)) ageOptions[Op.gte] = Number(min_age);
    if (Number(max_age)) ageOptions[Op.lte] = Number(max_age);
  }

  !isNaN(min_gender_probability!)
    ? (queryOptions.gender_probability = min_gender_probability)
    : null;
  !isNaN(min_country_probability!)
    ? (queryOptions.country_probability = min_country_probability)
    : null;

  // Sorting the response
  const validSortBy =
    sort_by?.toLowerCase() === "age" ||
    sort_by?.toLowerCase() === "created_at" ||
    sort_by?.toLowerCase() === "gender_probability"
      ? sort_by.toLowerCase()
      : null;

  const validOrder = order?.toLowerCase() === "desc" ? "desc" : "asc";

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

  if (Object.getOwnPropertySymbols(ageOptions).length > 0)
    queryOptions.age = ageOptions;

  if (queryOptions && Object.keys(queryOptions).length > 0)
    options.where = queryOptions;

  if (sort_by && order) options.order = [[validSortBy, validOrder]];

  return { safePage, safeLimit, options };
}

// /api/profiles/search
export function ParseSearchQuery(query: SearchQuery) {
  const { q, page, limit } = query;
  const options: any = {};
  const queryOptions: any = {};
  const ageOptions: any = {};
  let matched = false;

  // q Query validation
  if (!q) throw new AppError("Missing or empty parameter", 400);
  //Query type validation
  const allowedQueries = ["q", "limit", "page"];
  const invalidQueries = Object.keys(query).filter(
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

  return { safePage, safeLimit, options };
}
