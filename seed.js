import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { readFile, writeFile } from "fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function copyFileData(despath) {
  try {
    const filePath = path.join(__dirname, "src/seed_profiles.json");
    const filecontent = fs.readFileSync(filePath, "utf-8");
    const rawData = JSON.parse(filecontent).profiles;
    // console.log(rawData)

    const countries = rawData.map((profile) =>
      profile.country_name.toLocaleLowerCase(),
    );
    const u = [...new Set(countries)];
    const capitalize = (str) => {
      return str.charAt(0).toUpperCase() + str.slice(1);
    };
    const uniqueCountries = u.map((country) => capitalize(country));
    console.log(uniqueCountries);

    // write file
    await writeFile(despath, JSON.stringify(uniqueCountries, null, 2), "utf8");
    console.log("Done");
  } catch (error) {
    console.error("Error processing req:" + error);
  }
}

copyFileData("./src/desPath.json");
