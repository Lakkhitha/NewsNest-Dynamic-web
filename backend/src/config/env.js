import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || "development",
  jwtSecret: process.env.JWT_SECRET || "dev_secret_change_me",
  db: {
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
    database: process.env.DB_NAME || "newsnest",
  },
};

export function validateEnvironment({ strict = false } = {}) {
  const issues = [];

  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim().length < 12) {
    issues.push("JWT_SECRET is missing or too short (minimum 12 chars recommended).");
  }

  if (env.jwtSecret === "dev_secret_change_me") {
    issues.push("JWT_SECRET is still using the insecure default value.");
  }

  const requiredDbVars = ["DB_HOST", "DB_PORT", "DB_USER", "DB_PASSWORD", "DB_NAME"];
  for (const key of requiredDbVars) {
    if (!process.env[key]) {
      issues.push(`${key} is not explicitly set. Using fallback value.`);
    }
  }

  if (issues.length === 0) {
    return;
  }

  const message = `Environment validation issues:\n- ${issues.join("\n- ")}`;
  if (strict) {
    throw new Error(message);
  }

  console.warn(message);
}
