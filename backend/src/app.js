import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import authRoutes from "./modules/auth/auth.routes.js";
import postRoutes from "./modules/posts/posts.routes.js";
import socialRoutes from "./modules/social/social.routes.js";
import feedRoutes from "./modules/feed/feed.routes.js";
import adminRoutes from "./modules/admin/admin.routes.js";
import usersRoutes from "./modules/users/users.routes.js";
import messagesRoutes from "./modules/messages/messages.routes.js";
import analyticsRoutes from "./modules/analytics/analytics.routes.js";
import { authLimiter, writeLimiter } from "./middlewares/rateLimit.js";

export const app = express();



/**
 * Health check endpoint - returns service status and basic diagnostics.
 * @route GET /api/health
 */
app.get("/api/health", (_req, res) => {
  res.json({ 
    status: "ok",
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || "development"
  });
});

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/posts", writeLimiter, postRoutes);
app.use("/api/social", writeLimiter, socialRoutes);
app.use("/api/feed", feedRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/messages", writeLimiter, messagesRoutes);
app.use("/api/analytics", analyticsRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);

  if (err?.code === "ECONNREFUSED" && err?.port === 5432) {
    return res.status(503).json({
      message: "Database unavailable. Start PostgreSQL and run migrations/seeds.",
      code: "DB_UNAVAILABLE",
    });
  }

  res.status(500).json({ message: "Internal server error", code: "INTERNAL_ERROR" });
});
