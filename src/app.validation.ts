import { query } from "express-validator";

export const getProfilesQueriesValidation = [
  query("gender").optional().isString().withMessage("gender must be string"),

  query("age_group")
    .optional()
    .isString()
    .withMessage("age_group must be string"),

  query("min_age")
    .optional()
    .isNumeric()
    .withMessage("min_age must be a number"),

  query("max_age")
    .optional()
    .isNumeric()
    .withMessage("max_age must be a number"),

  query("min_gender_probability")
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage("min_gender_probability must be a number between 0 and 1"),

  query("min_country_probability")
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage("min_country_probability must be a number between 0 and 1"),

  query("sort_by").optional().isString().withMessage("sort_by must be string"),

  query("order").optional().isString().withMessage("order must be string"),
];
