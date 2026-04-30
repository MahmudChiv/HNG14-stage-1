// user.model.ts
import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/db.config";
import { v7 as uuidv7 } from "uuid";

interface UserAttributes {
  id: string;
  github_id: string;
  username: string;
  email: string;
  avatar_url: string;
  role: string;
  is_active: boolean;
  last_login_at: Date | null;
}

interface UserCreationAttributes extends Optional<
  UserAttributes,
  "id" | "last_login_at"
> {}

export class User
  extends Model<UserAttributes, UserCreationAttributes>
  implements UserAttributes
{
  declare id: string;
  declare github_id: string;
  declare username: string;
  declare email: string;
  declare avatar_url: string;
  declare role: string;
  declare is_active: boolean;
  declare last_login_at: Date | null;
}

User.init(
  {
    id: {
      type:         DataTypes.UUID,
      primaryKey:   true,
      defaultValue: () => uuidv7(),
    },
    github_id: {
      type:   DataTypes.STRING,
      unique: true,
    },
    username: {
      type: DataTypes.STRING,
    },
    email: {
      type:   DataTypes.STRING,
      unique: true,
    },
    avatar_url: {
      type: DataTypes.STRING,
    },
    role: {
      type:         DataTypes.ENUM("admin", "analyst"),
      defaultValue: "analyst",
    },
    is_active: {
      type: DataTypes.BOOLEAN,
    },
    last_login_at: {
      type:      DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName:  "users",
    timestamps: true,
    createdAt:  "created_at",
    updatedAt:  "updated_at",
  },
);