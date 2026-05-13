import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";

const JWT_SECRET = process.env.JWT_SECRET || "newsnest-dev-secret";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || "";
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

export type JwtUser = {
  id: number;
  email: string;
  role: string;
  name: string;
};

export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

export function createReadingTime(content: string) {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 180));
}

export function createTrendingScore(content: string, featured: number, breaking: number) {
  const lengthBonus = Math.min(45, Math.round(content.length / 60));
  return 35 + lengthBonus + featured * 30 + breaking * 20;
}

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  const candidate = crypto.scryptSync(password, salt, 64);
  const actual = Buffer.from(hash, "hex");
  return candidate.length === actual.length && crypto.timingSafeEqual(candidate, actual);
}

export function signToken(user: JwtUser) {
  return jwt.sign(user, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string) {
  return jwt.verify(token, JWT_SECRET) as JwtUser;
}

export async function verifyGoogleCredential(credential: string) {
  if (!googleClient) {
    throw new Error("Google sign-in is not configured");
  }
  const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID });
  const payload = ticket.getPayload();
  if (!payload?.email || !payload.sub) {
    throw new Error("Invalid Google credential");
  }
  return {
    googleSub: payload.sub,
    email: payload.email.toLowerCase(),
    name: payload.name || payload.given_name || "Google User",
    avatarUrl: payload.picture || "",
  };
}
