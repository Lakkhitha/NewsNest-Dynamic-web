import { db } from "./db";
import { slugify, createReadingTime, createTrendingScore } from "./auth";

type NewsApiArticle = {
  source: { id: string | null; name: string };
  author: string | null;
  title: string;
  description: string | null;
  url: string;
  urlToImage: string | null;
  publishedAt: string | null;
  content: string | null;
};

function detectCategoryFromTitle(title: string) {
  const t = title.toLowerCase();
  if (/politic|election|government|senate|parliament/.test(t)) return "Politics";
  if (/weather|storm|rain|flood|hurricane|tornado|climate/.test(t)) return "Weather";
  if (/tech|startup|software|ai|google|microsoft|apple|meta|amazon/.test(t)) return "Tech";
  if (/market|business|economy|finance|startup|funding/.test(t)) return "Business";
  if (/sport|match|league|coach|tournament|championship/.test(t)) return "Sports";
  if (/research|science|study|university|laboratory/.test(t)) return "Science";
  if (/culture|movie|music|festival|design|magazine/.test(t)) return "Culture";
  return "World";
}

export async function importFromNewsApi(apiKey: string, pageSize = 12) {
  if (!apiKey) throw new Error("Missing NewsAPI key");
  const url = `https://newsapi.org/v2/top-headlines?language=en&pageSize=${pageSize}`;
  const res = await fetch(url, { headers: { Authorization: apiKey } });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`NewsAPI error: ${res.status} ${text}`);
  }
  const payload = await res.json();
  const items: NewsApiArticle[] = Array.isArray(payload.articles) ? payload.articles : [];

  const categoryIdBySlug = new Map((db.prepare("SELECT id, slug FROM categories").all() as Array<{ id: number; slug: string }>).map((row) => [row.slug, row.id]));
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

  const insertArticleTag = db.prepare("INSERT OR IGNORE INTO article_tags (articleId, tagId) VALUES (?, ?)");

  // use NewsBot user if present
  const newsBotId = userIdByEmail.get("newsnest.super@newsnest.local") || userIdByEmail.get("admin@newsnest.local") || 1;

  for (const a of items) {
    try {
      const title = a.title || "Untitled";
      const slug = slugify(title + (a.publishedAt || ""));
      const content = a.content || a.description || "";
      const excerpt = a.description || (content.substring(0, 200) + "...") || "";
      const categoryName = detectCategoryFromTitle(title);
      const categoryId = categoryIdBySlug.get(slugify(categoryName)) || 1;
      const readingTime = createReadingTime(content || "");
      const trendingScore = createTrendingScore(content || "", 0, 0);
      const trustScore = 72;

      upsertArticle.run({
        slug,
        title,
        excerpt,
        content,
        imageUrl: a.urlToImage || "",
        categoryId,
        authorId: newsBotId,
        status: "published",
        featured: 0,
        breaking: 0,
        alertLevel: "",
        sourceName: a.source?.name || "NewsAPI",
        verifiedPublisher: 0,
        trustScore,
        views: Math.max(10, trendingScore * 2),
        trendingScore,
        readingTime,
        publishedAt: a.publishedAt || new Date().toISOString(),
      });

      const articleRow = db.prepare("SELECT id FROM articles WHERE slug = ?").get(slug) as { id: number } | undefined;
      if (articleRow) {
        // tag the article as newsapi
        const tagRow = db.prepare("SELECT id FROM tags WHERE slug = ?").get("newsapi");
        let tagId = tagRow ? tagRow.id : null;
        if (!tagId) {
          const info = db.prepare("INSERT INTO tags (name, slug) VALUES (?, ?)").run("NewsAPI", "newsapi");
          tagId = Number(info.lastInsertRowid);
        }
        insertArticleTag.run(articleRow.id, tagId);
      }
    } catch (err) {
      // continue on per-article errors
      console.error("Import article error:", err instanceof Error ? err.message : err);
    }
  }

  return { imported: items.length };
}
