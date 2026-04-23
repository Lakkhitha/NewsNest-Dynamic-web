import { env, validateEnvironment } from "../src/config/env.js";

const strict = env.nodeEnv === "production" || process.env.REQUIRE_STRICT_ENV === "1";

try {
  validateEnvironment({ strict });
  console.log(`Environment validation completed (${strict ? "strict" : "warn"} mode).`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
