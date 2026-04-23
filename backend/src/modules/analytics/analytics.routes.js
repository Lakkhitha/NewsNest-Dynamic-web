import { Router } from "express";
import { db } from "../../db/knex.js";
import { requireAuth } from "../../middlewares/auth.js";

const router = Router();

router.get("/overview", requireAuth, async (_req, res) => {
  const [posts] = await db("posts").whereNull("deleted_at").count("id as count");
  const [users] = await db("users").count("id as count");
  const [reactions] = await db("reactions").count("id as count");
  const [comments] = await db("comments").whereNull("deleted_at").count("id as count");

  const avgScoreResult = await db("post_scores").avg("quality_score as avg_score").first();

  return res.json({
    posts: Number(posts.count || 0),
    users: Number(users.count || 0),
    reactions: Number(reactions.count || 0),
    comments: Number(comments.count || 0),
    avgScore: Number(avgScoreResult?.avg_score || 0).toFixed(2),
  });
});

router.get("/category-trends", requireAuth, async (_req, res) => {
  const rows = await db("posts")
    .whereNull("deleted_at")
    .select("category")
    .count("id as count")
    .groupBy("category")
    .orderBy("count", "desc");

  res.json(rows.map((row) => ({ category: row.category, count: Number(row.count || 0) })));
});

router.get("/quality-distribution", requireAuth, async (_req, res) => {
  const rows = await db("post_scores")
    .select(
      db.raw("CASE WHEN quality_score >= 80 THEN 'high' WHEN quality_score >= 60 THEN 'medium' ELSE 'low' END as band")
    )
    .count("post_id as count")
    .groupBy("band");

  const result = { high: 0, medium: 0, low: 0 };
  rows.forEach((row) => {
    result[row.band] = Number(row.count || 0);
  });

  res.json(result);
});

router.get("/engagement-trend", requireAuth, async (_req, res) => {
  const postTrend = await db("posts")
    .whereNull("deleted_at")
    .where("created_at", ">", db.raw("NOW() - INTERVAL '7 days'"))
    .select(db.raw("TO_CHAR(DATE(created_at), 'YYYY-MM-DD') as day"))
    .count("id as count")
    .groupBy("day")
    .orderBy("day", "asc");

  const reactionTrend = await db("reactions")
    .where("created_at", ">", db.raw("NOW() - INTERVAL '7 days'"))
    .select(db.raw("TO_CHAR(DATE(created_at), 'YYYY-MM-DD') as day"))
    .count("id as count")
    .groupBy("day")
    .orderBy("day", "asc");

  const commentTrend = await db("comments")
    .whereNull("deleted_at")
    .where("created_at", ">", db.raw("NOW() - INTERVAL '7 days'"))
    .select(db.raw("TO_CHAR(DATE(created_at), 'YYYY-MM-DD') as day"))
    .count("id as count")
    .groupBy("day")
    .orderBy("day", "asc");

  return res.json({
    posts: postTrend.map((row) => ({ day: row.day, count: Number(row.count || 0) })),
    reactions: reactionTrend.map((row) => ({ day: row.day, count: Number(row.count || 0) })),
    comments: commentTrend.map((row) => ({ day: row.day, count: Number(row.count || 0) })),
  });
});

router.get("/author-leaderboard", requireAuth, async (_req, res) => {
  const rows = await db("posts as p")
    .leftJoin("users as u", "u.id", "p.author_id")
    .leftJoin("post_scores as ps", "ps.post_id", "p.id")
    .whereNull("p.deleted_at")
    .select("u.id", "u.name")
    .count("p.id as post_count")
    .avg("ps.quality_score as avg_quality")
    .groupBy("u.id", "u.name")
    .orderBy("post_count", "desc")
    .limit(10);

  return res.json(
    rows.map((row) => ({
      id: row.id,
      name: row.name,
      post_count: Number(row.post_count || 0),
      avg_quality: Number(row.avg_quality || 0).toFixed(1),
    }))
  );
});

export default router;
