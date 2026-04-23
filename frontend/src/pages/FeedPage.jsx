import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import api from "../lib/api";

const categories = ["world", "politics", "technology", "sports", "health", "business", "science", "climate"];

function PostComposer({ onCreated }) {
  const [form, setForm] = useState(() => {
    try {
      const raw = localStorage.getItem("newsnest.postDraft");
      if (!raw) {
        return { title: "", body: "", category: "world", image_url: "", source_url: "" };
      }
      const parsed = JSON.parse(raw);
      return {
        title: parsed?.title || "",
        body: parsed?.body || "",
        category: parsed?.category || "world",
        image_url: parsed?.image_url || "",
        source_url: parsed?.source_url || "",
      };
    } catch {
      return { title: "", body: "", category: "world", image_url: "", source_url: "" };
    }
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedDraftAt, setSavedDraftAt] = useState("");

  useEffect(() => {
    localStorage.setItem("newsnest.postDraft", JSON.stringify(form));
    setSavedDraftAt(new Date().toLocaleTimeString());
  }, [form]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.post("/posts", {
        title: form.title,
        body: form.body,
        category: form.category,
        source_url: form.source_url.trim() || undefined,
        image_url: form.image_url.trim() || undefined,
      });
      setForm({ title: "", body: "", category: "world", image_url: "", source_url: "" });
      localStorage.removeItem("newsnest.postDraft");
      setSavedDraftAt("");
      onCreated();
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to publish post. Please verify your fields.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="composer" onSubmit={submit}>
      <h3>Post News</h3>
      {savedDraftAt && <small className="muted-text">Draft auto-saved at {savedDraftAt}</small>}
      <input
        value={form.title}
        onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
        placeholder="Headline"
        required
        minLength={8}
      />
      <textarea
        value={form.body}
        onChange={(e) => setForm((s) => ({ ...s, body: e.target.value }))}
        placeholder="Explain what happened and why it is valuable"
        required
        minLength={20}
      />
      <div className="row-2">
        <select value={form.category} onChange={(e) => setForm((s) => ({ ...s, category: e.target.value }))}>
          {categories.map((c) => (
            <option value={c} key={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          value={form.source_url}
          onChange={(e) => setForm((s) => ({ ...s, source_url: e.target.value }))}
          placeholder="Source URL (optional)"
        />
      </div>
      <input
        value={form.image_url}
        onChange={(e) => setForm((s) => ({ ...s, image_url: e.target.value }))}
        placeholder="Image URL (optional)"
      />
      <button className="primary-btn" disabled={saving} type="submit">
        {saving ? "Publishing..." : "Publish News"}
      </button>
      <button
        className="ghost-btn"
        type="button"
        onClick={() => {
          setForm({ title: "", body: "", category: "world", image_url: "", source_url: "" });
          localStorage.removeItem("newsnest.postDraft");
          setSavedDraftAt("");
          setError("");
        }}
      >
        Clear Draft
      </button>
      {error && <p className="error-text">{error}</p>}
    </form>
  );
}

function PostCard({ item, onReact, onComment, onShare, onReport, onReadLater, isSaved, pending, rollback, failed }) {
  const [comment, setComment] = useState("");
  const hasReacted = Boolean(item.user_reaction);

  return (
    <article className={`post-card ${rollback ? "rollback-flash" : ""}`}>
      <div className="post-meta">
        <span>{item.author_name}</span>
        <span>{new Date(item.created_at).toLocaleString()}</span>
      </div>
      <h3>
        <Link className="post-link" to={`/posts/${item.id}`}>{item.title}</Link>
      </h3>
      <p>{item.body}</p>
      {item.image_url && <img src={item.image_url} alt={item.title} loading="lazy" />}
      <div className="chip-row">
        <span className="chip">{item.category}</span>
        <span className="chip">score {item.quality_score}</span>
        <span className="chip">{item.reaction_count} reactions</span>
        <span className="chip">{item.comment_count} comments</span>
        <span className="chip">{item.share_count || 0} shares</span>
      </div>
      <div className="action-row">
        <button
          type="button"
          className={`action-btn ${item.user_reaction === "like" ? "active" : ""}`}
          disabled={pending.react || hasReacted}
          onClick={() => onReact(item.id, "like")}
        >
          {failed.react ? "↩️ Reverted" : pending.react ? "⏳ Saving..." : "👍 Like"}
        </button>
        <button
          type="button"
          className={`action-btn ${item.user_reaction === "insightful" ? "active" : ""}`}
          disabled={pending.react || hasReacted}
          onClick={() => onReact(item.id, "insightful")}
        >
          💡 Insightful
        </button>
        <button
          type="button"
          className={`action-btn ${item.user_reaction === "support" ? "active" : ""}`}
          disabled={pending.react || hasReacted}
          onClick={() => onReact(item.id, "support")}
        >
          🤝 Support
        </button>
        <button type="button" className="action-btn" disabled={pending.share} onClick={() => onShare(item.id)}>
          {failed.share ? "↩️ Reverted" : pending.share ? "⏳ Sharing..." : "🔁 Share"}
        </button>
        <button type="button" className={`action-btn ${isSaved ? "active" : ""}`} onClick={() => onReadLater(item)}>
          {isSaved ? "✅ Saved" : "🔖 Save"}
        </button>
        <button type="button" className={`action-btn ${pending.reported ? "active" : ""}`} disabled={pending.report || pending.reported} onClick={() => onReport(item.id)}>
          {failed.report ? "↩️ Reverted" : pending.reported ? "🚩 Reported" : pending.report ? "⏳ Reporting..." : "🚩 Report"}
        </button>
      </div>
      <div className="comment-row">
        <input
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Write a comment"
          disabled={pending.comment}
        />
        <button
          className="action-btn"
          type="button"
          disabled={pending.comment}
          onClick={() => {
            if (!comment.trim()) return;
            onComment(item.id, comment.trim());
            setComment("");
          }}
        >
          {failed.comment ? "↩️ Reverted" : pending.comment ? "⏳ Sending..." : "💬 Comment"}
        </button>
      </div>
    </article>
  );
}

export default function FeedPage() {
  const [items, setItems] = useState([]);
  const [limit, setLimit] = useState(24);
  const [seed, setSeed] = useState(() => Date.now() % 9973);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [sections, setSections] = useState({ hero: null, topStories: [], followingNow: [], latest: [], topAuthors: [] });
  const [dashboard, setDashboard] = useState({ publishedToday: 0, unreadMessages: 0, openReports: 0 });
  const [seedStatus, setSeedStatus] = useState({
    target_posts: 220,
    total_posts: 0,
    completion_pct: 0,
    user_authors: 0,
    latest_post_at: null,
    by_category: [],
  });
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState("for-you");
  const [error, setError] = useState("");
  const [actionNotice, setActionNotice] = useState("");
  const [pendingMap, setPendingMap] = useState({});
  const [rollbackMap, setRollbackMap] = useState({});
  const [failedMap, setFailedMap] = useState({});
  const [socialPulse, setSocialPulse] = useState({
    openReports: 0,
    resolvedReports: 0,
    totalFeedbacks: 0,
    latestReport: null,
    latestFeedback: null,
  });
  const [quickFeedback, setQuickFeedback] = useState("");
  const [feedbackNotice, setFeedbackNotice] = useState("");
  const [readLater, setReadLater] = useState(() => {
    try {
      const raw = localStorage.getItem("newsnest.readLater");
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const fetchFeed = async (newSeed = seed, newLimit = limit) => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get(`/feed?limit=${newLimit}&seed=${newSeed}`);
      setItems((data.items || []).map((item) => ({
        ...item,
        reaction_count: Number(item.reaction_count || 0),
        comment_count: Number(item.comment_count || 0),
        share_count: Number(item.share_count || 0),
        user_reaction: item.user_reaction || null,
      })));
      setSeed(data.seed || newSeed);
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to load feed right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed(seed);
    api.get("/users/me/stats").then((res) => setStats(res.data)).catch(() => setStats(null));
    api.get("/users/suggestions").then((res) => setSuggestions(res.data || [])).catch(() => setSuggestions([]));
    api
      .get("/feed/sections")
      .then((res) => setSections(res.data))
      .catch(() => setSections({ hero: null, topStories: [], followingNow: [], latest: [], topAuthors: [] }));
    api
      .get("/users/me/dashboard")
      .then((res) => setDashboard(res.data))
      .catch(() => setDashboard({ publishedToday: 0, unreadMessages: 0, openReports: 0 }));
    api
      .get("/posts/seed/status")
      .then((res) => setSeedStatus(res.data))
      .catch(() =>
        setSeedStatus({
          target_posts: 220,
          total_posts: 0,
          completion_pct: 0,
          user_authors: 0,
          latest_post_at: null,
          by_category: [],
        })
      );
    Promise.all([api.get("/social/my/reports"), api.get("/social/my/feedbacks")])
      .then(([reportsRes, feedbacksRes]) => {
        const reports = reportsRes.data || [];
        const feedbacks = feedbacksRes.data || [];
        const openReports = reports.filter((r) => r.status === "open").length;
        const resolvedReports = reports.filter((r) => r.status !== "open").length;
        setSocialPulse({
          openReports,
          resolvedReports,
          totalFeedbacks: feedbacks.length,
          latestReport: reports[0] || null,
          latestFeedback: feedbacks[0] || null,
        });
      })
      .catch(() => {
        setSocialPulse({
          openReports: 0,
          resolvedReports: 0,
          totalFeedbacks: 0,
          latestReport: null,
          latestFeedback: null,
        });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    localStorage.setItem("newsnest.readLater", JSON.stringify(readLater));
  }, [readLater]);

  const refreshRandom = () => {
    const newSeed = Math.floor(Math.random() * 99991);
    fetchFeed(newSeed, limit);
  };

  const topCategories = useMemo(() => {
    const map = new Map();
    items.forEach((i) => map.set(i.category, (map.get(i.category) || 0) + 1));
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [items]);

  const markFailedAction = (postId, action) => {
    setFailedMap((prev) => ({
      ...prev,
      [postId]: { ...prev[postId], [action]: true },
    }));
    setTimeout(() => {
      setFailedMap((prev) => ({
        ...prev,
        [postId]: { ...prev[postId], [action]: false },
      }));
    }, 1200);
  };

  const reactToPost = async (postId, type) => {
    const existing = items.find((item) => item.id === postId)?.user_reaction;
    if (pendingMap[postId]?.react || existing) return;

    setPendingMap((prev) => ({ ...prev, [postId]: { ...prev[postId], react: true } }));
    setItems((prev) => prev.map((item) => (
      item.id === postId
        ? { ...item, reaction_count: Number(item.reaction_count || 0) + 1, user_reaction: type }
        : item
    )));
    try {
      await api.post(`/social/posts/${postId}/reactions`, { type });
      setActionNotice(`Reaction saved: ${type}`);
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to save reaction.");
      markFailedAction(postId, "react");
      setRollbackMap((prev) => ({ ...prev, [postId]: true }));
      setTimeout(() => setRollbackMap((prev) => ({ ...prev, [postId]: false })), 750);
      fetchFeed(seed, limit);
    } finally {
      setPendingMap((prev) => ({ ...prev, [postId]: { ...prev[postId], react: false } }));
    }
  };

  const commentOnPost = async (postId, content) => {
    if (pendingMap[postId]?.comment) return;

    setPendingMap((prev) => ({ ...prev, [postId]: { ...prev[postId], comment: true } }));
    setItems((prev) => prev.map((item) => (item.id === postId ? { ...item, comment_count: Number(item.comment_count || 0) + 1 } : item)));
    try {
      await api.post(`/social/posts/${postId}/comments`, { content });
      setActionNotice("Comment posted");
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to send comment.");
      markFailedAction(postId, "comment");
      setRollbackMap((prev) => ({ ...prev, [postId]: true }));
      setTimeout(() => setRollbackMap((prev) => ({ ...prev, [postId]: false })), 750);
      fetchFeed(seed, limit);
    } finally {
      setPendingMap((prev) => ({ ...prev, [postId]: { ...prev[postId], comment: false } }));
    }
  };

  const sharePost = async (postId) => {
    if (pendingMap[postId]?.share) return;

    setPendingMap((prev) => ({ ...prev, [postId]: { ...prev[postId], share: true } }));
    setItems((prev) => prev.map((item) => (item.id === postId ? { ...item, share_count: Number(item.share_count || 0) + 1 } : item)));
    try {
      const { data } = await api.post(`/social/posts/${postId}/share`);
      setItems((prev) => prev.map((item) => (item.id === postId ? { ...item, share_count: Number(data?.shares || item.share_count || 0) } : item)));
      setActionNotice("Post shared");
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to share post.");
      markFailedAction(postId, "share");
      setRollbackMap((prev) => ({ ...prev, [postId]: true }));
      setTimeout(() => setRollbackMap((prev) => ({ ...prev, [postId]: false })), 750);
      fetchFeed(seed, limit);
    } finally {
      setPendingMap((prev) => ({ ...prev, [postId]: { ...prev[postId], share: false } }));
    }
  };

  const reportPost = async (postId) => {
    if (pendingMap[postId]?.report || pendingMap[postId]?.reported) return;

    setPendingMap((prev) => ({ ...prev, [postId]: { ...prev[postId], report: true } }));
    try {
      await api.post("/social/reports", { post_id: postId, reason: "Potential misinformation or policy violation" });
      setPendingMap((prev) => ({ ...prev, [postId]: { ...prev[postId], reported: true } }));
      setActionNotice("Report submitted");
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to report post.");
      markFailedAction(postId, "report");
      setRollbackMap((prev) => ({ ...prev, [postId]: true }));
      setTimeout(() => setRollbackMap((prev) => ({ ...prev, [postId]: false })), 750);
    } finally {
      setPendingMap((prev) => ({ ...prev, [postId]: { ...prev[postId], report: false } }));
    }
  };

  const followUser = async (userId) => {
    setSuggestions((prev) => prev.filter((s) => s.id !== userId));
    try {
      await api.post(`/social/follow/${userId}`);
      setActionNotice("User followed");
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to follow user.");
      const list = await api.get("/users/suggestions");
      setSuggestions(list.data || []);
    }
  };

  const submitQuickFeedback = async () => {
    if (!quickFeedback.trim()) {
      return;
    }

    try {
      await api.post("/social/feedback", { message: quickFeedback.trim() });
      setFeedbackNotice("Feedback sent. Thank you for improving the community.");
      setQuickFeedback("");

      const feedbacksRes = await api.get("/social/my/feedbacks");
      const feedbacks = feedbacksRes.data || [];
      setSocialPulse((prev) => ({
        ...prev,
        totalFeedbacks: feedbacks.length,
        latestFeedback: feedbacks[0] || null,
      }));
    } catch (err) {
      setFeedbackNotice(err?.response?.data?.message || "Unable to submit feedback now.");
    }
  };

  const toggleReadLater = (item) => {
    setReadLater((prev) => {
      const exists = prev.some((r) => r.id === item.id);
      if (exists) {
        return prev.filter((r) => r.id !== item.id);
      }
      const next = [
        {
          id: item.id,
          title: item.title,
          category: item.category,
          author_name: item.author_name,
          created_at: item.created_at,
          source_url: item.source_url || "",
        },
        ...prev,
      ];
      return next.slice(0, 25);
    });
  };

  const filteredItems = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return items.filter((item) => {
      if (viewMode === "high-score" && Number(item.quality_score || 0) < 75) {
        return false;
      }
      if (viewMode === "discovery" && Number(item.quality_score || 0) >= 75) {
        return false;
      }
      if (!keyword) {
        return true;
      }
      return (
        item.title.toLowerCase().includes(keyword) ||
        item.body.toLowerCase().includes(keyword) ||
        item.category.toLowerCase().includes(keyword)
      );
    });
  }, [items, query, viewMode]);

  return (
    <main className="feed-layout">
      <aside className="left-rail">
        <PostComposer onCreated={() => fetchFeed(seed, limit)} />
      </aside>
      <section className="feed-main">
        {sections.hero && (
          <article className="hero-story">
            <div>
              <small>Featured Story</small>
              <h3>{sections.hero.title}</h3>
              <p>
                {sections.hero.author_name} | {sections.hero.category} | quality {sections.hero.quality_score}
              </p>
            </div>
            {sections.hero.image_url && <img src={sections.hero.image_url} alt={sections.hero.title} loading="lazy" />}
          </article>
        )}

        <div className="feed-head">
          <div>
            <h2>Dynamic Timeline</h2>
            <p>Seed: {seed} | Refresh reshuffles with relevance-first ranking. Showing {filteredItems.length} stories.</p>
          </div>
          <div className="action-row">
            <button className="primary-btn" type="button" onClick={refreshRandom}>
              Refresh Feed
            </button>
            <button
              className="ghost-btn"
              type="button"
              onClick={() => {
                const next = limit + 12;
                setLimit(next);
                fetchFeed(seed, next);
              }}
            >
              Load More
            </button>
          </div>
        </div>

        {error && <p className="error-text">{error}</p>}
        {actionNotice && <p>{actionNotice}</p>}

        <div className="feed-controls">
          <div className="tab-row">
            <button type="button" className={viewMode === "for-you" ? "tab active-tab" : "tab"} onClick={() => setViewMode("for-you")}>For You</button>
            <button type="button" className={viewMode === "high-score" ? "tab active-tab" : "tab"} onClick={() => setViewMode("high-score")}>High Value</button>
            <button type="button" className={viewMode === "discovery" ? "tab active-tab" : "tab"} onClick={() => setViewMode("discovery")}>Discovery</button>
          </div>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter feed by keyword/category" />
        </div>

        <div className="quick-panels">
          <div className="mini-item">
            <strong>Published Today</strong>
            <p>{dashboard.publishedToday}</p>
          </div>
          <div className="mini-item">
            <strong>Unread Messages</strong>
            <p>{dashboard.unreadMessages}</p>
          </div>
          <div className="mini-item">
            <strong>Open Reports</strong>
            <p>{dashboard.openReports}</p>
          </div>
        </div>

        <div className="section-rail">
          <div className="inline-section">
            <h4>Top Stories</h4>
            {sections.topStories.slice(0, 4).map((s) => (
              <p key={s.id}>{s.title}</p>
            ))}
          </div>
          <div className="inline-section">
            <h4>Following Now</h4>
            {sections.followingNow.slice(0, 4).map((s) => (
              <p key={s.id}>{s.author_name}: {s.title}</p>
            ))}
          </div>
          <div className="inline-section">
            <h4>Latest Updates</h4>
            {sections.latest.slice(0, 4).map((s) => (
              <p key={s.id}>{s.title}</p>
            ))}
          </div>
        </div>

        {loading && <p>Loading news feed...</p>}
        <div className="feed-grid">
          {filteredItems.map((item) => (
            <PostCard
              key={item.id}
              item={item}
              onReact={reactToPost}
              onComment={commentOnPost}
              onShare={sharePost}
              onReport={reportPost}
              onReadLater={toggleReadLater}
              isSaved={readLater.some((r) => r.id === item.id)}
              pending={{
                react: Boolean(pendingMap[item.id]?.react),
                comment: Boolean(pendingMap[item.id]?.comment),
                share: Boolean(pendingMap[item.id]?.share),
                report: Boolean(pendingMap[item.id]?.report),
                reported: Boolean(pendingMap[item.id]?.reported),
              }}
              rollback={Boolean(rollbackMap[item.id])}
              failed={{
                react: Boolean(failedMap[item.id]?.react),
                comment: Boolean(failedMap[item.id]?.comment),
                share: Boolean(failedMap[item.id]?.share),
                report: Boolean(failedMap[item.id]?.report),
              }}
            />
          ))}
        </div>
      </section>
      <aside className="right-rail">
        <div className="side-card">
          <h3>My Activity</h3>
          {stats && (
            <>
              <p>Posts: {stats.posts}</p>
              <p>Followers: {stats.followers}</p>
              <p>Following: {stats.following}</p>
              <p>Reactions: {stats.reactions}</p>
            </>
          )}
        </div>
        <div className="side-card" style={{ marginTop: 12 }}>
          <h3>Trending Categories</h3>
          {topCategories.map(([name, count]) => (
            <p key={name}>
              {name}: {count}
            </p>
          ))}
        </div>
        <div className="side-card" style={{ marginTop: 12 }}>
          <h3>Who To Follow</h3>
          {suggestions.map((s) => (
            <div className="mini-item" key={s.id}>
              <strong>{s.name}</strong>
              <p>{s.bio || "Citizen journalist"}</p>
              <button className="ghost-btn" type="button" onClick={() => followUser(s.id)}>
                Follow
              </button>
            </div>
          ))}
        </div>
        <div className="side-card" style={{ marginTop: 12 }}>
          <h3>Top Authors</h3>
          {sections.topAuthors.map((a) => (
            <p key={a.id}>{a.name}: {a.post_count} posts</p>
          ))}
        </div>
        <div className="side-card" style={{ marginTop: 12 }}>
          <h3>Dataset Health</h3>
          <p className="muted-text">Seed pipeline visibility for trustable content volume.</p>
          <div className="mini-item">
            <strong>{seedStatus.total_posts} / {seedStatus.target_posts} posts ready</strong>
            <div className="meter">
              <span style={{ width: `${seedStatus.completion_pct}%` }} />
            </div>
            <small>{seedStatus.completion_pct}% seed target completion</small>
            <p style={{ marginBottom: 0 }}>Active authors: {seedStatus.user_authors}</p>
            <p>
              Latest publish: {seedStatus.latest_post_at ? new Date(seedStatus.latest_post_at).toLocaleString() : "No posts yet"}
            </p>
          </div>
          {seedStatus.by_category.slice(0, 4).map((row) => (
            <div className="mini-item" key={row.category}>
              <strong>{row.category}</strong>
              <p>{row.count} posts</p>
            </div>
          ))}
        </div>
        <div className="side-card" style={{ marginTop: 12 }}>
          <h3>Social Hub</h3>
          <p className="muted-text">Track your reports and send quick platform feedback.</p>
          <div className="mini-item">
            <p style={{ marginBottom: 6 }}>Open reports: {socialPulse.openReports}</p>
            <p style={{ marginTop: 0 }}>Resolved reports: {socialPulse.resolvedReports}</p>
            <p style={{ margin: 0 }}>Feedback sent: {socialPulse.totalFeedbacks}</p>
          </div>
          {socialPulse.latestReport && (
            <div className="mini-item">
              <strong>Latest Report</strong>
              <p>{socialPulse.latestReport.reason}</p>
              <small>{socialPulse.latestReport.status}</small>
            </div>
          )}
          {socialPulse.latestFeedback && (
            <div className="mini-item">
              <strong>Latest Feedback</strong>
              <p>{socialPulse.latestFeedback.message}</p>
            </div>
          )}
          <div className="mini-item">
            <strong>Quick Feedback</strong>
            <textarea
              rows={3}
              value={quickFeedback}
              onChange={(e) => setQuickFeedback(e.target.value)}
              placeholder="Share one idea to improve trust, moderation, or user experience"
            />
            <button className="ghost-btn" type="button" onClick={submitQuickFeedback} style={{ marginTop: 8 }}>
              Send Feedback
            </button>
            {feedbackNotice && <small>{feedbackNotice}</small>}
          </div>
        </div>
        <div className="side-card" style={{ marginTop: 12 }}>
          <h3>Read Later</h3>
          <p className="muted-text">Save important stories and return quickly.</p>
          {readLater.length === 0 && <p>No saved stories yet.</p>}
          {readLater.map((entry) => (
            <div className="mini-item" key={entry.id}>
              <strong>{entry.title}</strong>
              <p>
                {entry.author_name} | {entry.category}
              </p>
              <div className="action-row">
                {entry.source_url ? (
                  <a className="ghost-btn" href={entry.source_url} target="_blank" rel="noreferrer">
                    Open Source
                  </a>
                ) : (
                  <button className="ghost-btn" type="button" disabled>
                    No Source Link
                  </button>
                )}
                <button className="ghost-btn" type="button" onClick={() => setReadLater((prev) => prev.filter((r) => r.id !== entry.id))}>
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </aside>
    </main>
  );
}
