import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { db } from "../db/knex.js";

export async function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = auth.slice(7);
  try {
    const payload = jwt.verify(token, env.jwtSecret);
    const user = await db("users")
      .where({ id: payload.id })
      .first("id", "name", "email", "role");

    if (!user) {
      return res.status(401).json({ message: "Account not found" });
    }

    if (user.role === "suspended") {
      return res.status(403).json({ message: "Account suspended. Contact admin." });
    }

    req.user = {
      id: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
    };
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}

