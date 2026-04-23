import { useEffect, useState } from "react";
import api from "../lib/api";

export default function AdminPage() {
  const [stats, setStats] = useState(null);
  const [reports, setReports] = useState([]);
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [comments, setComments] = useState([]);
  const [messages, setMessages] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [activities, setActivities] = useState({ latestPosts: [], latestComments: [] });
  const [activeTab, setActiveTab] = useState("overview");
  const [postStatusFilter, setPostStatusFilter] = useState("all");
  const [exportDataset, setExportDataset] = useState("reports");
  const [exportFormat, setExportFormat] = useState("json");
  const [exporting, setExporting] = useState(false);
  const [auditActionFilter, setAuditActionFilter] = useState("");
  const [auditEntityFilter, setAuditEntityFilter] = useState("");
  const [selectedReports, setSelectedReports] = useState([]);
  const [selectedComments, setSelectedComments] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const load = async (status = postStatusFilter) => {
    try {
      const [statsRes, reportsRes, usersRes, feedbacksRes, activitiesRes, postsRes, commentsRes, messagesRes, auditLogsRes] = await Promise.all([
        api.get("/admin/stats"),
        api.get("/admin/reports"),
        api.get("/admin/users"),
        api.get("/admin/feedbacks"),
        api.get("/admin/activities"),
        api.get(`/admin/posts?status=${status}`),
        api.get("/admin/comments"),
        api.get("/admin/messages"),
        api.get(`/admin/audit-logs?action=${encodeURIComponent(auditActionFilter)}&entityType=${encodeURIComponent(auditEntityFilter)}`),
      ]);
      setStats(statsRes.data);
      setReports(reportsRes.data);
      setUsers(usersRes.data || []);
      setFeedbacks(feedbacksRes.data || []);
      setActivities(activitiesRes.data || { latestPosts: [], latestComments: [] });
      setPosts(postsRes.data || []);
      setComments(commentsRes.data || []);
      setMessages(messagesRes.data || []);
      setAuditLogs(auditLogsRes.data || []);
      setError("");
      setNotice("");
    } catch (err) {
      setError(err.response?.data?.message || "Admin access required");
    }
  };

  useEffect(() => {
    load(postStatusFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postStatusFilter, auditActionFilter, auditEntityFilter]);

  const resolve = async (id) => {
    await api.patch(`/admin/reports/${id}/resolve`);
    setNotice("Report resolved");
    load(postStatusFilter);
  };

  const resolveBulkReports = async () => {
    if (selectedReports.length === 0) return;
    await api.patch("/admin/reports/bulk-resolve", { reportIds: selectedReports });
    setNotice(`Resolved ${selectedReports.length} reports`);
    setSelectedReports([]);
    load(postStatusFilter);
  };

  const updateRole = async (userId, role) => {
    await api.patch(`/admin/users/${userId}/role`, { role });
    setNotice("User role updated");
    load(postStatusFilter);
  };

  const hidePost = async (postId) => {
    await api.patch(`/admin/posts/${postId}/hide`);
    setNotice("Post hidden");
    load(postStatusFilter);
  };

  const restorePost = async (postId) => {
    await api.patch(`/admin/posts/${postId}/restore`);
    setNotice("Post restored");
    load(postStatusFilter);
  };

  const deleteMessage = async (messageId) => {
    await api.delete(`/admin/messages/${messageId}`);
    setNotice("Message deleted");
    load(postStatusFilter);
  };

  const deleteComment = async (commentId) => {
    await api.delete(`/admin/comments/${commentId}`);
    setNotice("Comment removed");
    load(postStatusFilter);
  };

  const deleteBulkComments = async () => {
    if (selectedComments.length === 0) return;
    await api.patch("/admin/comments/bulk-remove", { commentIds: selectedComments });
    setNotice(`Removed ${selectedComments.length} comments`);
    setSelectedComments([]);
    load(postStatusFilter);
  };

  const toggleReportSelection = (id) => {
    setSelectedReports((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleCommentSelection = (id) => {
    setSelectedComments((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const deleteFeedback = async (feedbackId) => {
    await api.delete(`/admin/feedbacks/${feedbackId}`);
    setNotice("Feedback removed");
    load(postStatusFilter);
  };

  const viewUserDetails = async (userId) => {
    const { data } = await api.get(`/admin/users/${userId}/details`);
    setSelectedUser(data);
  };

  const exportModerationSnapshot = async () => {
    try {
      setExporting(true);
      const query = `/admin/export?dataset=${encodeURIComponent(exportDataset)}&format=${encodeURIComponent(exportFormat)}&status=${encodeURIComponent(postStatusFilter)}&limit=1000`;
      const response = await api.get(query, { responseType: "blob" });
      const disposition = response.headers["content-disposition"] || "";
      const filenameMatch = disposition.match(/filename=\"?([^\";]+)\"?/i);
      const filename = filenameMatch?.[1] || `moderation-${exportDataset}.${exportFormat}`;

      const blobUrl = window.URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
      setNotice(`Export ready: ${filename}`);
    } catch (err) {
      setError(err.response?.data?.message || "Export failed");
    } finally {
      setExporting(false);
    }
  };

  if (error) {
    return (
      <main className="simple-page">
        <h2>Admin Panel</h2>
        <p className="error-text">{error}</p>
      </main>
    );
  }

  return (
    <main className="simple-page">
      <div className="feed-head">
        <h2>Admin Control Center</h2>
        <div className="action-row">
          <select value={exportDataset} onChange={(e) => setExportDataset(e.target.value)}>
            <option value="reports">Reports</option>
            <option value="comments">Comments</option>
            <option value="posts">Posts</option>
            <option value="messages">Messages</option>
            <option value="feedbacks">Feedbacks</option>
          </select>
          <select value={exportFormat} onChange={(e) => setExportFormat(e.target.value)}>
            <option value="json">JSON</option>
            <option value="csv">CSV</option>
          </select>
          <button className="primary-btn" type="button" onClick={exportModerationSnapshot} disabled={exporting}>
            {exporting ? "Exporting..." : "Export"}
          </button>
          <button className="primary-btn" type="button" onClick={() => load(postStatusFilter)}>
            Refresh All
          </button>
        </div>
      </div>
      {notice && <p>{notice}</p>}

      <div className="tab-row" style={{ marginBottom: 12 }}>
        <button type="button" className={activeTab === "overview" ? "tab active-tab" : "tab"} onClick={() => setActiveTab("overview")}>Overview</button>
        <button type="button" className={activeTab === "users" ? "tab active-tab" : "tab"} onClick={() => setActiveTab("users")}>Users</button>
        <button type="button" className={activeTab === "posts" ? "tab active-tab" : "tab"} onClick={() => setActiveTab("posts")}>Posts</button>
        <button type="button" className={activeTab === "reports" ? "tab active-tab" : "tab"} onClick={() => setActiveTab("reports")}>Reports</button>
        <button type="button" className={activeTab === "comments" ? "tab active-tab" : "tab"} onClick={() => setActiveTab("comments")}>Comments</button>
        <button type="button" className={activeTab === "messages" ? "tab active-tab" : "tab"} onClick={() => setActiveTab("messages")}>Messages</button>
        <button type="button" className={activeTab === "feedbacks" ? "tab active-tab" : "tab"} onClick={() => setActiveTab("feedbacks")}>Feedbacks</button>
        <button type="button" className={activeTab === "audit" ? "tab active-tab" : "tab"} onClick={() => setActiveTab("audit")}>Audit</button>
      </div>

      {stats && (
        <div className="stats-grid">
          <div className="stat-card"><h4>Users</h4><p>{stats.users}</p></div>
          <div className="stat-card"><h4>Posts</h4><p>{stats.posts}</p></div>
          <div className="stat-card"><h4>Open Reports</h4><p>{stats.reportsOpen}</p></div>
          <div className="stat-card"><h4>Feedbacks</h4><p>{stats.feedbacks}</p></div>
          <div className="stat-card"><h4>Messages</h4><p>{stats.messages}</p></div>
        </div>
      )}

      {activeTab === "overview" && (
        <section className="reports-section">
          <h3>Latest Activities</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <h4>Latest Posts</h4>
              {activities.latestPosts.slice(0, 8).map((p) => (
                <p key={p.id}>{p.title}</p>
              ))}
            </div>
            <div className="stat-card">
              <h4>Latest Comments</h4>
              {activities.latestComments.slice(0, 8).map((c) => (
                <p key={c.id}>{c.content}</p>
              ))}
            </div>
          </div>
        </section>
      )}

      {activeTab === "users" && (
        <section className="reports-section">
          <h3>User Controls</h3>
          {users.map((u) => (
            <div className="report-item" key={u.id}>
              <div>
                <strong>{u.name}</strong>
                <p>{u.email}</p>
                <small>Current role: {u.role}</small>
              </div>
              <div className="action-row">
                <button className="ghost-btn" type="button" onClick={() => viewUserDetails(u.id)}>Details</button>
                <button className="ghost-btn" type="button" onClick={() => updateRole(u.id, "moderator")}>Moderator</button>
                <button className="ghost-btn" type="button" onClick={() => updateRole(u.id, "user")}>User</button>
                <button className="ghost-btn" type="button" onClick={() => updateRole(u.id, "suspended")}>Suspend</button>
              </div>
            </div>
          ))}
          {selectedUser && (
            <div className="stat-card" style={{ marginTop: 10 }}>
              <h4>Selected User Details</h4>
              <p>{selectedUser.user.name} ({selectedUser.user.email})</p>
              <p>Posts: {selectedUser.summary.posts}</p>
              <p>Comments: {selectedUser.summary.comments}</p>
              <p>Reports: {selectedUser.summary.reports}</p>
            </div>
          )}
        </section>
      )}

      {activeTab === "posts" && (
        <section className="reports-section">
          <div className="feed-head">
            <h3>Post Moderation</h3>
            <select value={postStatusFilter} onChange={(e) => setPostStatusFilter(e.target.value)}>
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="hidden">Hidden</option>
            </select>
          </div>
          {posts.map((p) => (
            <div className="report-item" key={p.id}>
              <div>
                <strong>{p.title}</strong>
                <p>{p.author_name} | {p.category}</p>
                <small>Quality {p.quality_score} | Open reports {p.open_report_count}</small>
              </div>
              <div className="action-row">
                {!p.deleted_at ? (
                  <button className="ghost-btn" type="button" onClick={() => hidePost(p.id)}>Hide</button>
                ) : (
                  <button className="ghost-btn" type="button" onClick={() => restorePost(p.id)}>Restore</button>
                )}
              </div>
            </div>
          ))}
        </section>
      )}

      {activeTab === "reports" && (
        <section className="reports-section">
          <div className="feed-head">
            <h3>Reported News</h3>
            <button className="ghost-btn" type="button" onClick={resolveBulkReports} disabled={selectedReports.length === 0}>
              Resolve Selected ({selectedReports.length})
            </button>
          </div>
          {reports.map((r) => (
            <div className="report-item" key={r.id}>
              <div>
                <input
                  type="checkbox"
                  checked={selectedReports.includes(r.id)}
                  onChange={() => toggleReportSelection(r.id)}
                  style={{ marginRight: 8 }}
                />
                <strong>{r.post_title || "Removed post"}</strong>
                <p>Reason: {r.reason}</p>
                <small>Status: {r.status}</small>
              </div>
              {r.status === "open" && (
                <button className="ghost-btn" onClick={() => resolve(r.id)} type="button">
                  Resolve
                </button>
              )}
            </div>
          ))}
        </section>
      )}

      {activeTab === "messages" && (
        <section className="reports-section">
          <h3>User Messages</h3>
          {messages.map((m) => (
            <div className="report-item" key={m.id}>
              <div>
                <strong>{m.sender_name} {'->'} {m.recipient_name}</strong>
                <p>{m.content}</p>
                <small>{new Date(m.created_at).toLocaleString()}</small>
              </div>
              <button className="ghost-btn" type="button" onClick={() => deleteMessage(m.id)}>Delete</button>
            </div>
          ))}
        </section>
      )}

      {activeTab === "comments" && (
        <section className="reports-section">
          <div className="feed-head">
            <h3>Comment Moderation</h3>
            <button className="ghost-btn" type="button" onClick={deleteBulkComments} disabled={selectedComments.length === 0}>
              Remove Selected ({selectedComments.length})
            </button>
          </div>
          {comments.map((c) => (
            <div className="report-item" key={c.id}>
              <div>
                <input
                  type="checkbox"
                  checked={selectedComments.includes(c.id)}
                  onChange={() => toggleCommentSelection(c.id)}
                  style={{ marginRight: 8 }}
                />
                <strong>{c.author_name}</strong>
                <p>{c.content}</p>
                <small>{c.post_title}</small>
              </div>
              <button className="ghost-btn" type="button" onClick={() => deleteComment(c.id)}>Remove</button>
            </div>
          ))}
        </section>
      )}

      {activeTab === "feedbacks" && (
        <section className="reports-section">
          <h3>Feedback Management</h3>
          {feedbacks.map((f) => (
            <div className="report-item" key={f.id}>
              <div>
                <strong>{f.user_name}</strong>
                <p>{f.message}</p>
                <small>{new Date(f.created_at).toLocaleString()}</small>
              </div>
              <button className="ghost-btn" type="button" onClick={() => deleteFeedback(f.id)}>Remove</button>
            </div>
          ))}
        </section>
      )}

      {activeTab === "audit" && (
        <section className="reports-section">
          <div className="feed-head">
            <h3>Audit Timeline</h3>
            <div className="action-row">
              <input
                type="text"
                value={auditActionFilter}
                onChange={(e) => setAuditActionFilter(e.target.value)}
                placeholder="Filter action"
              />
              <input
                type="text"
                value={auditEntityFilter}
                onChange={(e) => setAuditEntityFilter(e.target.value)}
                placeholder="Filter entity"
              />
            </div>
          </div>
          {auditLogs.length === 0 && <p>No audit events found.</p>}
          {auditLogs.map((event) => (
            <div className="report-item" key={event.id}>
              <div>
                <strong>{event.action}</strong>
                <p>{event.actor_name || "Unknown admin"} on {event.entity_type}{event.entity_id ? ` #${event.entity_id}` : ""}</p>
                <small>{new Date(event.created_at).toLocaleString()}</small>
                {event.metadata && Object.keys(event.metadata).length > 0 && (
                  <pre style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{JSON.stringify(event.metadata, null, 2)}</pre>
                )}
              </div>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
