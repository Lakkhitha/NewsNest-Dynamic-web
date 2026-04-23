import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { db } from "../src/db/knex.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  const sqlPath = path.join(__dirname, "../src/db/schema.sql");
  const sql = fs.readFileSync(sqlPath, "utf8");

  try {
    await db.raw(sql);
    console.log("Schema migrated successfully.");
  } catch (error) {
    console.error("Migration failed:", error.message);
    process.exitCode = 1;
  } finally {
    await db.destroy();
  }
}

run();
