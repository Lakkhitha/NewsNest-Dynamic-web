import { app } from "./app.js";
import { env, validateEnvironment } from "./config/env.js";

validateEnvironment({ strict: env.nodeEnv === "production" });

app.listen(env.port, () => {
  console.log(`NewsNest API running on http://localhost:${env.port}`);
});
