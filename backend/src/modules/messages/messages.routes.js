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

  return { limit, offset };
}

const sendSchema = z.object({
  recipient_id: z.number().int().positive(),
  content: z.string().trim().min(1).max(600),
});

router.post("/", requireAuth, async (req, res) => {
  const parsed = sendSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid message payload" });
  }

  const { recipient_id, content } = parsed.data;
  if (recipient_id === req.user.id) {
    return res.status(400).json({ message: "Cannot message yourself" });
  }

  const recipient = await db("users")
    .where({ id: recipient_id })
    .first("id", "role");

  if (!recipient) {
    return res.status(404).json({ message: "Recipient not found" });
  }

  if (recipient.role === "suspended") {
    return res.status(403).json({ message: "Recipient is unavailable" });
  }

  const [message] = await db("messages")
    .insert({
      sender_id: req.user.id,
      recipient_id,
      content,
    })
    .returning(["id", "sender_id", "recipient_id", "content", "created_at"]);

  return res.status(201).json(message);
});

router.get("/conversations", requireAuth, async (req, res) => {
  const userId = req.user.id;
  const { limit, offset } = readPagination(req.query, { defaultLimit: 300, maxLimit: 500 });

  const rows = await db("messages as m")
    .leftJoin("users as su", "su.id", "m.sender_id")
    .leftJoin("users as ru", "ru.id", "m.recipient_id")
    .where("m.sender_id", userId)
    .orWhere("m.recipient_id", userId)
    .select(
      "m.id",
      "m.sender_id",
      "m.recipient_id",
      "m.content",
      "m.is_read",
      "m.created_at",
      "su.name as sender_name",
      "ru.name as recipient_name"
    )
    .orderBy("m.created_at", "desc")
    .offset(offset)
    .limit(limit);

  const map = new Map();
  for (const row of rows) {
    const partnerId = row.sender_id === userId ? row.recipient_id : row.sender_id;
    const partnerName = row.sender_id === userId ? row.recipient_name : row.sender_name;

    if (!map.has(partnerId)) {
      map.set(partnerId, {
        partner_id: partnerId,
        partner_name: partnerName,
        latest_message: row.content,
        latest_at: row.created_at,
        unread: 0,
      });
    }

    if (row.recipient_id === userId && !row.is_read) {
      map.get(partnerId).unread += 1;
    }
  }

  return res.json(Array.from(map.values()));
});

router.get("/thread/:userId", requireAuth, async (req, res) => {
  const userId = req.user.id;
  const partnerId = Number(req.params.userId);
  const { limit, offset } = readPagination(req.query, { defaultLimit: 500, maxLimit: 600 });

  const thread = await db("messages")
    .where(function whereThread() {
      this.where({ sender_id: userId, recipient_id: partnerId }).orWhere({
        sender_id: partnerId,
        recipient_id: userId,
      });
    })
    .orderBy("created_at", "asc")
    .offset(offset)
    .limit(limit);

  await db("messages")
    .where({ sender_id: partnerId, recipient_id: userId, is_read: false })
    .update({ is_read: true });

  return res.json(thread);
});

export default router;
