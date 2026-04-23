import rateLimit from "express-rate-limit";

export const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many authentication attempts. Please try again later.",
    code: "RATE_LIMITED_AUTH",
  },
});

export const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => ["GET", "HEAD", "OPTIONS"].includes(req.method),
  message: {
    message: "Too many write actions. Please slow down and try again.",
    code: "RATE_LIMITED_WRITE",
  },
});
