import { Sequelize } from "sequelize-typescript";
import { User } from "../models/user.model";
import dotenv from "dotenv";
dotenv.config();

export const sequelize = new Sequelize(process.env.DB_URI!, {
  dialect: "postgres",
  logging: false,
  dialectOptions: {
    ssl: {
      rejectUnauthorized: false,
    },
  },
});