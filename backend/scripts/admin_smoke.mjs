/**
 * Admin smoke test script - verifies admin panel endpoints work with demo data.
 * Run: cd backend && npm run db:seed && node scripts/admin_smoke.mjs
 * Expected: All console.logs show expected status 200/2xx codes.
 */
const base = "http://localhost:4000/api";

async function main() {
  const login = await fetch(`${base}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "admin@newsnest.app", password: "Admin@123" }),
  });

  const loginData = await login.json();
  const authHeaders = {
    Authorization: `Bearer ${loginData.token}`,
    "content-type": "application/json",
  };

  const usersRes = await fetch(`${base}/admin/users`, { headers: authHeaders });
  const users = await usersRes.json();
  const target = users.find((user) => user.email !== "admin@newsnest.app");

  const roleRes = await fetch(`${base}/admin/users/${target.id}/role`, {
    method: "PATCH",
    headers: authHeaders,
    body: JSON.stringify({ role: "moderator" }),
  });

  console.log("role_status", roleRes.status);
  console.log("role_body", await roleRes.text());

  await fetch(`${base}/admin/users/${target.id}/role`, {
    method: "PATCH",
    headers: authHeaders,
    body: JSON.stringify({ role: "user" }),
  });

  const postsRes = await fetch(`${base}/admin/posts?status=active`, { headers: authHeaders });
  const posts = await postsRes.json();
  const post = posts[0];

  const hideRes = await fetch(`${base}/admin/posts/${post.id}/hide`, {
    method: "PATCH",
    headers: { Authorization: authHeaders.Authorization },
  });

  console.log("hide_status", hideRes.status);
  console.log("hide_body", await hideRes.text());

  await fetch(`${base}/admin/posts/${post.id}/restore`, {
    method: "PATCH",
    headers: { Authorization: authHeaders.Authorization },
  });

  const commentsRes = await fetch(`${base}/admin/comments`, { headers: { Authorization: authHeaders.Authorization } });
  const comments = await commentsRes.json();
  console.log("comments_count", comments.length);

  const openReportIds = users.length > 0
    ? (await (await fetch(`${base}/admin/reports`, { headers: authHeaders })).json())
      .filter((report) => report.status === "open")
      .slice(0, 2)
      .map((report) => Number(report.id))
    : [];

  if (openReportIds.length > 0) {
    const bulkReportsRes = await fetch(`${base}/admin/reports/bulk-resolve`, {
      method: "PATCH",
      headers: authHeaders,
      body: JSON.stringify({ reportIds: openReportIds }),
    });
    console.log("bulk_reports_status", bulkReportsRes.status);
  }

  const removableCommentIds = comments.slice(0, 1).map((comment) => Number(comment.id));
  if (removableCommentIds.length > 0) {
    const bulkCommentsRes = await fetch(`${base}/admin/comments/bulk-remove`, {
      method: "PATCH",
      headers: authHeaders,
      body: JSON.stringify({ commentIds: removableCommentIds }),
    });
    console.log("bulk_comments_status", bulkCommentsRes.status);
  }

  const auditRes = await fetch(`${base}/admin/audit-logs?entityType=post&action=post.`, {
    headers: { Authorization: authHeaders.Authorization },
  });
  const auditLogs = await auditRes.json();
  console.log("audit_status", auditRes.status);
  console.log("audit_count", Array.isArray(auditLogs) ? auditLogs.length : 0);
  if (Array.isArray(auditLogs) && auditLogs.length > 0) {
    console.log("audit_first", `${auditLogs[0].action}:${auditLogs[0].entity_type}`);
  }

  const exportRes = await fetch(`${base}/admin/export?dataset=reports&format=csv&limit=20`, {
    headers: { Authorization: authHeaders.Authorization },
  });
  ");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
