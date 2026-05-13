import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const dataDir = path.resolve(process.cwd(), "data");
const dbPath = path.join(dataDir, "newsnest.sqlite");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

function getTableColumns(tableName: string) {
  const rows = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
  return new Set(rows.map((row) => row.name));
}

function ensureColumn(tableName: string, columnName: string, columnDefinition: string) {
  const columns = getTableColumns(tableName);
  if (!columns.has(columnName)) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnDefinition}`);
  }
}

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      passwordHash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'writer',
      provider TEXT NOT NULL DEFAULT 'local',
      googleSub TEXT NOT NULL DEFAULT '',
      bio TEXT DEFAULT '',
      avatarUrl TEXT DEFAULT '',
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      description TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      excerpt TEXT NOT NULL,
      content TEXT NOT NULL,
      imageUrl TEXT DEFAULT '',
      categoryId INTEGER NOT NULL,
      authorId INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      featured INTEGER NOT NULL DEFAULT 0,
      breaking INTEGER NOT NULL DEFAULT 0,
      alertLevel TEXT NOT NULL DEFAULT '',
      sourceName TEXT NOT NULL DEFAULT '',
      verifiedPublisher INTEGER NOT NULL DEFAULT 0,
      trustScore INTEGER NOT NULL DEFAULT 72,
      views INTEGER NOT NULL DEFAULT 0,
      trendingScore INTEGER NOT NULL DEFAULT 50,
      readingTime INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      publishedAt TEXT,
      FOREIGN KEY(categoryId) REFERENCES categories(id),
      FOREIGN KEY(authorId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS article_tags (
      articleId INTEGER NOT NULL,
      tagId INTEGER NOT NULL,
      PRIMARY KEY (articleId, tagId),
      FOREIGN KEY(articleId) REFERENCES articles(id) ON DELETE CASCADE,
      FOREIGN KEY(tagId) REFERENCES tags(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      articleId INTEGER NOT NULL,
      userId INTEGER NOT NULL,
      content TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'approved',
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(articleId) REFERENCES articles(id) ON DELETE CASCADE,
      FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS bookmarks (
      userId INTEGER NOT NULL,
      articleId INTEGER NOT NULL,
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (userId, articleId),
      FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(articleId) REFERENCES articles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_category_preferences (
      userId INTEGER NOT NULL,
      categoryId INTEGER NOT NULL,
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (userId, categoryId),
      FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(categoryId) REFERENCES categories(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS newsletter_subscribers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      name TEXT DEFAULT '',
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS contact_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  ensureColumn("users", "provider", "provider TEXT NOT NULL DEFAULT 'local'");
  ensureColumn("users", "googleSub", "googleSub TEXT NOT NULL DEFAULT ''");

  ensureColumn("articles", "alertLevel", "alertLevel TEXT NOT NULL DEFAULT ''");
  ensureColumn("articles", "sourceName", "sourceName TEXT NOT NULL DEFAULT ''");
  ensureColumn("articles", "verifiedPublisher", "verifiedPublisher INTEGER NOT NULL DEFAULT 0");
  ensureColumn("articles", "trustScore", "trustScore INTEGER NOT NULL DEFAULT 72");

  db.exec(`
    UPDATE articles
    SET
      sourceName = COALESCE(NULLIF(sourceName, ''), (SELECT name FROM users WHERE users.id = articles.authorId)),
      verifiedPublisher = CASE
        WHEN verifiedPublisher = 1 THEN 1
        WHEN authorId IN (SELECT id FROM users WHERE role = 'super_admin') THEN 1
        ELSE 0
      END,
      alertLevel = CASE
        WHEN alertLevel != '' THEN alertLevel
        WHEN lower(title) LIKE '%emergency%' OR lower(content) LIKE '%emergency%' THEN 'emergency'
        WHEN lower(title) LIKE '%traffic%' OR lower(content) LIKE '%traffic%' THEN 'traffic'
        WHEN breaking = 1 THEN 'breaking'
        ELSE ''
      END,
      trustScore = CASE
        WHEN trustScore != 72 THEN trustScore
        WHEN verifiedPublisher = 1 OR authorId IN (SELECT id FROM users WHERE role = 'super_admin') THEN 88
        WHEN breaking = 1 THEN 81
        ELSE 70
      END
  `);
}
