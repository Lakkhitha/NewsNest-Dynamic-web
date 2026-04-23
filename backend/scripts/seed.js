import bcrypt from "bcryptjs";
import { db } from "../src/db/knex.js";
import { generateSampleNews } from "../src/modules/seed/sampleNews.js";

async function ensureUsers() {
  const adminExists = await db("users").where({ email: "admin@newsnest.app" }).first();
  if (!adminExists) {
    const password_hash = await bcrypt.hash("Admin@123", 10);
    await db("users").insert({
      name: "NewsNest Admin",
      email: "admin@newsnest.app",
      password_hash,
      role: "admin",
      bio: "Platform moderator",
      avatar_url: "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg",
    });
  }

  const baseUsers = [
    ["Luna Report", "luna@newsnest.app"],
    ["Kai Global", "kai@newsnest.app"],
    ["Maya Daily", "maya@newsnest.app"],
    ["Ravi Insight", "ravi@newsnest.app"],
    ["Sara Brief", "sara@newsnest.app"],
  ];

  for (const [name, email] of baseUsers) {
    const exists = await db("users").where({ email }).first();
    if (!exists) {
      const password_hash = await bcrypt.hash("User@123", 10);
      await db("users").insert({
        name,
        email,
        password_hash,
        role: "user",
        bio: "Citizen journalist on NewsNest",
      });
    }
  }
}

async function seedPosts() {
  const targetCount = 220;
  const countRes = await db("posts").count("id as count").first();
  const count = Number(countRes?.count || 0);
  if (count >= targetCount) {
    console.log(`Posts already seeded (${count}). Skipping.`);
    return;
  }

  const users = await db("users").where({ role: "user" }).select("id");
  const remaining = targetCount - count;
  const news = generateSampleNews(remaining);

  for (let i = 0; i < news.length; i += 1) {
    const author = users[i % users.length];
    const item = news[i];
    const [post] = await db("posts")
      .insert({
        author_id: author.id,
        title: item.title,
        body: item.body,
        source_url: item.source_url,
        image_url: item.image_url,
        category: item.category,
        created_at: item.created_at,
      })
      .returning(["id"]);

    await db("post_scores").insert({
      post_id: post.id,
      quality_score: item.quality_score,
      recency_factor: 1,
      engagement_score: Number((Math.random() * 20).toFixed(2)),
    });

    if (i % 3 === 0) {
      await db("comments").insert({
        post_id: post.id,
        author_id: author.id,
        content: "This is an early community discussion comment.",
      });
    }
  }

  console.log(`Seeded users and ${remaining} additional news posts.`);
}

async function run() {
  try {
    await ensureUsers();
    await seedPosts();
  } catch (error) {
    console.error("Seed failed:", error.message);
    process.exitCode = 1;
  } finally {
    await db.destroy();
  }
}

run();
