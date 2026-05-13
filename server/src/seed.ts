import { db } from "./db";
import { createReadingTime, createTrendingScore, hashPassword, slugify } from "./auth";

type SeedArticle = {
  title: string;
  excerpt: string;
  content: string;
  category: string;
  tags: string[];
  authorEmail: string;
  imageUrl: string;
  featured?: number;
  breaking?: number;
  status?: string;
  alertLevel?: string;
  sourceName?: string;
  verifiedPublisher?: number;
  trustScore?: number;
};

const categories = [
  ["World", "Global politics, diplomacy, and major events."],
  ["Politics", "Elections, policy, and government decisions."],
  ["Weather", "Forecasts, severe alerts, and climate updates."],
  ["Tech", "New software, devices, and digital culture."],
  ["Business", "Markets, entrepreneurship, and finance."],
  ["Sports", "Matches, athletes, and competition."],
  ["Culture", "Arts, media, and lifestyle stories."],
  ["Science", "Research, climate, and discovery."],
] as const;

const tags = ["breaking", "featured", "opinion", "startup", "innovation", "analysis", "exclusive", "community", "ai", "economy", "verified", "emergency", "traffic"];

const articles: SeedArticle[] = [
  {
    title: "City Labs launch a digital newsroom built for the next decade",
    excerpt: "An editorial platform with immersive visuals, faster publishing, and a stronger moderation model.",
    content: "NewsNest is a newsroom experience designed around clarity, speed, and trust. Editors can review submissions, writers can draft stories, and readers get a rich feed with featured stories, breaking alerts, and personalized bookmarks.",
    category: "Tech",
    tags: ["featured", "innovation", "ai"],
    authorEmail: "admin@newsnest.local",
    imageUrl: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80",
    featured: 1,
    breaking: 1,
    status: "published",
    sourceName: "City Labs Desk",
    verifiedPublisher: 1,
    trustScore: 96,
  },
  {
    title: "Regional trade ministers agree on a fresh mobility framework",
    excerpt: "Negotiators reached a new agreement aimed at simplifying cross-border movement and commerce.",
    content: "Officials described the deal as a practical step toward smoother trade routes and lower friction for local businesses. The agreement now heads to legal review before implementation.",
    category: "Politics",
    tags: ["breaking", "analysis"],
    authorEmail: "mira.writer@newsnest.local",
    imageUrl: "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?auto=format&fit=crop&w=1200&q=80",
    featured: 1,
    breaking: 1,
    status: "published",
    sourceName: "Parliament Wire",
    verifiedPublisher: 1,
    trustScore: 91,
  },
  {
    title: "Emergency traffic alert issued after tunnel closure on the coastal bypass",
    excerpt: "Drivers are being rerouted after a late-night incident forced an emergency lane closure.",
    content: "Traffic authorities have asked commuters to avoid the coastal bypass until engineers complete their inspection. Emergency crews are coordinating a rapid response and alternate routes are now active.",
    category: "Weather",
    tags: ["breaking", "emergency", "traffic"],
    authorEmail: "newsnest.super@newsnest.local",
    imageUrl: "https://images.unsplash.com/photo-1493238792000-8113da705763?auto=format&fit=crop&w=1200&q=80",
    featured: 1,
    breaking: 1,
    status: "published",
    alertLevel: "emergency",
    sourceName: "National Traffic Authority",
    verifiedPublisher: 1,
    trustScore: 98,
  },
  {
    title: "Local founders use AI to reshape student research workflows",
    excerpt: "A new startup is helping students summarize sources, organize notes, and move faster through coursework.",
    content: "The platform blends document extraction with concise summary cards and project boards. Founders say the goal is to reduce repetitive work without replacing critical thinking.",
    category: "Business",
    tags: ["startup", "ai", "exclusive"],
    authorEmail: "mira.writer@newsnest.local",
    imageUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
    featured: 0,
    breaking: 0,
    status: "published",
    sourceName: "Startup Desk",
    verifiedPublisher: 0,
    trustScore: 73,
  },
  {
    title: "Researchers uncover a cleaner method for coastal monitoring",
    excerpt: "The approach could improve early warnings for environmental shifts along busy shorelines.",
    content: "Scientists deployed a low-cost monitoring system that combines sensors, imagery, and local reporting. The model makes it easier to observe changes at scale.",
    category: "Science",
    tags: ["analysis", "community"],
    authorEmail: "admin@newsnest.local",
    imageUrl: "https://images.unsplash.com/photo-1507413245164-6160d8298b31?auto=format&fit=crop&w=1200&q=80",
    status: "published",
    sourceName: "Science Review",
    verifiedPublisher: 1,
    trustScore: 88,
  },
  {
    title: "Designers are bringing magazine pacing back to digital media",
    excerpt: "Editors are mixing cinematic layouts, bold type, and structured reading lanes to slow the scroll.",
    content: "The new wave of newsroom design emphasizes rhythm and editorial hierarchy. Motion, texture, and story pacing now matter as much as the article itself.",
    category: "Culture",
    tags: ["featured", "opinion"],
    authorEmail: "mira.writer@newsnest.local",
    imageUrl: "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1200&q=80",
    featured: 1,
    status: "published",
    sourceName: "Culture Report",
    verifiedPublisher: 0,
    trustScore: 79,
  },
  {
    title: "Championship clubs lean into data-led squad planning",
    excerpt: "Teams are using visual dashboards to track recovery, form, and performance windows.",
    content: "Coaches say the best decisions now combine instinct with structured insights. The reporting pipeline mirrors that shift with cleaner, more immediate dashboards.",
    category: "Sports",
    tags: ["analysis"],
    authorEmail: "admin@newsnest.local",
    imageUrl: "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=1200&q=80",
    breaking: 1,
    status: "published",
    sourceName: "Sports Daily",
    verifiedPublisher: 1,
    trustScore: 90,
  },
  {
    title: "Student journalist submits first report through NewsNest workflow",
    excerpt: "The moderation queue lets contributors draft stories before they go live on the feed.",
    content: "This report is still pending review. The dashboard allows an editor to approve, publish, reject, or remove the submission in a single view.",
    category: "World",
    tags: ["community"],
    authorEmail: "sam.writer@newsnest.local",
    imageUrl: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80",
    status: "pending",
    sourceName: "Campus Reporter",
    verifiedPublisher: 0,
    trustScore: 64,
  },
];

export function seedDatabase() {
  const insertCategory = db.prepare("INSERT OR IGNORE INTO categories (name, slug, description) VALUES (?, ?, ?)");
  categories.forEach(([name, description]) => insertCategory.run(name, slugify(name), description));

  const insertTag = db.prepare("INSERT OR IGNORE INTO tags (name, slug) VALUES (?, ?)");
  tags.forEach((tag) => insertTag.run(tag, slugify(tag)));

  const upsertUser = db.prepare(
    `INSERT INTO users (name, email, passwordHash, role, provider, googleSub, bio, avatarUrl)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(email) DO UPDATE SET
       name = excluded.name,
       passwordHash = excluded.passwordHash,
       role = excluded.role,
       provider = excluded.provider,
       googleSub = excluded.googleSub,
       bio = excluded.bio,
       avatarUrl = excluded.avatarUrl`
  );
  upsertUser.run("NewsNest Super Admin", "admin@newsnest.local", hashPassword("Admin123!"), "super_admin", "local", "", "Chief editor and platform administrator.", "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80");
  upsertUser.run("Mira Patel", "mira.writer@newsnest.local", hashPassword("Writer123!"), "editor", "local", "", "Senior reporter covering tech, business, and culture.", "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80");
  upsertUser.run("Sam Lewis", "sam.writer@newsnest.local", hashPassword("Writer123!"), "writer", "local", "", "Campus contributor and field reporter.", "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80");
  upsertUser.run("NewsNest News Bot", "newsnest.super@newsnest.local", hashPassword("Writer123!"), "admin", "local", "", "Traffic and emergency bulletin account.", "https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=400&q=80");

  const categoryIdBySlug = new Map((db.prepare("SELECT id, slug FROM categories").all() as Array<{ id: number; slug: string }>).map((row) => [row.slug, row.id]));
  const tagIdBySlug = new Map((db.prepare("SELECT id, slug FROM tags").all() as Array<{ id: number; slug: string }>).map((row) => [row.slug, row.id]));
  const userIdByEmail = new Map((db.prepare("SELECT id, email FROM users").all() as Array<{ id: number; email: string }>).map((row) => [row.email, row.id]));

  const upsertArticle = db.prepare(`
    INSERT INTO articles
      (slug, title, excerpt, content, imageUrl, categoryId, authorId, status, featured, breaking, alertLevel, sourceName, verifiedPublisher, trustScore, views, trendingScore, readingTime, publishedAt)
    VALUES
      (@slug, @title, @excerpt, @content, @imageUrl, @categoryId, @authorId, @status, @featured, @breaking, @alertLevel, @sourceName, @verifiedPublisher, @trustScore, @views, @trendingScore, @readingTime, @publishedAt)
    ON CONFLICT(slug) DO UPDATE SET
      title = excluded.title,
      excerpt = excluded.excerpt,
      content = excluded.content,
      imageUrl = excluded.imageUrl,
      categoryId = excluded.categoryId,
      authorId = excluded.authorId,
      status = excluded.status,
      featured = excluded.featured,
      breaking = excluded.breaking,
      alertLevel = excluded.alertLevel,
      sourceName = excluded.sourceName,
      verifiedPublisher = excluded.verifiedPublisher,
      trustScore = excluded.trustScore,
      trendingScore = excluded.trendingScore,
      readingTime = excluded.readingTime,
      publishedAt = excluded.publishedAt,
      updatedAt = CURRENT_TIMESTAMP
  `);
  const insertArticleTag = db.prepare("INSERT INTO article_tags (articleId, tagId) VALUES (?, ?)");

  articles.forEach((article) => {
    const articleSlug = slugify(article.title);
    const readingTime = createReadingTime(article.content);
    const trendingScore = createTrendingScore(article.content, article.featured || 0, article.breaking || 0);
    upsertArticle.run({
      slug: articleSlug,
      title: article.title,
      excerpt: article.excerpt,
      content: article.content,
      imageUrl: article.imageUrl,
      categoryId: categoryIdBySlug.get(slugify(article.category)) || 1,
      authorId: userIdByEmail.get(article.authorEmail) || 1,
      status: article.status || "pending",
      featured: article.featured || 0,
      breaking: article.breaking || 0,
      alertLevel: article.alertLevel || "",
      sourceName: article.sourceName || article.authorEmail,
      verifiedPublisher: article.verifiedPublisher || 0,
      trustScore: article.trustScore || 72,
      views: Math.max(18, trendingScore * 2),
      trendingScore,
      readingTime,
      publishedAt: article.status === "published" ? new Date().toISOString() : null,
    });
    const articleIdRow = db.prepare("SELECT id FROM articles WHERE slug = ?").get(articleSlug) as { id: number } | undefined;
    if (articleIdRow) {
      db.prepare("DELETE FROM article_tags WHERE articleId = ?").run(articleIdRow.id);
      article.tags.forEach((tag) => insertArticleTag.run(articleIdRow.id, tagIdBySlug.get(slugify(tag)) || 1));
    }
  });

  const firstArticleId = db.prepare("SELECT id FROM articles ORDER BY id LIMIT 1").get() as { id: number } | undefined;
  const secondArticleId = db.prepare("SELECT id FROM articles ORDER BY id LIMIT 1 OFFSET 1").get() as { id: number } | undefined;
  const samUserId = userIdByEmail.get("sam.writer@newsnest.local") || 1;
  const miraUserId = userIdByEmail.get("mira.writer@newsnest.local") || 1;

  if (firstArticleId) {
    db.prepare("DELETE FROM comments WHERE articleId = ?").run(firstArticleId.id);
    db.prepare("INSERT INTO comments (articleId, userId, content, status) VALUES (?, ?, ?, 'approved')").run(firstArticleId.id, samUserId, "The dashboard-friendly moderation flow makes this feel like a real newsroom product.");
    db.prepare("INSERT INTO comments (articleId, userId, content, status) VALUES (?, ?, ?, 'approved')").run(firstArticleId.id, miraUserId, "Strong editorial direction. The ticker and hero layout give it presence.");
  }

  if (secondArticleId) {
    db.prepare("DELETE FROM bookmarks WHERE userId = ? AND articleId = ?").run(miraUserId, secondArticleId.id);
    db.prepare("INSERT INTO bookmarks (userId, articleId) VALUES (?, ?)").run(miraUserId, secondArticleId.id);
  }

  const adminUserId = userIdByEmail.get("admin@newsnest.local");
  const miraUserIdResolved = userIdByEmail.get("mira.writer@newsnest.local");
  const samUserIdResolved = userIdByEmail.get("sam.writer@newsnest.local");
  const politicsCategoryId = categoryIdBySlug.get(slugify("Politics"));
  const weatherCategoryId = categoryIdBySlug.get(slugify("Weather"));
  if (adminUserId && politicsCategoryId) {
    db.prepare("INSERT OR IGNORE INTO user_category_preferences (userId, categoryId) VALUES (?, ?)").run(adminUserId, politicsCategoryId);
  }
  if (miraUserIdResolved && weatherCategoryId) {
    db.prepare("INSERT OR IGNORE INTO user_category_preferences (userId, categoryId) VALUES (?, ?)").run(miraUserIdResolved, weatherCategoryId);
  }
  if (samUserIdResolved) {
    const sportsCategoryId = categoryIdBySlug.get(slugify("Sports"));
    if (sportsCategoryId) {
      db.prepare("INSERT OR IGNORE INTO user_category_preferences (userId, categoryId) VALUES (?, ?)").run(samUserIdResolved, sportsCategoryId);
    }
  }

  db.prepare("INSERT OR IGNORE INTO newsletter_subscribers (email, name) VALUES (?, ?)").run("reader@newsnest.local", "Avid Reader");
}
