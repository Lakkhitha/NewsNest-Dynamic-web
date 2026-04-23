import { Router } from "express";
import { z } from "zod";
import { db } from "../../db/knex.js";
import { requireAuth } from "../../middlewares/auth.js";

const router = Router();

function readPagination(query, { defaultLimit, maxLimit }) {
  const parsedLimit = Number(query.limit || defaultLimit);
  const parsedPage = Number(query.page || 1);

  const limit = Number.isFinite(parsedLimit) ? Math.max(1, Math.min(maxLimit, Math.floor(parsedLimit))) : defaultLimit;
  const page = Number.isFinite(parsedPage) ? Math.max(1, Math.floor(parsedPage)) : 1;
  const offset = (page - 1) * limit;

  return { limit, page, offset };
}

const optionalUrl = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return value;
    }

    const trimmed = value.trim();
    return trimmed.length === 0 ? undefined : trimmed;
  },
  z.string().url().optional()
);

const postSchema = z.object({
  title: z.string().trim().min(8).max(220),
  body: z.string().trim().min(20).max(3000),
  source_url: optionalUrl,
  image_url: optionalUrl,
  category: z.string().trim().min(3).max(30),
});

const postUpdateSchema = z
  .object({
    title: z.string().trim().min(8).max(220).optional(),
    body: z.string().trim().min(20).max(3000).optional(),
    source_url: optionalUrl,
    image_url: optionalUrl,
    category: z.string().trim().min(3).max(30).optional(),
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one field is required",
  });

router.get("/", async (req, res) => {
  const q = String(req.query.q || "").trim();
  const category = String(req.query.category || "all");
  const { limit, offset } = readPagination(req.query, { defaultLimit: 20, maxLimit: 40 });

  const rows = await db("posts as p")
    .leftJoin("users as u", "u.id", "p.author_id")
    .leftJoin("post_scores as ps", "ps.post_id", "p.id")
    .whereNull("p.deleted_at")
    .modify((query) => {
      if (category !== "all") {
        query.where("p.category", category);
      }
      if (q) {
        query.andWhere(function filterQuery() {
          this.whereILike("p.title", `%${q}%`).orWhereILike("p.body", `%${q}%`);
        });
      }
    })
    .select(
      "p.id",
      "p.title",
      "p.body",
      "p.image_url",
      "p.source_url",
      "p.category",
      "p.created_at",
      "u.name as author_name",
      db.raw("COALESCE(ps.quality_score, 50) as quality_score"),
      db.raw("(SELECT COUNT(*) FROM reactions r WHERE r.post_id = p.id) as reaction_count"),
      db.raw("(SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id AND c.deleted_at IS NULL) as comment_count")
    )
    .orderBy("p.created_at", "desc")
    .offset(offset)
    .limit(limit);

  return res.json(rows);
});

router.get("/trending", async (req, res) => {
  const { limit, offset } = readPagination(req.query, { defaultLimit: 10, maxLimit: 20 });

  const rows = await db("posts as p")
    .leftJoin("users as u", "u.id", "p.author_id")
    .whereNull("p.deleted_at")
    .select(
      "p.id",
      "p.title",
      "p.category",
      "p.created_at",
      "u.name as author_name",
      db.raw("(SELECT COUNT(*) FROM reactions r WHERE r.post_id = p.id) as reaction_count"),
      db.raw("(SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id AND c.deleted_at IS NULL) as comment_count")
    )
    .orderByRaw("((SELECT COUNT(*) FROM reactions r WHERE r.post_id = p.id) + (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id AND c.deleted_at IS NULL) * 1.3) DESC")
    .orderBy("p.created_at", "desc")
    .offset(offset)
    .limit(limit);

  return res.json(rows);
});

router.get("/seed/status", async (_req, res) => {
  const targetPosts = 220;

  const [postCountRow] = await db("posts")
    .whereNull("deleted_at")
    .count("id as count");

  const [userCountRow] = await db("users")
    .where({ role: "user" })
    .count("id as count");

  const [latestPostRow] = await db("posts")
    .whereNull("deleted_at")
    .max("created_at as latest_created_at");

  const byCategoryRows = await db("posts")
    .whereNull("deleted_at")
    .select("category")
    .count("id as count")
    .groupBy("category")
    .orderBy("count", "desc");

  const totalPosts = Number(postCountRow?.count || 0);
  const completionPct = Math.min(100, Math.round((totalPosts / targetPosts) * 100));

  return res.json({
    target_posts: targetPosts,
    total_posts: totalPosts,
    completion_pct: completionPct,
    user_authors: Number(userCountRow?.count || 0),
    latest_post_at: latestPostRow?.latest_created_at || null,
    by_category: byCategoryRows.map((row) => ({
      category: row.category,
      count: Number(row.count || 0),
    })),
  });
});

router.post("/", requireAuth, async (req, res) => {
  const parsed = postSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid payload", errors: parsed.error.flatten() });
  }

  const payload = parsed.data;
  const [post] = await db("posts")
    .insert({
      author_id: req.user.id,
      ...payload,
    })
    .returning(["id", "title", "body", "source_url", "image_url", "category", "created_at"]);

  const quality_score = Math.max(45, Math.min(95, 40 + Math.round((payload.body.length + payload.title.length) / 40)));
  await db("post_scores")
    .insert({ post_id: post.id, quality_score, recency_factor: 1.0, engagement_score: 0 })
    .onConflict("post_id")
    .merge();

  return res.status(201).json(post);
});

router.get("/:id", async (req, res) => {
  const post = await db("posts as p")
    .leftJoin("users as u", "u.id", "p.author_id")
    .leftJoin("post_scores as ps", "ps.post_id", "p.id")
    .where("p.id", req.params.id)
    .whereNull("p.deleted_at")
    .select(
      "p.*",
      "u.name as author_name",
      "u.avatar_url as author_avatar",
      db.raw("COALESCE(ps.quality_score, 50) as quality_score")
    )
    .first();

  if (!post) {
    return res.status(404).json({ message: "Post not found" });
  }

  const comments = await db("comments")
    .where({ post_id: post.id })
    .whereNull("deleted_at")
    .orderBy("created_at", "desc")
    .limit(50);

  return res.json({ post, comments });
});

router.patch("/:id", requireAuth, async (req, res) => {
  const postId = Number(req.params.id);
  if (!Number.isInteger(postId) || postId <= 0) {
    return res.status(400).json({ message: "Invalid post id" });
  }

  const parsed = postUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid payload", errors: parsed.error.flatten() });
  }

  const existing = await db("posts")
    .where({ id: postId })
    .first("id", "author_id", "deleted_at");

  if (!existing) {
    return res.status(404).json({ message: "Post not found" });
  }

  if (Number(existing.author_id) !== Number(req.user.id) && req.user.role !== "admin") {
    return res.status(403).json({ message: "Not allowed to edit this post" });
  }

  if (existing.deleted_at) {
    return res.status(400).json({ message: "Cannot edit a hidden post" });
  }

  const [updated] = await db("posts")
    .where({ id: postId })
    .update({ ...parsed.data, updated_at: db.fn.now() })
    .returning(["id", "author_id", "title", "body", "source_url", "image_url", "category", "created_at", "updated_at"]);

  return res.json(updated);
});

router.delete("/:id", requireAuth, async (req, res) => {
  const postId = Number(req.params.id);
  if (!Number.isInteger(postId) || postId <= 0) {
    return res.status(400).json({ message: "Invalid post id" });
  }

  const existing = await db("posts")
    .where({ id: postId })
    .first("id", "author_id", "deleted_at");

  if (!existing) {
    return res.status(404).json({ message: "Post not found" });
  }

  if (Number(existing.author_id) !== Number(req.user.id) && req.user.role !== "admin") {
    return res.status(403).json({ message: "Not allowed to delete this post" });
  }

  await db("posts")
    .where({ id: postId })
    .update({ deleted_at: db.fn.now(), updated_at: db.fn.now() });

  return res.json({ message: "Post deleted successfully" });
});

export default router;
