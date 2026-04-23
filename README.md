# HNG14 Stage 1 - Name Profiler API

An API service providing dynamic querying and filtering of demographic profile data (gender, age, age group, and nationality). Data is securely persisted in a PostgreSQL database using the Sequelize ORM, allowing comprehensive fetching and natural language search capabilities.

## Features

- **Dynamic Filtering:** Fetch multiple profile records with robust query filters such as `gender`, `country_id`, `min_age`, `max_age`, `sort_by` and more.
- **Natural Language Parsing:** Search profile records using powerful conversational string queries like *"young females from Canada"* or *"males older than 25"*.
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

### 2. Get Profiles (with dynamic filters)
- **GET** `/api/profiles`
- **Query Parameters (Optional):** `gender` (male/female), `country_id`, `age_group`, `min_age`, `max_age`, `min_gender_probability`, `min_country_probability`, `sort_by`, `order`, `page`, `limit`.
- **Example Usage:** `/api/profiles?gender=female&age_group=adult&sort_by=age&order=desc`

### 3. Search Profiles (Natural Language)
- **GET** `/api/profiles/search?q=your query`
- **Query Parameter:** `q` (The natural language query string)
- **Example Usage:** `/api/profiles/search?q=male adults older than 25 from France`

---

## 🔍 Parser Approach

The natural language search endpoint (`/api/profiles/search`) processes textual queries (e.g., "young females from Canada") by breaking them down into searchable database parameters. The approach uses a **Keyword Extraction & Regex Matching** strategy: 

1. **Tokenization:** The user query `q` is split into individual tokens based on whitespace.
2. **Dictionary Matching:** 
   - **Gender:** Iterates through words to find matches against a pre-defined `GENDER_MAP` containing synonyms like "boy", "men", "females", etc. It intelligently drops gender filters if contradictory phrases like "men and women" are detected.
   - **Age Groups:** Uses an `AGE_GROUP_MAP` to translate words like "young", "youth", "teenager", "seniors", "elderly" into specific `age_group` string categories or explicit `[min_age, max_age]` tuples. 
   - **Country:** Capitalizes keywords and matches them against a locally imported dataset of recognizable countries.
3. **Regex Pattern Recognition:** Extracts specific relational age boundaries using grouped regular expressions:
   - `/(above|over|older than|at least) (\d+)/` -> Translates to `>=`, `>` SQL operations.
   - `/(below|under|younger than|at most) (\d+)/` -> Translates to `<=`, `<` SQL operations.
   - `/aged (\d+)/` -> Translates to exact `=` SQL operation.
4. **SQL Query Generation:** Compiles the successfully extracted parameters into an optimized Sequelize SQL query using `Op` operators.

---

## ⚠️ Limitations

While the regex and keyword-based parser is fast and addresses the majority of common profiling queries, it has several limitations inherent to stateless matching parsers:

1. **Lack of NLP Context (No True Understanding):** The parser operates on keyword presence rather than semantic context or negations. A query like *"people who are not male"* will misinterpret "male" as the target and ignore the "not", returning the exact opposite of the user's intent.
2. **Strict Spacing & Multi-Word Countries:** Since tokenization splits strictly by single whitespaces (`\s+`), multi-word entity names (e.g., "United States", "New Zealand") or hyphenated parameters may not match the dictionary properly because they are processed as detached tokens ("United" and "States").
3. **Single Filter Constraint:** Due to the loop-breaking optimization (`break;`), the parser stops at the **first matching token** for each demographic category. Asking for *"males from Canada and Germany"* will only apply the geographic filter for the first match ("Canada"). 
4. **Rigid Syntax for Numbers:** Phrases like *"aged twenty"* won't be processed accurately because the regex explicitly looks for numeric digits (`\d+`) rather than spelled-out numeric strings.
5. **Exact Match Vulnerability:** Misspellings, geographical abbreviations (e.g., "US", "UK"), or varied capitalizations in countries that fall outside the explicitly defined dataset format will fail to be recognized as filters.
