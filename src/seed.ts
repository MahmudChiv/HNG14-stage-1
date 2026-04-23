import path from "path";
import fs from "fs";
import { sequelize } from "./db.config";
import { Profile } from "./db.model";

const filePath = path.resolve(__dirname, "./seed_profiles.json");
const rawData: any = fs.readFileSync(filePath);
const profiles = JSON.parse(rawData).profiles;

async function seed() {
  try {
    const profilesWithTimeStamps = profiles.map((profile: Profile) => ({
      ...profile,
      created_at: new Date(),
    }));
    console.log(
      "Seeding database with profiles..." +
        profilesWithTimeStamps.length +
        " profiles",
    );

    await sequelize.authenticate();
    await sequelize.sync();

    await Profile.bulkCreate(profilesWithTimeStamps);
    console.log("Database seeded successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}

seed();
