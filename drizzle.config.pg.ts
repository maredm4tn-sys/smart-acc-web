import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config();

export default defineConfig({
    dialect: "postgresql",
    schema: "./src/db/schema.pg.ts",
    out: "./drizzle/pg",
    dbCredentials: {
        url: process.env.POSTGRES_URL || process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/smart_acc",
    },
});
