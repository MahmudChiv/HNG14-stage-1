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

    const countries = rawData.map((profile) => ({
      country_id: profile.country_id,
      country_name: profile.country_name,
    }));

    const unique = new Map();
    countries.forEach((country) => {
      if (!unique.has(country.country_id))
        unique.set(country.country_id, country);
    });

    const uniqueCountries = Array.from(unique.values())
    console.log(uniqueCountries.length);

    // write file
    await writeFile(despath, JSON.stringify(uniqueCountries, null, 2), "utf8");
    console.log("Done");
  } catch (error) {
    console.error("Error processing req:" + error);
  }
}

copyFileData("./src/destPath.json");




// // src/api/axiosInstance.ts
// import axios from 'axios';

// const api = axios.create({
//   baseURL: 'http://localhost:3000',
//   withCredentials: true, // sends cookies automatically
// });

// // Intercept every response
// api.interceptors.response.use(
//   (response) => response, // success, do nothing

//   async (error) => {
//     const originalRequest = error.config;

//     // If 401 and we haven't retried yet
//     if (error.response?.status === 401 && !originalRequest._retry) {
//       originalRequest._retry = true; // prevent infinite loop

//       try {
//         // Call refresh — cookie is sent automatically
//         const res = await api.post('/auth/refresh');
//         const newAccessToken = res.data.accessToken;

//         // Update the header and retry original request
//         originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
//         return api(originalRequest);

//       } catch (refreshError) {
//         // Refresh failed — force logout
//         window.location.href = '/login';
//         return Promise.reject(refreshError);
//       }
//     }

//     return Promise.reject(error);
//   }
// );

// export default api;