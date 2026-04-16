# HNG14 Stage 1 - Name Profiler API

An API service that takes a name and asynchronously leverages external APIs (Genderize, Agify, Nationalize) to profile the predicted gender, age, and nationality of that name. This demographic data is securely stored in a PostgreSQL database using the Sequelize ORM, preventing redundant API calls.

## Features

- **Profile Generation:** Predict demographic information (gender, age, age group, and nationality) based on a given name.
- **Data Persistence:** Records are intelligently cached/saved in PostgreSQL to optimize performance and reduce external dependency reads.
- **RESTful Endpoints:** Standard GET, POST, and DELETE endpoints are exposed for easy integration.
- **Dynamic Filtering:** Fetch multiple profiles with query filters such as `gender`, `country_id`, and `age_group`.
- **TypeScript Architecture:** Robust, maintainable, and type-safe backend infrastructure using Express and TypeScript.

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Language:** TypeScript
- **Database:** PostgreSQL
- **ORM:** Sequelize
- **External Providers:** [Agify.io](https://agify.io/), [Genderize.io](https://genderize.io/), [Nationalize.io](https://nationalize.io/)

---

## 🚀 Local Development Setup

Before running the project locally, ensure you have the following installed on your machine:
- [Node.js](https://nodejs.org/) (v16 or higher recommended)
- [PostgreSQL](https://www.postgresql.org/) (or use a cloud provider database like Railway, Supabase, Neon)

### 1. Clone the repository
In your terminal, clone the codebase and navigate into to the project folder:
```bash
git clone https://github.com/your-username/HNG14-Stage-1.git
cd HNG14-Stage-1
```

### 2. Install Dependencies
Install all the necessary packages using npm:
```bash
npm install
```

### 3. Environment Variables
Create a `.env` file in the root directory. You can use the following snippet as a template:
```env
PORT=4000
DB_URI=postgresql://<username>:<password>@<host>:<port>/<dbname>
```
> **Note:** Replace `<username>`, `<password>`, `<host>`, `<port>`, and `<dbname>` with your actual local or remote PostgreSQL connection details.

### 4. Running the Application

**Development Mode:**
To run the server locally with hot-reloading (via nodemon & tsx):
```bash
npm run dev
```

**Production Build:**
To compile the TypeScript code into a JavaScript bundle and run the compiled output:
```bash
npm run build
npm run start
```

If everything is configured correctly, you should see the following in your terminal:
```text
Server running on http://localhost:4000
Database connected...
Database synced...
```

---

## 📡 API Endpoints 

### 1. Health Check
- **GET** `/`
- **Response:** `API is running 🚀`

### 2. Create / Fetch Profile
Predicts the profile of a name or fetches it if it's already in the database.
- **POST** `/api/profiles`
- **Body payload:**
  ```json
  {
    "name": "Jane"
  }
  ```
- **Response:** Returns the created profile including `age`, `age_group`, `gender`, `country_id`, and their respective probabilities.

### 3. Get Multiple Profiles (with optional filters)
- **GET** `/api/profiles`
- **Query Parameters (Optional):** `gender` (male/female), `country_id`, `age_group` (child/teenager/adult/senior)
- **Example Usage:** `/api/profiles?gender=female&age_group=adult`

### 4. Get a Specific Profile by ID
- **GET** `/api/profiles/:id`
- **Path Parameter:** `id` (The existing profile's ID/UUID)
- **Response:** Detailed profile data for the specified ID.

### 5. Delete a Profile
- **DELETE** `/api/profiles/:id`
- **Path Parameter:** `id` (The existing profile's ID/UUID)
- **Response:** `204 No Content` upon successful deletion.
