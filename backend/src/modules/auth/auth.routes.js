import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { db } from "../../db/knex.js";
import { env } from "../../config/env.js";
import { requireAuth } from "../../middlewares/auth.js";

const router = Router();

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

router.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid payload", errors: parsed.error.flatten() });
  }

  const { name, email, password } = parsed.data;
  const normalizedEmail = email.trim().toLowerCase();
  const existing = await db("users").whereRaw("LOWER(email) = ?", [normalizedEmail]).first();
  if (existing) {
    return res.status(409).json({ message: "Email already in use" });
  }

  const password_hash = await bcrypt.hash(password, 10);
  const [user] = await db("users")
    .insert({ name, email: normalizedEmail, password_hash, role: "user" })
    .returning(["id", "name", "email", "role"]);

  const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, env.jwtSecret, {
    expiresIn: "7d",
  });

  return res.status(201).json({ token, user });
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid payload", errors: parsed.error.flatten() });
  }

  const { email, password } = parsed.data;
  const normalizedEmail = email.trim().toLowerCase();
  const user = await db("users").whereRaw("LOWER(email) = ?", [normalizedEmail]).first();
  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  if (user.role === "suspended") {
    return res.status(403).json({ message: "Account suspended. Contact admin." });
  }

  const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, env.jwtSecret, {
    expiresIn: "7d",
  });

  return res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
});

router.get("/me", requireAuth, async (req, res) => {
  const user = await db("users")
    .where({ id: req.user.id })
    .first("id", "name", "email", "role", "bio", "avatar_url", "created_at");

  return res.json(user);
});

export default router;
