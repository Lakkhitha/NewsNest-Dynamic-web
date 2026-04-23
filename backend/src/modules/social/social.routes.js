import { Router } from "express";
import { z } from "zod";
import { db } from "../../db/knex.js";
import { requireAuth } from "../../middlewares/auth.js";

const router = Router();

const reactionSchema = z.object({
  type: z.enum(["like", "love", "support", "insightful"]),
});

const commentSchema = z.object({
  content: z.string().trim().min(1).max(500),
});

async function ensureActiveUser(userId) {
  return db("users").where({ id: userId }).whereNot({ role: "suspended" }).first("id");
}

async function ensureActivePost(postId) {
  return db("posts").where({ id: postId }).whereNull("deleted_at").first("id");
}

router.post("/follow/:userId", requireAuth, async (req, res) => {
  const following_id = Number(req.params.userId);
  const follower_id = req.user.id;

  if (!Number.isInteger(following_id) || following_id <= 0) {
    return res.status(400).json({ message: "Invalid user id" });
  }

  if (following_id === follower_id) {
    return res.status(400).json({ message: "You cannot follow yourself" });
  }

  const targetUser = await ensureActiveUser(following_id);
  if (!targetUser) {
    return res.status(404).json({ message: "User not found" });
  }

  await db("follows")
    .insert({ follower_id, following_id })
    .onConflict(["follower_id", "following_id"])
    .ignore();

  return res.json({ message: "Followed successfully" });
});

router.delete("/follow/:userId", requireAuth, async (req, res) => {
  const followingId = Number(req.params.userId);
  if (!Number.isInteger(followingId) || followingId <= 0) {
    return res.status(400).json({ message: "Invalid user id" });
  }

  await db("follows")
    .where({ follower_id: req.user.id, following_id: followingId })
    .delete();

  return res.json({ message: "Unfollowed successfully" });
});

router.post("/posts/:id/reactions", requireAuth, async (req, res) => {
  const parsed = reactionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid reaction" });
  }

  const post_id = Number(req.params.id);
  if (!Number.isInteger(post_id) || post_id <= 0) {
    return res.status(400).json({ message: "Invalid post id" });
  }

  const post = await ensureActivePost(post_id);
  if (!post) {
    return res.status(404).json({ message: "Post not found" });
  }

  const existingReaction = await db("reactions")
    .where({ post_id, user_id: req.user.id })
    .first("id", "type");

  if (existingReaction) {
    return res.status(409).json({ message: "You already reacted to this post" });
  }

  await db("reactions")
    .insert({ post_id, user_id: req.user.id, type: parsed.data.type });

  const result = await db("reactions")
    .where({ post_id })
    .select("type")
    .count("id as count")
    .groupBy("type");

  return res.json({ reactions: result });
});

router.post("/posts/:id/comments", requireAuth, async (req, res) => {
  const parsed = commentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid comment" });
  }

  const postId = Number(req.params.id);
  if (!Number.isInteger(postId) || postId <= 0) {
    return res.status(400).json({ message: "Invalid post id" });
  }

  const post = await ensureActivePost(postId);
  if (!post) {
    return res.status(404).json({ message: "Post not found" });
  }

  const [comment] = await db("comments")
    .insert({
      post_id: postId,
      author_id: req.user.id,
      content: parsed.data.content,
    })
    .returning(["id", "post_id", "author_id", "content", "created_at"]);

  return res.status(201).json(comment);
});

router.patch("/comments/:id", requireAuth, async (req, res) => {
  const commentId = Number(req.params.id);
  if (!Number.isInteger(commentId) || commentId <= 0) {
    return res.status(400).json({ message: "Invalid comment id" });
  }

  const parsed = commentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid comment" });
  }

  const existing = await db("comments")
    .where({ id: commentId })
    .whereNull("deleted_at")
    .first("id", "author_id");

  if (!existing) {
    return res.status(404).json({ message: "Comment not found" });
  }

  if (Number(existing.author_id) !== Number(req.user.id) && req.user.role !== "admin") {
    return res.status(403).json({ message: "Not allowed to edit this comment" });
  }

  const [updated] = await db("comments")
    .where({ id: commentId })
    .update({ content: parsed.data.content, updated_at: db.fn.now() })
    .returning(["id", "post_id", "author_id", "content", "created_at", "updated_at"]);

  return res.json(updated);
});

router.delete("/comments/:id", requireAuth, async (req, res) => {
  const commentId = Number(req.params.id);
  if (!Number.isInteger(commentId) || commentId <= 0) {
    return res.status(400).json({ message: "Invalid comment id" });
  }

  const existing = await db("comments")
    .where({ id: commentId })
    .whereNull("deleted_at")
    .first("id", "author_id");

  if (!existing) {
    return res.status(404).json({ message: "Comment not found" });
  }

  if (Number(existing.author_id) !== Number(req.user.id) && req.user.role !== "admin") {
    return res.status(403).json({ message: "Not allowed to delete this comment" });
  }

  await db("comments")
    .where({ id: commentId })
    .update({ deleted_at: db.fn.now(), updated_at: db.fn.now() });

  return res.json({ message: "Comment deleted" });
});

router.post("/reports", requireAuth, async (req, res) => {
  const reportSchema = z.object({
    post_id: z.number().int().positive(),
    reason: z.string().min(3).max(200),
  });

  const parsed = reportSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid report payload" });
  }

  const post = await ensureActivePost(parsed.data.post_id);
  if (!post) {
    return res.status(404).json({ message: "Post not found" });
  }

  const [report] = await db("reports")
    .insert({ reporter_id: req.user.id, post_id: parsed.data.post_id, reason: parsed.data.reason })
    .returning(["id", "post_id", "reason", "status", "created_at"]);

  return res.status(201).json(report);
});

router.post("/feedback", requireAuth, async (req, res) => {
  const feedbackSchema = z.object({
    message: z.string().min(3).max(500),
  });

  const parsed = feedbackSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid feedback payload" });
  }

  await db("feedbacks").insert({ user_id: req.user.id, message: parsed.data.message });
  return res.status(201).json({ message: "Feedback submitted" });
});

router.post("/posts/:id/share", requireAuth, async (req, res) => {
  const post_id = Number(req.params.id);
  if (!Number.isInteger(post_id) || post_id <= 0) {
    return res.status(400).json({ message: "Invalid post id" });
  }

  const post = await ensureActivePost(post_id);
  if (!post) {
    return res.status(404).json({ message: "Post not found" });
  }

  await db("shares").insert({ post_id, user_id: req.user.id });

  const [countRow] = await db("shares").where({ post_id }).count("id as count");
  return res.status(201).json({ shares: Number(countRow.count || 0) });
});

router.get("/my/reports", requireAuth, async (req, res) => {
  const reports = await db("reports as r")
    .leftJoin("posts as p", "p.id", "r.post_id")
    .where({ "r.reporter_id": req.user.id })
    .select("r.id", "r.reason", "r.status", "r.created_at", "r.post_id", "p.title as post_title")
    .orderBy("r.created_at", "desc")
    .limit(100);

  return res.json(reports);
});

router.get("/my/feedbacks", requireAuth, async (req, res) => {
  const feedbacks = await db("feedbacks")
    .where({ user_id: req.user.id })
    .select("id", "message", "created_at")
    .orderBy("created_at", "desc")
    .limit(100);

  return res.json(feedbacks);
});

export default router;
