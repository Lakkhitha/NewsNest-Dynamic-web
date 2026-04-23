import { Router } from "express";
import { z } from "zod";
import { db } from "../../db/knex.js";
import { requireAuth } from "../../middlewares/auth.js";

const router = Router();

const optionalText = (max) =>
  z.preprocess(
    (value) => {
      if (typeof value !== "string") {
        return value;
      }

      const trimmed = value.trim();
      return trimmed.length === 0 ? null : trimmed;
    },
    z.string().max(max).nullable().optional()
  );

const optionalUrl = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return value;
    }

    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
  },
  z.string().url().nullable().optional()
);

const profileUpdateSchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    bio: optionalText(280),
    avatar_url: optionalUrl,
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one field is required",
  });

function parseRouteUserId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }
  return id;
}

function readPagination(query, { defaultLimit, maxLimit }) {
  const parsedLimit = Number(query.limit || defaultLimit);
  const parsedPage = Number(query.page || 1);

  const limit = Number.isFinite(parsedLimit) ? Math.max(1, Math.min(maxLimit, Math.floor(parsedLimit))) : defaultLimit;
  const page = Number.isFinite(parsedPage) ? Math.max(1, Math.floor(parsedPage)) : 1;
  const offset = (page - 1) * limit;

  return { limit, page, offset };
}

router.get("/me/stats", requireAuth, async (req, res) => {
  const userId = req.user.id;

  const [posts] = await db("posts").where({ author_id: userId }).whereNull("deleted_at").count("id as count");
  const [followers] = await db("follows").where({ following_id: userId }).count("follower_id as count");
  const [following] = await db("follows").where({ follower_id: userId }).count("following_id as count");
  const [reactions] = await db("reactions as r")
    .leftJoin("posts as p", "p.id", "r.post_id")
    .where("p.author_id", userId)
    .count("r.id as count");

  res.json({
    posts: Number(posts.count || 0),
    followers: Number(followers.count || 0),
    following: Number(following.count || 0),
    reactions: Number(reactions.count || 0),
  });
});

router.get("/me/dashboard", requireAuth, async (req, res) => {
  const userId = req.user.id;

  const [publishedToday] = await db("posts")
    .where({ author_id: userId })
    .whereNull("deleted_at")
    .where("created_at", ">", db.raw("NOW() - INTERVAL '24 hours'"))
    .count("id as count");

  const [unreadMessages] = await db("messages")
    .where({ recipient_id: userId, is_read: false })
    .count("id as count");

  const [openReports] = await db("reports").where({ reporter_id: userId, status: "open" }).count("id as count");

  return res.json({
    publishedToday: Number(publishedToday.count || 0),
    unreadMessages: Number(unreadMessages.count || 0),
    openReports: Number(openReports.count || 0),
  });
});

router.get("/me/notifications", requireAuth, async (req, res) => {
  const userId = req.user.id;
  const { limit, page, offset } = readPagination(req.query, { defaultLimit: 20, maxLimit: 50 });

  const reactionEvents = await db("reactions as r")
    .leftJoin("posts as p", "p.id", "r.post_id")
    .leftJoin("users as u", "u.id", "r.user_id")
    .where("p.author_id", userId)
    .whereNot("r.user_id", userId)
    .select(
      db.raw("'reaction' as type"),
      "r.created_at",
      "u.name as actor",
      db.raw("CONCAT('reacted to your post: ', p.title) as message")
    )
    .orderBy("r.created_at", "desc")
    .limit(limit);

  const commentEvents = await db("comments as c")
    .leftJoin("posts as p", "p.id", "c.post_id")
    .leftJoin("users as u", "u.id", "c.author_id")
    .where("p.author_id", userId)
    .whereNot("c.author_id", userId)
    .whereNull("c.deleted_at")
    .select(
      db.raw("'comment' as type"),
      "c.created_at",
      "u.name as actor",
      db.raw("CONCAT('commented on your post: ', p.title) as message")
    )
    .orderBy("c.created_at", "desc")
    .limit(limit);

  const followEvents = await db("follows as f")
    .leftJoin("users as u", "u.id", "f.follower_id")
    .where("f.following_id", userId)
    .select(
      db.raw("'follow' as type"),
      "f.created_at",
      "u.name as actor",
      db.raw("'started following you' as message")
    )
    .orderBy("f.created_at", "desc")
    .limit(limit);

  const messageEvents = await db("messages as m")
    .leftJoin("users as u", "u.id", "m.sender_id")
    .where("m.recipient_id", userId)
    .select(
      db.raw("'message' as type"),
      "m.created_at",
      "u.name as actor",
      db.raw("'sent you a message' as message")
    )
    .orderBy("m.created_at", "desc")
    .limit(limit);

  const notifications = [...reactionEvents, ...commentEvents, ...followEvents, ...messageEvents]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(offset, offset + limit);

  return res.json({
    count: notifications.length,
    page,
    limit,
    items: notifications,
  });
});

router.get("/suggestions", requireAuth, async (req, res) => {
  const userId = req.user.id;
  const { limit, offset } = readPagination(req.query, { defaultLimit: 8, maxLimit: 24 });
  const followingRows = await db("follows").where({ follower_id: userId }).select("following_id");
  const followingIds = followingRows.map((row) => row.following_id);

  const users = await db("users as u")
    .whereNot("u.id", userId)
    .modify((query) => {
      if (followingIds.length > 0) {
        query.whereNotIn("u.id", followingIds);
      }
    })
    .select("u.id", "u.name", "u.bio", "u.avatar_url")
    .orderBy("u.created_at", "desc")
    .offset(offset)
    .limit(limit);

  res.json(users);
});

router.get("/search", requireAuth, async (req, res) => {
  const userId = req.user.id;
  const q = String(req.query.q || "").trim();
  const { limit, offset } = readPagination(req.query, { defaultLimit: 12, maxLimit: 30 });

  if (!q) {
    return res.json([]);
  }

  const users = await db("users as u")
    .whereNot("u.id", userId)
    .andWhere(function whereSearch() {
      this.whereILike("u.name", `%${q}%`).orWhereILike("u.bio", `%${q}%`);
    })
    .select("u.id", "u.name", "u.bio", "u.avatar_url", "u.role", "u.created_at")
    .orderBy("u.created_at", "desc")
    .offset(offset)
    .limit(limit);

  return res.json(users);
});

router.get("/:id/profile", requireAuth, async (req, res) => {
  const profileId = parseRouteUserId(req.params.id);
  if (!profileId) {
    return res.status(400).json({ message: "Invalid user id" });
  }

  const user = await db("users").where({ id: profileId }).first("id", "name", "bio", "avatar_url", "created_at");

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const [posts] = await db("posts").where({ author_id: profileId }).whereNull("deleted_at").count("id as count");
  const [followers] = await db("follows").where({ following_id: profileId }).count("follower_id as count");
  const [following] = await db("follows").where({ follower_id: profileId }).count("following_id as count");

  const isFollowing =
    (await db("follows").where({ follower_id: req.user.id, following_id: profileId }).first()) !== undefined;

  return res.json({
    user,
    stats: {
      posts: Number(posts.count || 0),
      followers: Number(followers.count || 0),
      following: Number(following.count || 0),
    },
    isFollowing,
  });
});

router.get("/:id/posts", requireAuth, async (req, res) => {
  const profileId = parseRouteUserId(req.params.id);
  if (!profileId) {
    return res.status(400).json({ message: "Invalid user id" });
  }

  const { limit, offset } = readPagination(req.query, { defaultLimit: 50, maxLimit: 100 });

  const posts = await db("posts as p")
    .leftJoin("post_scores as ps", "ps.post_id", "p.id")
    .where({ "p.author_id": profileId })
    .whereNull("p.deleted_at")
    .select("p.*", db.raw("COALESCE(ps.quality_score, 50) as quality_score"))
    .orderBy("p.created_at", "desc")
    .offset(offset)
    .limit(limit);

  return res.json(posts);
});

router.get("/me/network", requireAuth, async (req, res) => {
  const userId = req.user.id;

  const followers = await db("follows as f")
    .leftJoin("users as u", "u.id", "f.follower_id")
    .where("f.following_id", userId)
    .select("u.id", "u.name", "u.bio")
    .orderBy("f.created_at", "desc")
    .limit(8);

  const following = await db("follows as f")
    .leftJoin("users as u", "u.id", "f.following_id")
    .where("f.follower_id", userId)
    .select("u.id", "u.name", "u.bio")
    .orderBy("f.created_at", "desc")
    .limit(8);

  const followingIds = new Set(following.map((u) => Number(u.id)));
  const mutualCount = followers.reduce((count, user) => (followingIds.has(Number(user.id)) ? count + 1 : count), 0);

  return res.json({
    followers,
    following,
    mutual_count: mutualCount,
  });
});

router.patch("/me/profile", requireAuth, async (req, res) => {
  const parsed = profileUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid payload", errors: parsed.error.flatten() });
  }

  const payload = parsed.data;

  const [updated] = await db("users")
    .where({ id: req.user.id })
    .update({ ...payload, updated_at: db.fn.now() })
    .returning(["id", "name", "email", "role", "bio", "avatar_url", "created_at"]);

  return res.json(updated);
});

export default router;
