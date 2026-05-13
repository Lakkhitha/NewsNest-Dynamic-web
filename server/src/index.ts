import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import { db, initDb } from "./db";
import { seedDatabase } from "./seed";
import { importFromNewsApi } from "./newsapi";
import { hashPassword, signToken, slugify, verifyGoogleCredential, verifyPassword, verifyToken, type JwtUser } from "./auth";

initDb();
seedDatabase();
// optionally import from NewsAPI on startup if env var is defined
if (process.env.NEWSAPI_KEY) {
  (async () => {
    try {
      console.log("Importing news from NewsAPI...");
      const result = await importFromNewsApi(process.env.NEWSAPI_KEY as string, 12);
      console.log("NewsAPI import result:", result);
    } catch (err) {
      console.warn("NewsAPI import failed:", err instanceof Error ? err.message : err);
    }
  })();
}

const app = express();
const port = Number(process.env.PORT || 4000);
const rootDir = path.resolve(process.cwd(), "..");
const uploadsDir = path.join(process.cwd(), "uploads");
const clientDist = path.join(rootDir, "client", "dist");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const safeName = `${Date.now()}-${file.originalname}`.replace(/[^a-zA-Z0-9._-]/g, "-");
    cb(null, safeName);
  },
});

const upload = multer({ storage });

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(uploadsDir));

type AuthedRequest = Request & { user?: JwtUser };

function getFavoriteCategories(userId: number) {
  return db
    .prepare(
      `SELECT c.id, c.name, c.slug, c.description
       FROM categories c
       INNER JOIN user_category_preferences ucp ON ucp.categoryId = c.id
       WHERE ucp.userId = ?
       ORDER BY c.name ASC`
    )
    .all(userId);
}

function getUserProfile(userId: number) {
  const row = db.prepare("SELECT id, name, email, role, bio, avatarUrl, provider, createdAt FROM users WHERE id = ?").get(userId) as any;
  if (!row) {
    return null;
  }
  return { ...row, favoriteCategories: getFavoriteCategories(userId) };
}

function isSuperAdmin(role?: string) {
  return role === "super_admin";
}

function articleWhereClause(user?: JwtUser) {
  if (user && isSuperAdmin(user.role)) {
    return "a.status IN ('published','approved')";
  }
  return "a.status IN ('published','approved')";
}

function toArticle(row: any) {
  const tags = db
    .prepare(
      `SELECT t.id, t.name, t.slug
       FROM tags t
       INNER JOIN article_tags at ON at.tagId = t.id
       WHERE at.articleId = ?
       ORDER BY t.name ASC`
    )
    .all(row.id);
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    content: row.content,
    imageUrl: row.imageUrl,
    status: row.status,
    featured: Boolean(row.featured),
    breaking: Boolean(row.breaking),
    views: row.views,
    trendingScore: row.trendingScore,
    readingTime: row.readingTime,
    trustScore: row.trustScore,
    verifiedPublisher: Boolean(row.verifiedPublisher),
    alertLevel: row.alertLevel,
    sourceName: row.sourceName,
    validityLabel: row.verifiedPublisher ? "Verified publisher" : row.trustScore >= 85 ? "Trusted source" : row.trustScore >= 65 ? "Reviewing source" : "Unverified source",
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    publishedAt: row.publishedAt,
    category: {
      id: row.categoryId,
      name: row.categoryName,
      slug: row.categorySlug,
      description: row.categoryDescription,
    },
    author: {
      id: row.authorId,
      name: row.authorName,
      email: row.authorEmail,
      role: row.authorRole,
      bio: row.authorBio,
      avatarUrl: row.authorAvatarUrl,
    },
    tags,
  };
}

function publicArticleSql(where = "", orderBy = "ORDER BY a.featured DESC, a.breaking DESC, a.publishedAt DESC, a.id DESC") {
  return `
    SELECT
      a.*,
      c.name AS categoryName,
      c.slug AS categorySlug,
      c.description AS categoryDescription,
      u.name AS authorName,
      u.email AS authorEmail,
      u.role AS authorRole,
      u.bio AS authorBio,
      u.avatarUrl AS authorAvatarUrl
    FROM articles a
    INNER JOIN categories c ON c.id = a.categoryId
    INNER JOIN users u ON u.id = a.authorId
    ${where}
    ${orderBy}
  `;
}

function authRequired(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing token" });
  }
  try {
    req.user = verifyToken(header.slice(7));
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}

function adminOnly(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.user || !isSuperAdmin(req.user.role)) {
    return res.status(403).json({ message: "Super admin access required" });
  }
  return next();
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, app: "NewsNest", time: new Date().toISOString() });
});

app.post("/api/auth/register", (req, res) => {
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  if (!name || !email || password.length < 8) {
    return res.status(400).json({ message: "Name, email, and an 8+ character password are required" });
  }
  const exists = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (exists) {
    return res.status(409).json({ message: "Email already exists" });
  }
  const role = String(req.body.role || "writer");
  const info = db
    .prepare("INSERT INTO users (name, email, passwordHash, role, provider, googleSub, bio, avatarUrl) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .run(name, email, hashPassword(password), role === "super_admin" ? "writer" : role, "local", "", "", "");
  const user = getUserProfile(Number(info.lastInsertRowid));
  if (!user) {
    return res.status(500).json({ message: "Could not create account" });
  }
  return res.json({ token: signToken({ id: user.id, name: user.name, email: user.email, role: user.role }), user });
});

app.post("/api/auth/login", (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const user = db.prepare("SELECT id, name, email, passwordHash, role FROM users WHERE email = ?").get(email) as any;
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ message: "Invalid credentials" });
  }
  const payload = { id: user.id, name: user.name, email: user.email, role: user.role };
  return res.json({ token: signToken(payload), user: payload });
});

app.post("/api/auth/google", async (req, res) => {
  try {
    const credential = String(req.body.credential || "").trim();
    if (!credential) {
      return res.status(400).json({ message: "Missing Google credential" });
    }
    const googleUser = await verifyGoogleCredential(credential);
    const existing = db.prepare("SELECT id, name, email, role FROM users WHERE email = ?").get(googleUser.email) as any;
    let userId: number;
    if (existing) {
      db.prepare("UPDATE users SET provider = 'google', googleSub = ?, avatarUrl = COALESCE(NULLIF(?, ''), avatarUrl), name = COALESCE(NULLIF(?, ''), name) WHERE id = ?").run(googleUser.googleSub, googleUser.avatarUrl, googleUser.name, existing.id);
      userId = existing.id;
    } else {
      const info = db
        .prepare("INSERT INTO users (name, email, passwordHash, role, provider, googleSub, bio, avatarUrl) VALUES (?, ?, ?, 'writer', 'google', ?, ?, ?)")
        .run(googleUser.name, googleUser.email, hashPassword(crypto.randomUUID()), googleUser.googleSub, "", googleUser.avatarUrl);
      userId = Number(info.lastInsertRowid);
    }
    const user = getUserProfile(userId);
    if (!user) {
      return res.status(500).json({ message: "Google login failed" });
    }
    return res.json({ token: signToken({ id: user.id, name: user.name, email: user.email, role: user.role }), user });
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "Google login failed" });
  }
});

app.post("/api/import/newsapi", async (req, res) => {
  try {
    const key = String(req.body.apiKey || req.query.apiKey || process.env.NEWSAPI_KEY || "").trim();
    if (!key) return res.status(400).json({ message: "Missing NewsAPI key (provide in body.apiKey or NEWSAPI_KEY env)" });
    const result = await importFromNewsApi(key, Number(req.body.pageSize || 12));
    return res.json({ ok: true, result });
  } catch (err) {
    return res.status(500).json({ message: err instanceof Error ? err.message : "Import failed" });
  }
});

app.get("/api/auth/me", authRequired, (req: AuthedRequest, res) => {
  const user = getUserProfile(req.user!.id);
  res.json({ user });
});

app.get("/api/me/preferences", authRequired, (req: AuthedRequest, res) => {
  res.json({ favoriteCategories: getFavoriteCategories(req.user!.id) });
});

app.put("/api/me/preferences", authRequired, (req: AuthedRequest, res) => {
  const categories = Array.isArray(req.body.categorySlugs) ? req.body.categorySlugs.map((slug: string) => String(slug).trim().toLowerCase()).filter(Boolean) : [];
  const categoryIds = categories.length
    ? db.prepare(`SELECT id FROM categories WHERE slug IN (${categories.map(() => "?").join(",")})`).all(...categories).map((row: any) => row.id)
    : [];
  const deleteExisting = db.prepare("DELETE FROM user_category_preferences WHERE userId = ?");
  deleteExisting.run(req.user!.id);
  const insertPreference = db.prepare("INSERT OR IGNORE INTO user_category_preferences (userId, categoryId) VALUES (?, ?)");
  categoryIds.forEach((categoryId: number) => insertPreference.run(req.user!.id, categoryId));
  res.json({ favoriteCategories: getFavoriteCategories(req.user!.id) });
});

app.get("/api/categories", (_req, res) => {
  res.json({ categories: db.prepare("SELECT * FROM categories ORDER BY name ASC").all() });
});

app.get("/api/home", (_req, res) => {
  const user = _req.headers.authorization?.startsWith("Bearer ") ? (() => {
    try {
      return verifyToken(_req.headers.authorization!.slice(7));
    } catch {
      return null;
    }
  })() : null;
  const favoriteCategories = user ? getFavoriteCategories(user.id) : [];
  const featured = db.prepare(publicArticleSql("WHERE a.status IN ('published','approved') AND a.featured = 1")).all().map(toArticle);
  const latest = db.prepare(publicArticleSql("WHERE a.status IN ('published','approved')")).all().map(toArticle).slice(0, 8);
  const trending = db.prepare(publicArticleSql("WHERE a.status IN ('published','approved')", "ORDER BY a.trendingScore DESC, a.views DESC, a.id DESC")).all().map(toArticle).slice(0, 5);
  const breaking = db.prepare(publicArticleSql("WHERE a.status IN ('published','approved') AND a.breaking = 1", "ORDER BY a.publishedAt DESC, a.id DESC")).all().map(toArticle).slice(0, 5);
  const categories = db.prepare("SELECT * FROM categories ORDER BY name ASC").all();
  const forYou = favoriteCategories.length
    ? db
        .prepare(
          `SELECT a.*, c.name AS categoryName, c.slug AS categorySlug, c.description AS categoryDescription, u.name AS authorName, u.email AS authorEmail, u.role AS authorRole, u.bio AS authorBio, u.avatarUrl AS authorAvatarUrl
           FROM articles a
           INNER JOIN categories c ON c.id = a.categoryId
           INNER JOIN users u ON u.id = a.authorId
           WHERE a.status IN ('published','approved') AND a.categoryId IN (${favoriteCategories.map(() => "?").join(",")})
           ORDER BY a.featured DESC, a.breaking DESC, a.trendingScore DESC, a.publishedAt DESC, a.id DESC`
        )
        .all(...favoriteCategories.map((category: any) => category.id))
        .map(toArticle)
        .slice(0, 6)
    : [];
  const alerts = db
    .prepare(publicArticleSql("WHERE a.status IN ('published','approved') AND a.alertLevel IN ('emergency','traffic','breaking')", "ORDER BY a.alertLevel DESC, a.publishedAt DESC, a.id DESC"))
    .all()
    .map(toArticle)
    .slice(0, 4);
  res.json({
    hero: forYou[0] || featured[0] || latest[0] || null,
    featured: featured.slice(0, 4),
    latest,
    trending,
    breaking,
    categories,
    forYou,
    alerts,
    favoriteCategories,
  });
});

app.get("/api/articles", (req, res) => {
  const category = String(req.query.category || "").trim().toLowerCase();
  const categories = String(req.query.categories || "").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
  const query = String(req.query.q || "").trim().toLowerCase();
  const params: any[] = [];
  const clauses = ["a.status IN ('published','approved')"];
  if (category) {
    clauses.push("c.slug = ?");
    params.push(category);
  }
  if (categories.length) {
    clauses.push(`c.slug IN (${categories.map(() => "?").join(",")})`);
    params.push(...categories);
  }
  if (query) {
    clauses.push("(lower(a.title) LIKE ? OR lower(a.excerpt) LIKE ? OR lower(a.content) LIKE ?)");
    params.push(`%${query}%`, `%${query}%`, `%${query}%`);
  }
  const rows = db.prepare(publicArticleSql(`WHERE ${clauses.join(" AND ")}`)).all(...params).map(toArticle);
  res.json({ articles: rows });
});

app.get("/api/categories/:slug", (req, res) => {
  const slug = String(req.params.slug || "").trim().toLowerCase();
  const category = db.prepare("SELECT * FROM categories WHERE slug = ?").get(slug);
  if (!category) {
    return res.status(404).json({ message: "Category not found" });
  }
  const articles = db.prepare(publicArticleSql("WHERE a.status IN ('published','approved') AND c.slug = ?")).all(slug).map(toArticle);
  res.json({ category, articles });
});

app.get("/api/articles/:slug", (req, res) => {
  const slug = String(req.params.slug || "").trim().toLowerCase();
  const row = db.prepare(publicArticleSql("WHERE a.slug = ?")).get(slug);
  if (!row) {
    return res.status(404).json({ message: "Article not found" });
  }
  db.prepare("UPDATE articles SET views = views + 1, trendingScore = trendingScore + 1 WHERE id = ?").run(row.id);
  const article = toArticle({ ...row, views: row.views + 1, trendingScore: row.trendingScore + 1 });
  const comments = db
    .prepare(
      `SELECT c.id, c.content, c.createdAt, u.id AS userId, u.name AS userName, u.avatarUrl AS userAvatarUrl
       FROM comments c
       INNER JOIN users u ON u.id = c.userId
       WHERE c.articleId = ? AND c.status = 'approved'
       ORDER BY c.createdAt DESC`
    )
    .all(row.id);
  const related = db
    .prepare(
      publicArticleSql(
        "WHERE a.status IN ('published','approved') AND a.categoryId = ? AND a.id != ?",
        "ORDER BY a.featured DESC, a.publishedAt DESC, a.id DESC"
      )
    )
    .all(row.categoryId, row.id)
    .map(toArticle)
    .slice(0, 3);
  res.json({ article, comments, related });
});

app.post("/api/newsletter", (req, res) => {
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }
  db.prepare("INSERT OR IGNORE INTO newsletter_subscribers (email, name) VALUES (?, ?)").run(email, name);
  res.json({ message: "Subscribed" });
});

app.get("/api/alerts", (_req, res) => {
  const alerts = db
    .prepare(publicArticleSql("WHERE a.status IN ('published','approved') AND a.alertLevel IN ('emergency','traffic','breaking')", "ORDER BY a.alertLevel DESC, a.publishedAt DESC, a.id DESC"))
    .all()
    .map(toArticle)
    .slice(0, 4);
  res.json({ alerts });
});

app.post("/api/contact", (req, res) => {
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").trim();
  const subject = String(req.body.subject || "").trim();
  const message = String(req.body.message || "").trim();
  if (!name || !email || !subject || !message) {
    return res.status(400).json({ message: "All contact fields are required" });
  }
  db.prepare("INSERT INTO contact_messages (name, email, subject, message) VALUES (?, ?, ?, ?)").run(name, email, subject, message);
  res.json({ message: "Message received" });
});

app.post("/api/articles", authRequired, upload.single("image"), (req: AuthedRequest, res) => {
  const title = String(req.body.title || "").trim();
  const excerpt = String(req.body.excerpt || "").trim();
  const content = String(req.body.content || "").trim();
  const categorySlug = String(req.body.categorySlug || "").trim().toLowerCase();
  const rawTags = String(req.body.tags || "").split(",").map((value) => value.trim()).filter(Boolean);
  const status = req.body.status === "draft" ? "draft" : isSuperAdmin(req.user?.role) ? "published" : "pending";
  if (!title || !excerpt || !content || !categorySlug) {
    return res.status(400).json({ message: "Title, excerpt, content, and category are required" });
  }
  const category = db.prepare("SELECT id FROM categories WHERE slug = ?").get(categorySlug) as { id: number } | undefined;
  if (!category) {
    return res.status(400).json({ message: "Invalid category" });
  }
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : String(req.body.imageUrl || "").trim();
  const slug = slugify(title);
  const readingTime = Math.max(1, Math.round(content.split(/\s+/).filter(Boolean).length / 180));
  const trendingScore = 45 + Math.min(40, Math.round(content.length / 70)) + (String(req.body.featured) === "1" ? 24 : 0) + (String(req.body.breaking) === "1" ? 14 : 0);
  const alertLevel = String(req.body.alertLevel || "").trim().toLowerCase();
  const sourceName = String(req.body.sourceName || req.user?.name || "").trim();
  const trustScore = Math.max(40, Math.min(99, Number(req.body.trustScore || (isSuperAdmin(req.user?.role) ? 90 : 72))));
  const verifiedPublisher = String(req.body.verifiedPublisher) === "1" || isSuperAdmin(req.user?.role) ? 1 : 0;
  const publishedAt = status === "published" ? new Date().toISOString() : null;
  const info = db
    .prepare(
      `INSERT INTO articles
        (slug, title, excerpt, content, imageUrl, categoryId, authorId, status, featured, breaking, alertLevel, sourceName, verifiedPublisher, trustScore, views, trendingScore, readingTime, publishedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      slug,
      title,
      excerpt,
      content,
      imageUrl,
      category.id,
      req.user!.id,
      status,
      String(req.body.featured) === "1" ? 1 : 0,
      String(req.body.breaking) === "1" ? 1 : 0,
      alertLevel,
      sourceName,
      verifiedPublisher,
      trustScore,
      0,
      trendingScore,
      readingTime,
      publishedAt
    );
  const articleId = Number(info.lastInsertRowid);
  rawTags.forEach((tagName) => {
    const tagSlug = slugify(tagName);
    const existing = db.prepare("SELECT id FROM tags WHERE slug = ?").get(tagSlug) as { id: number } | undefined;
    const tagId = existing?.id || Number(db.prepare("INSERT INTO tags (name, slug) VALUES (?, ?)").run(tagName, tagSlug).lastInsertRowid);
    db.prepare("INSERT OR IGNORE INTO article_tags (articleId, tagId) VALUES (?, ?)").run(articleId, tagId);
  });
  const row = db.prepare(publicArticleSql("WHERE a.id = ?")).get(articleId);
  res.json({ article: toArticle(row) });
});

app.patch("/api/articles/:id/status", authRequired, adminOnly, (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const status = String(req.body.status || "");
  if (!["draft", "pending", "approved", "published", "rejected", "removed"].includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }
  db.prepare("UPDATE articles SET status = ?, publishedAt = CASE WHEN ? IN ('approved','published') THEN COALESCE(publishedAt, CURRENT_TIMESTAMP) ELSE publishedAt END, updatedAt = CURRENT_TIMESTAMP WHERE id = ?").run(status, status, id);
  res.json({ ok: true });
});

app.patch("/api/articles/:id/feature", authRequired, adminOnly, (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const featured = String(req.body.featured) === "1" ? 1 : 0;
  db.prepare("UPDATE articles SET featured = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?").run(featured, id);
  res.json({ ok: true });
});

app.patch("/api/articles/:id", authRequired, (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare("SELECT id, authorId FROM articles WHERE id = ?").get(id) as { id: number; authorId: number } | undefined;
  if (!existing) {
    return res.status(404).json({ message: "Article not found" });
  }
  if (!req.user || (existing.authorId !== req.user.id && !isSuperAdmin(req.user.role))) {
    return res.status(403).json({ message: "You can only edit your own article" });
  }
  const title = String(req.body.title || "").trim();
  const excerpt = String(req.body.excerpt || "").trim();
  const content = String(req.body.content || "").trim();
  const categorySlug = String(req.body.categorySlug || "").trim().toLowerCase();
  const category = categorySlug ? (db.prepare("SELECT id FROM categories WHERE slug = ?").get(categorySlug) as { id: number } | undefined) : undefined;
  const changes: string[] = [];
  const params: any[] = [];
  if (title) {
    changes.push("title = ?");
    params.push(title);
  }
  if (excerpt) {
    changes.push("excerpt = ?");
    params.push(excerpt);
  }
  if (content) {
    changes.push("content = ?");
    params.push(content);
  }
  if (category) {
    changes.push("categoryId = ?");
    params.push(category.id);
  }
  if (changes.length) {
    changes.push("updatedAt = CURRENT_TIMESTAMP");
    db.prepare(`UPDATE articles SET ${changes.join(", ")} WHERE id = ?`).run(...params, id);
  }
  const row = db.prepare(publicArticleSql("WHERE a.id = ?")).get(id);
  res.json({ article: toArticle(row) });
});

app.delete("/api/articles/:id", authRequired, (req: AuthedRequest, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare("SELECT id, authorId FROM articles WHERE id = ?").get(id) as { id: number; authorId: number } | undefined;
  if (!existing) {
    return res.status(404).json({ message: "Article not found" });
  }
  if (!req.user || (existing.authorId !== req.user.id && !isSuperAdmin(req.user.role))) {
    return res.status(403).json({ message: "You can only delete your own article" });
  }
  db.prepare("DELETE FROM article_tags WHERE articleId = ?").run(id);
  db.prepare("DELETE FROM comments WHERE articleId = ?").run(id);
  db.prepare("DELETE FROM bookmarks WHERE articleId = ?").run(id);
  db.prepare("DELETE FROM articles WHERE id = ?").run(id);
  res.json({ ok: true });
});

app.post("/api/articles/:id/comments", authRequired, (req: AuthedRequest, res) => {
  const articleId = Number(req.params.id);
  const content = String(req.body.content || "").trim();
  if (!content) {
    return res.status(400).json({ message: "Comment content is required" });
  }
  db.prepare("INSERT INTO comments (articleId, userId, content, status) VALUES (?, ?, ?, 'approved')").run(articleId, req.user!.id, content);
  res.json({ ok: true });
});

app.post("/api/articles/:id/bookmark", authRequired, (req: AuthedRequest, res) => {
  const articleId = Number(req.params.id);
  const existing = db.prepare("SELECT 1 FROM bookmarks WHERE userId = ? AND articleId = ?").get(req.user!.id, articleId);
  if (existing) {
    db.prepare("DELETE FROM bookmarks WHERE userId = ? AND articleId = ?").run(req.user!.id, articleId);
    return res.json({ bookmarked: false });
  }
  db.prepare("INSERT INTO bookmarks (userId, articleId) VALUES (?, ?)").run(req.user!.id, articleId);
  return res.json({ bookmarked: true });
});

app.get("/api/me/bookmarks", authRequired, (req: AuthedRequest, res) => {
  const bookmarks = db
    .prepare(
      publicArticleSql(
        "INNER JOIN bookmarks b ON b.articleId = a.id WHERE b.userId = ?",
        "ORDER BY b.createdAt DESC"
      )
    )
    .all(req.user!.id)
    .map(toArticle);
  res.json({ bookmarks });
});

app.get("/api/dashboard/summary", authRequired, adminOnly, (_req: AuthedRequest, res) => {
  const role = _req.user?.role || "writer";
  const counts = (sql: string, params: any[] = []) => (db.prepare(sql).get(...params) as { count: number }).count;
  const isElevated = isSuperAdmin(role);
  const articleBaseWhere = isElevated ? "" : "WHERE a.authorId = ?";
  const articleParams = isElevated ? [] : [_req.user!.id];
  const commentBaseWhere = isElevated ? "" : "WHERE a.authorId = ?";
  const commentParams = isElevated ? [] : [_req.user!.id];
  const userRows = isElevated
    ? db.prepare("SELECT id, name, email, role, bio, avatarUrl, provider, createdAt FROM users ORDER BY createdAt DESC").all()
    : [db.prepare("SELECT id, name, email, role, bio, avatarUrl, provider, createdAt FROM users WHERE id = ?").get(_req.user!.id)];
  const writers = isElevated ? userRows : userRows.filter(Boolean);
  const topArticles = db.prepare(publicArticleSql(articleBaseWhere ? `${articleBaseWhere} AND a.status IN ('published','approved')` : "WHERE a.status IN ('published','approved')", "ORDER BY a.trendingScore DESC, a.views DESC")).all(...articleParams).map(toArticle).slice(0, 6);
  const submissions = db.prepare(publicArticleSql(articleBaseWhere ? `${articleBaseWhere} AND a.status = 'pending'` : "WHERE a.status = 'pending'", "ORDER BY a.createdAt DESC")).all(...articleParams).map(toArticle).slice(0, 10);
  const recentComments = db
    .prepare(
      `SELECT c.id, c.content, c.status, c.createdAt, a.title AS articleTitle, u.name AS userName
       FROM comments c
       INNER JOIN articles a ON a.id = c.articleId
       INNER JOIN users u ON u.id = c.userId
       ${commentBaseWhere ? `${commentBaseWhere} AND` : "WHERE"} a.status IN ('published','approved')
       ORDER BY c.createdAt DESC LIMIT 8`
    )
    .all(...commentParams);
  const userManagement = isElevated
    ? db.prepare("SELECT id, name, email, role, provider, createdAt FROM users ORDER BY createdAt DESC").all()
    : [];
  res.json({
    role,
    counts: {
      articles: isElevated ? counts("SELECT COUNT(*) as count FROM articles") : counts("SELECT COUNT(*) as count FROM articles WHERE authorId = ?", [_req.user!.id]),
      published: isElevated ? counts("SELECT COUNT(*) as count FROM articles WHERE status IN ('published','approved')") : counts("SELECT COUNT(*) as count FROM articles WHERE authorId = ? AND status IN ('published','approved')", [_req.user!.id]),
      pending: isElevated ? counts("SELECT COUNT(*) as count FROM articles WHERE status = 'pending'") : counts("SELECT COUNT(*) as count FROM articles WHERE authorId = ? AND status = 'pending'", [_req.user!.id]),
      users: isElevated ? counts("SELECT COUNT(*) as count FROM users") : 1,
      comments: isElevated ? counts("SELECT COUNT(*) as count FROM comments") : counts("SELECT COUNT(*) as count FROM comments c INNER JOIN articles a ON a.id = c.articleId WHERE a.authorId = ?", [_req.user!.id]),
      bookmarks: counts("SELECT COUNT(*) as count FROM bookmarks WHERE userId = ?", [_req.user!.id]),
    },
    topArticles,
    submissions,
    writers,
    recentComments,
    userManagement,
    favoriteCategories: getFavoriteCategories(_req.user!.id),
  });
});

app.get("/api/my/articles", authRequired, (req: AuthedRequest, res) => {
  const items = db.prepare(publicArticleSql("WHERE a.authorId = ?", "ORDER BY a.createdAt DESC")).all(req.user!.id).map(toArticle);
  res.json({ articles: items });
});

app.get("/api/admin/users", authRequired, (req: AuthedRequest, res) => {
  if (!isSuperAdmin(req.user?.role)) {
    return res.status(403).json({ message: "Super admin access required" });
  }
  const users = db.prepare("SELECT id, name, email, role, provider, createdAt FROM users ORDER BY createdAt DESC").all();
  res.json({ users });
});

app.patch("/api/admin/users/:id/role", authRequired, (req: AuthedRequest, res) => {
  if (!isSuperAdmin(req.user?.role)) {
    return res.status(403).json({ message: "Super admin access required" });
  }
  const id = Number(req.params.id);
  const role = String(req.body.role || "");
  if (!["writer", "editor", "admin", "super_admin"].includes(role)) {
    return res.status(400).json({ message: "Invalid role" });
  }
  if (id === req.user!.id && role !== "super_admin") {
    return res.status(400).json({ message: "You cannot demote yourself" });
  }
  db.prepare("UPDATE users SET role = ? WHERE id = ?").run(role, id);
  res.json({ ok: true });
});

app.post("/api/upload", authRequired, upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }
  res.json({ url: `/uploads/${req.file.filename}` });
});

app.use((req, res, next) => {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ message: "API route not found" });
  }
  return next();
});

if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/.*/, (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

app.listen(port, () => {
  console.log(`NewsNest server running on http://localhost:${port}`);
});
