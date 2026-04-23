import { Router } from "express";
import { z } from "zod";
import { db } from "../../db/knex.js";
import { requireAdmin, requireAuth } from "../../middlewares/auth.js";

const router = Router();

function readPagination(query, { defaultLimit, maxLimit }) {
  const parsedLimit = Number(query.limit || defaultLimit);
  const parsedPage = Number(query.page || 1);

  const limit = Number.isFinite(parsedLimit) ? Math.max(1, Math.min(maxLimit, Math.floor(parsedLimit))) : defaultLimit;
  const page = Number.isFinite(parsedPage) ? Math.max(1, Math.floor(parsedPage)) : 1;
  const offset = (page - 1) * limit;

  return { limit, offset };
}

async function writeAuditLog({ actorUserId, action, entityType, entityId = null, metadata = {} }) {
  await db("admin_audit_logs").insert({
    actor_user_id: actorUserId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    metadata,
  });
}

function escapeCsv(value) {
  if (value === null || value === undefined) {
    return "";
  }
  const text = String(value);
  if (text.includes(",") || text.includes("\n") || text.includes("\"")) {
    return `"${text.replaceAll("\"", "\"\"")}"`;
  }
  return text;
}

function rowsToCsv(rows) {
  if (!rows.length) {
    return "";
  }
  const headers = Object.keys(rows[0]);
  const lines = rows.map((row) => headers.map((key) => escapeCsv(row[key])).join(","));
  return `${headers.join(",")}\n${lines.join("\n")}`;
}

async function readExportRows(dataset, { status, limit }) {
  if (dataset === "reports") {
    return db("reports as r")
      .leftJoin("users as ru", "ru.id", "r.reporter_id")
      .leftJoin("posts as p", "p.id", "r.post_id")
      .select(
        "r.id",
        "r.post_id",
        "r.reason",
        "r.status",
        "r.created_at",
        "ru.name as reporter_name",
        "p.title as post_title"
      )
      .orderBy("r.created_at", "desc")
      .limit(limit);
  }

  if (dataset === "comments") {
    return db("comments as c")
      .leftJoin("users as u", "u.id", "c.author_id")
      .leftJoin("posts as p", "p.id", "c.post_id")
      .select(
        "c.id",
        "c.post_id",
        "c.author_id",
        "u.name as author_name",
        "c.content",
        "c.created_at",
        "c.deleted_at",
        "p.title as post_title"
      )
      .orderBy("c.created_at", "desc")
      .limit(limit);
  }

  if (dataset === "messages") {
    return db("messages as m")
      .leftJoin("users as su", "su.id", "m.sender_id")
      .leftJoin("users as ru", "ru.id", "m.recipient_id")
      .select(
        "m.id",
        "m.sender_id",
        "su.name as sender_name",
        "m.recipient_id",
        "ru.name as recipient_name",
        "m.content",
        "m.is_read",
        "m.created_at"
      )
      .orderBy("m.created_at", "desc")
      .limit(limit);
  }

  if (dataset === "feedbacks") {
    return db("feedbacks as f")
      .leftJoin("users as u", "u.id", "f.user_id")
      .select("f.id", "f.user_id", "u.name as user_name", "u.email as user_email", "f.message", "f.created_at")
      .orderBy("f.created_at", "desc")
      .limit(limit);
  }

  return db("posts as p")
    .leftJoin("users as u", "u.id", "p.author_id")
    .leftJoin("post_scores as ps", "ps.post_id", "p.id")
    .modify((query) => {
      if (status === "active") {
        query.whereNull("p.deleted_at");
      }
      if (status === "hidden") {
        query.whereNotNull("p.deleted_at");
      }
    })
    .select(
      "p.id",
      "p.author_id",
      "u.name as author_name",
      "p.title",
      "p.category",
      "p.created_at",
      "p.deleted_at",
      db.raw("COALESCE(ps.quality_score, 50) as quality_score"),
      db.raw("(SELECT COUNT(*) FROM reports r WHERE r.post_id = p.id AND r.status = 'open') as open_report_count")
    )
    .orderBy("p.created_at", "desc")
    .limit(limit);
}

router.get("/stats", requireAuth, requireAdmin, async (_req, res) => {
  const [users] = await db("users").count("id as count");
  const [posts] = await db("posts").whereNull("deleted_at").count("id as count");
  const [reportsOpen] = await db("reports").where({ status: "open" }).count("id as count");
  const [feedbacks] = await db("feedbacks").count("id as count");
  const [messages] = await db("messages").count("id as count");

  return res.json({
    users: Number(users.count || 0),
    posts: Number(posts.count || 0),
    reportsOpen: Number(reportsOpen.count || 0),
    feedbacks: Number(feedbacks.count || 0),
    messages: Number(messages.count || 0),
  });
});

router.get("/reports", requireAuth, requireAdmin, async (req, res) => {
  const { limit, offset } = readPagination(req.query, { defaultLimit: 200, maxLimit: 300 });

  const reports = await db("reports as r")
    .leftJoin("users as ru", "ru.id", "r.reporter_id")
    .leftJoin("posts as p", "p.id", "r.post_id")
    .select(
      "r.id",
      "r.post_id",
      "r.reason",
      "r.status",
      "r.created_at",
      "ru.name as reporter_name",
      "p.title as post_title"
    )
    .orderBy("r.created_at", "desc")
    .offset(offset)
    .limit(limit);

  return res.json(reports);
});

router.patch("/reports/:id/resolve", requireAuth, requireAdmin, async (req, res) => {
  const reportId = Number(req.params.id);
  if (!Number.isInteger(reportId) || reportId <= 0) {
    return res.status(400).json({ message: "Invalid report id" });
  }

  const updated = await db("reports").where({ id: reportId }).update({ status: "resolved" });
  if (!updated) {
    return res.status(404).json({ message: "Report not found" });
  }

  await writeAuditLog({
    actorUserId: req.user.id,
    action: "report.resolve",
    entityType: "report",
    entityId: reportId,
  });

  return res.json({ message: "Report marked as resolved" });
});

router.patch("/reports/bulk-resolve", requireAuth, requireAdmin, async (req, res) => {
  const payloadSchema = z.object({
    reportIds: z.array(z.number().int().positive()).min(1).max(200),
  });

  const parsed = payloadSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid reportIds payload" });
  }

  const updated = await db("reports")
    .whereIn("id", parsed.data.reportIds)
    .where({ status: "open" })
    .update({ status: "resolved" });

  await writeAuditLog({
    actorUserId: req.user.id,
    action: "report.bulk_resolve",
    entityType: "report",
    metadata: { requested: parsed.data.reportIds.length, updated },
  });

  return res.json({ message: "Reports resolved", updated });
});

router.get("/audit-logs", requireAuth, requireAdmin, async (req, res) => {
  const { limit, offset } = readPagination(req.query, { defaultLimit: 50, maxLimit: 200 });
  const actorId = Number(req.query.actorId);
  const action = String(req.query.action || "").trim();
  const entityType = String(req.query.entityType || "").trim();

  const rows = await db("admin_audit_logs as a")
    .leftJoin("users as u", "u.id", "a.actor_user_id")
    .modify((query) => {
      if (Number.isInteger(actorId) && actorId > 0) {
        query.where("a.actor_user_id", actorId);
      }
      if (action) {
        query.whereILike("a.action", `%${action}%`);
      }
      if (entityType) {
        query.whereILike("a.entity_type", `%${entityType}%`);
      }
    })
    .select(
      "a.id",
      "a.actor_user_id",
      "u.name as actor_name",
      "a.action",
      "a.entity_type",
      "a.entity_id",
      "a.metadata",
      "a.created_at"
    )
    .orderBy("a.created_at", "desc")
    .offset(offset)
    .limit(limit);

  return res.json(rows);
});

router.get("/export", requireAuth, requireAdmin, async (req, res) => {
  const dataset = String(req.query.dataset || "reports").trim();
  const format = String(req.query.format || "json").trim();
  const status = String(req.query.status || "all").trim();
  const requestedLimit = Number(req.query.limit || 500);
  const limit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(5000, Math.floor(requestedLimit))) : 500;

  const allowedDatasets = ["reports", "comments", "posts", "messages", "feedbacks"];
  const allowedFormats = ["json", "csv"];

  if (!allowedDatasets.includes(dataset)) {
    return res.status(400).json({ message: "Invalid export dataset" });
  }
  if (!allowedFormats.includes(format)) {
    return res.status(400).json({ message: "Invalid export format" });
  }

  const rows = await readExportRows(dataset, { status, limit });
  await writeAuditLog({
    actorUserId: req.user.id,
    action: "moderation.export",
    entityType: dataset,
    metadata: { format, status, count: rows.length, limit },
  });

  const filename = `moderation-${dataset}-${Date.now()}.${format}`;

  if (format === "csv") {
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename=\"${filename}\"`);
    return res.send(rowsToCsv(rows));
  }

  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename=\"${filename}\"`);
  return res.json(rows);
});

router.get("/users", requireAuth, requireAdmin, async (req, res) => {
  const { limit, offset } = readPagination(req.query, { defaultLimit: 300, maxLimit: 400 });

  const users = await db("users")
    .select("id", "name", "email", "role", "created_at")
    .orderBy("created_at", "desc")
    .offset(offset)
    .limit(limit);

  return res.json(users);
});

router.get("/activities", requireAuth, requireAdmin, async (_req, res) => {
  const latestPosts = await db("posts")
    .whereNull("deleted_at")
    .select("id", "title", "author_id", "created_at")
    .orderBy("created_at", "desc")
    .limit(20);

  const latestComments = await db("comments")
    .whereNull("deleted_at")
    .select("id", "post_id", "author_id", "content", "created_at")
    .orderBy("created_at", "desc")
    .limit(20);

  return res.json({ latestPosts, latestComments });
});

router.get("/feedbacks", requireAuth, requireAdmin, async (req, res) => {
  const { limit, offset } = readPagination(req.query, { defaultLimit: 200, maxLimit: 300 });

  const feedbacks = await db("feedbacks as f")
    .leftJoin("users as u", "u.id", "f.user_id")
    .select("f.id", "f.message", "f.created_at", "u.name as user_name", "u.email as user_email")
    .orderBy("f.created_at", "desc")
    .offset(offset)
    .limit(limit);

  return res.json(feedbacks);
});

router.get("/posts", requireAuth, requireAdmin, async (req, res) => {
  const status = String(req.query.status || "all");
  const { limit, offset } = readPagination(req.query, { defaultLimit: 120, maxLimit: 300 });

  const posts = await db("posts as p")
    .leftJoin("users as u", "u.id", "p.author_id")
    .leftJoin("post_scores as ps", "ps.post_id", "p.id")
    .modify((query) => {
      if (status === "active") {
        query.whereNull("p.deleted_at");
      }
      if (status === "hidden") {
        query.whereNotNull("p.deleted_at");
      }
    })
    .select(
      "p.id",
      "p.title",
      "p.category",
      "p.created_at",
      "p.deleted_at",
      "u.name as author_name",
      db.raw("COALESCE(ps.quality_score, 50) as quality_score"),
      db.raw("(SELECT COUNT(*) FROM reports r WHERE r.post_id = p.id AND r.status = 'open') as open_report_count")
    )
    .orderBy("p.created_at", "desc")
    .offset(offset)
    .limit(limit);

  return res.json(posts);
});

router.patch("/posts/:id/hide", requireAuth, requireAdmin, async (req, res) => {
  const postId = Number(req.params.id);
  if (!Number.isInteger(postId) || postId <= 0) {
    return res.status(400).json({ message: "Invalid post id" });
  }

  const updated = await db("posts")
    .where({ id: postId })
    .update({ deleted_at: db.fn.now(), updated_at: db.fn.now() });
  if (!updated) {
    return res.status(404).json({ message: "Post not found" });
  }

  await writeAuditLog({
    actorUserId: req.user.id,
    action: "post.hide",
    entityType: "post",
    entityId: postId,
  });

  return res.json({ message: "Post hidden successfully" });
});

router.patch("/posts/:id/restore", requireAuth, requireAdmin, async (req, res) => {
  const postId = Number(req.params.id);
  if (!Number.isInteger(postId) || postId <= 0) {
    return res.status(400).json({ message: "Invalid post id" });
  }

  const updated = await db("posts")
    .where({ id: postId })
    .update({ deleted_at: null, updated_at: db.fn.now() });
  if (!updated) {
    return res.status(404).json({ message: "Post not found" });
  }

  await writeAuditLog({
    actorUserId: req.user.id,
    action: "post.restore",
    entityType: "post",
    entityId: postId,
  });

  return res.json({ message: "Post restored successfully" });
});

router.delete("/comments/:id", requireAuth, requireAdmin, async (req, res) => {
  const commentId = Number(req.params.id);
  if (!Number.isInteger(commentId) || commentId <= 0) {
    return res.status(400).json({ message: "Invalid comment id" });
  }

  const updated = await db("comments")
    .where({ id: commentId })
    .update({ deleted_at: db.fn.now(), updated_at: db.fn.now() });
  if (!updated) {
    return res.status(404).json({ message: "Comment not found" });
  }

  await writeAuditLog({
    actorUserId: req.user.id,
    action: "comment.remove",
    entityType: "comment",
    entityId: commentId,
  });

  return res.json({ message: "Comment removed" });
});

router.patch("/comments/bulk-remove", requireAuth, requireAdmin, async (req, res) => {
  const payloadSchema = z.object({
    commentIds: z.array(z.number().int().positive()).min(1).max(200),
  });

  const parsed = payloadSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid commentIds payload" });
  }

  const updated = await db("comments")
    .whereIn("id", parsed.data.commentIds)
    .whereNull("deleted_at")
    .update({ deleted_at: db.fn.now(), updated_at: db.fn.now() });

  await writeAuditLog({
    actorUserId: req.user.id,
    action: "comment.bulk_remove",
    entityType: "comment",
    metadata: { requested: parsed.data.commentIds.length, updated },
  });

  return res.json({ message: "Comments removed", updated });
});

router.get("/comments", requireAuth, requireAdmin, async (req, res) => {
  const { limit, offset } = readPagination(req.query, { defaultLimit: 250, maxLimit: 350 });

  const comments = await db("comments as c")
    .leftJoin("users as u", "u.id", "c.author_id")
    .leftJoin("posts as p", "p.id", "c.post_id")
    .whereNull("c.deleted_at")
    .select(
      "c.id",
      "c.content",
      "c.created_at",
      "c.post_id",
      "u.name as author_name",
      "p.title as post_title"
    )
    .orderBy("c.created_at", "desc")
    .offset(offset)
    .limit(limit);

  return res.json(comments);
});

router.get("/messages", requireAuth, requireAdmin, async (req, res) => {
  const { limit, offset } = readPagination(req.query, { defaultLimit: 300, maxLimit: 400 });

  const messages = await db("messages as m")
    .leftJoin("users as su", "su.id", "m.sender_id")
    .leftJoin("users as ru", "ru.id", "m.recipient_id")
    .select(
      "m.id",
      "m.content",
      "m.created_at",
      "m.is_read",
      "su.name as sender_name",
      "ru.name as recipient_name"
    )
    .orderBy("m.created_at", "desc")
    .offset(offset)
    .limit(limit);

  return res.json(messages);
});

router.delete("/messages/:id", requireAuth, requireAdmin, async (req, res) => {
  const messageId = Number(req.params.id);
  if (!Number.isInteger(messageId) || messageId <= 0) {
    return res.status(400).json({ message: "Invalid message id" });
  }

  const removed = await db("messages").where({ id: messageId }).delete();
  if (!removed) {
    return res.status(404).json({ message: "Message not found" });
  }

  await writeAuditLog({
    actorUserId: req.user.id,
    action: "message.delete",
    entityType: "message",
    entityId: messageId,
  });

  return res.json({ message: "Message deleted" });
});

router.delete("/feedbacks/:id", requireAuth, requireAdmin, async (req, res) => {
  const feedbackId = Number(req.params.id);
  if (!Number.isInteger(feedbackId) || feedbackId <= 0) {
    return res.status(400).json({ message: "Invalid feedback id" });
  }

  const removed = await db("feedbacks").where({ id: feedbackId }).delete();
  if (!removed) {
    return res.status(404).json({ message: "Feedback not found" });
  }

  await writeAuditLog({
    actorUserId: req.user.id,
    action: "feedback.delete",
    entityType: "feedback",
    entityId: feedbackId,
  });

  return res.json({ message: "Feedback removed" });
});

router.patch("/users/:id/role", requireAuth, requireAdmin, async (req, res) => {
  const roleSchema = z.object({
    role: z.enum(["user", "moderator", "admin", "suspended"]),
  });

  const parsed = roleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid role payload" });
  }

  const targetUserId = Number(req.params.id);
  if (targetUserId === req.user.id) {
    return res.status(400).json({ message: "You cannot change your own role" });
  }

  const [updatedUser] = await db("users")
    .where({ id: targetUserId })
    .update({ role: parsed.data.role, updated_at: db.fn.now() })
    .returning(["id", "name", "email", "role", "updated_at"]);

  if (!updatedUser) {
    return res.status(404).json({ message: "User not found" });
  }

  await writeAuditLog({
    actorUserId: req.user.id,
    action: "user.role.update",
    entityType: "user",
    entityId: targetUserId,
    metadata: { role: parsed.data.role },
  });

  return res.json(updatedUser);
});

router.get("/users/:id/details", requireAuth, requireAdmin, async (req, res) => {
  const userId = Number(req.params.id);

  const user = await db("users")
    .where({ id: userId })
    .first("id", "name", "email", "role", "bio", "created_at", "updated_at");

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const [posts] = await db("posts").where({ author_id: userId }).count("id as count");
  const [comments] = await db("comments").where({ author_id: userId }).whereNull("deleted_at").count("id as count");
  const [reports] = await db("reports").where({ reporter_id: userId }).count("id as count");

  return res.json({
    user,
    summary: {
      posts: Number(posts.count || 0),
      comments: Number(comments.count || 0),
      reports: Number(reports.count || 0),
    },
  });
});

export default router;
