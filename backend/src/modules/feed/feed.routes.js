import { Router } from "express";
import { db } from "../../db/knex.js";
import { requireAuth } from "../../middlewares/auth.js";

const router = Router();

async function getFollowedIds(userId) {
  const followedRows = await db("follows").where({ follower_id: userId }).select("following_id");
  const followedIds = followedRows.map((r) => r.following_id);
  if (followedIds.length === 0) {
    followedIds.push(userId);
  }
  return followedIds;
}

router.get("/", requireAuth, async (req, res) => {
  const userId = req.user.id;
  const limit = Math.min(30, Number(req.query.limit || 20));
  const seed = Number(req.query.seed || Date.now() % 9973);

  const followedIds = await getFollowedIds(userId);

  const posts = await db("posts as p")
    .leftJoin("users as u", "u.id", "p.author_id")
    .leftJoin("post_scores as ps", "ps.post_id", "p.id")
    .whereNull("p.deleted_at")
    .where("p.created_at", ">", db.raw("NOW() - INTERVAL '14 days'"))
    .select(
      "p.id",
      "p.title",
      "p.body",
      "p.image_url",
      "p.source_url",
      "p.category",
      "p.author_id",
      "p.created_at",
      "u.name as author_name",
      db.raw("(SELECT r.type FROM reactions r WHERE r.post_id = p.id AND r.user_id = ? LIMIT 1) as user_reaction", [userId]),
      db.raw("COALESCE(ps.quality_score, 50) as quality_score"),
      db.raw("(SELECT COUNT(*) FROM reactions r WHERE r.post_id = p.id) as reaction_count"),
      db.raw("(SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id AND c.deleted_at IS NULL) as comment_count"),
      db.raw("(SELECT COUNT(*) FROM shares s WHERE s.post_id = p.id) as share_count")
    )
    .limit(260);

  const ranked = posts
    .map((post) => {
      const createdAt = new Date(post.created_at).getTime();
      const ageHours = Math.max(0, (Date.now() - createdAt) / 3600000);
      const followBoost = post.author_id === userId ? 15 : followedIds.includes(post.author_id) ? 10 : 0;
      const recency = -ageHours * 0.12;
      const engagement = Number(post.reaction_count || 0) * 0.3 + Number(post.comment_count || 0) * 0.7;
      const rankingScore = Number(post.quality_score || 50) * 0.6 + recency + followBoost + engagement;
      return { ...post, rankingScore };
    })
    .sort((a, b) => b.rankingScore - a.rankingScore);

  const topBand = ranked.slice(0, Math.ceil(ranked.length * 0.2));
  const midBand = ranked.slice(Math.ceil(ranked.length * 0.2), Math.ceil(ranked.length * 0.5));
  const discoveryBand = ranked.slice(Math.ceil(ranked.length * 0.5));

  function seededShuffle(input, s) {
    const arr = [...input];
    let x = s;
    for (let i = arr.length - 1; i > 0; i -= 1) {
      x = (x * 9301 + 49297) % 233280;
      const j = Math.floor((x / 233280) * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  const a = seededShuffle(topBand, seed + 11).slice(0, Math.ceil(limit * 0.6));
  const b = seededShuffle(midBand, seed + 23).slice(0, Math.ceil(limit * 0.25));
  const c = seededShuffle(discoveryBand, seed + 37).slice(0, Math.max(1, limit - a.length - b.length));

  const mixed = seededShuffle([...a, ...b, ...c], seed + 59).slice(0, limit);
  return res.json({ seed, items: mixed });
});

router.get("/sections", requireAuth, async (req, res) => {
  const userId = req.user.id;
  const followedIds = await getFollowedIds(userId);

  const topStories = await db("posts as p")
    .leftJoin("users as u", "u.id", "p.author_id")
    .leftJoin("post_scores as ps", "ps.post_id", "p.id")
    .whereNull("p.deleted_at")
    .where("p.created_at", ">", db.raw("NOW() - INTERVAL '10 days'"))
    .select(
      "p.id",
      "p.title",
      "p.category",
      "p.image_url",
      "p.created_at",
      "u.name as author_name",
      db.raw("COALESCE(ps.quality_score, 50) as quality_score"),
      db.raw("(SELECT COUNT(*) FROM reactions r WHERE r.post_id = p.id) as reaction_count")
    )
    .orderByRaw("COALESCE(ps.quality_score, 50) DESC")
    .orderBy("p.created_at", "desc")
    .limit(6);

  const followingNow = await db("posts as p")
    .leftJoin("users as u", "u.id", "p.author_id")
    .whereNull("p.deleted_at")
    .whereIn("p.author_id", followedIds)
    .select("p.id", "p.title", "p.category", "p.created_at", "u.name as author_name")
    .orderBy("p.created_at", "desc")
    .limit(6);

  const latest = await db("posts as p")
    .leftJoin("users as u", "u.id", "p.author_id")
    .whereNull("p.deleted_at")
    .select("p.id", "p.title", "p.category", "p.created_at", "u.name as author_name")
    .orderBy("p.created_at", "desc")
    .limit(8);

  const topAuthors = await db("posts as p")
    .leftJoin("users as u", "u.id", "p.author_id")
    .whereNull("p.deleted_at")
    .where("p.created_at", ">", db.raw("NOW() - INTERVAL '20 days'"))
    .select("u.id", "u.name")
    .count("p.id as post_count")
    .groupBy("u.id", "u.name")
    .orderBy("post_count", "desc")
    .limit(6);

  return res.json({
    hero: topStories[0] || null,
    topStories,
    followingNow,
    latest,
    topAuthors: topAuthors.map((a) => ({ ...a, post_count: Number(a.post_count || 0) })),
  });
});

export default router;
