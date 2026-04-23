import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "./db.config";
import { v7 as uuidv7 } from "uuid";

/**
 * 1. Define Attributes (what exists in DB)
 */
interface UserAttributes {
  id: string;
  name: string;
  gender: string;
  gender_probability: number;
  age: number;
  age_group: string;
  country_id: string;
  country_name: string;
  country_probability: number;
  created_at: Date;
}

/**
 * 2. Define Creation Attributes (what can be optional when creating)
 */
interface UserCreationAttributes extends Optional<
  UserAttributes,
  "id" | "created_at"
> {}

/**
 * 3. Define Model
 */
export class Profile
  extends Model<UserAttributes, UserCreationAttributes>
  implements UserAttributes
{
  public id!: string;
  public name!: string;
  public gender!: string;
  public gender_probability!: number;
  public age!: number;
  public age_group!: string;
  public country_id!: string;
  public country_name!: string;
  public country_probability!: number;
  public created_at!: Date;
}

/**
 * 4. Initialize Model
 */
Profile.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: () => uuidv7(),
    },
    name: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
    },
    gender: {
      type: DataTypes.STRING,
    },
    gender_probability: {
      type: DataTypes.FLOAT,
    },
    age: {
      type: DataTypes.INTEGER,
    },
    age_group: {
      type: DataTypes.STRING,
    },
    country_id: {
      type: DataTypes.STRING,
    },
    country_name: {
      type: DataTypes.STRING,
    },
    country_probability: {
      type: DataTypes.FLOAT,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: "profiles",
    timestamps: false,
  },
);
