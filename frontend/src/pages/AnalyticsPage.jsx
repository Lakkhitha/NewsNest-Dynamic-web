import { useEffect, useState } from "react";
import api from "../lib/api";

function formatCompact(value) {
  return new Intl.NumberFormat("en", { notation: "compact" }).format(Number(value || 0));
}

function formatDay(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function AnalyticsPage() {
  const [overview, setOverview] = useState(null);
  const [categories, setCategories] = useState([]);
  const [quality, setQuality] = useState({ high: 0, medium: 0, low: 0 });
  const [trend, setTrend] = useState({ posts: [], reactions: [], comments: [] });
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [a, b, c, d, e] = await Promise.all([
          api.get("/analytics/overview"),
          api.get("/analytics/category-trends"),
          api.get("/analytics/quality-distribution"),
          api.get("/analytics/engagement-trend"),
          api.get("/analytics/author-leaderboard"),
        ]);
        setOverview(a.data);
        setCategories(b.data || []);
        setQuality(c.data || { high: 0, medium: 0, low: 0 });
        setTrend(d.data || { posts: [], reactions: [], comments: [] });
        setLeaders(e.data || []);
      } catch (err) {
        setError(err?.response?.data?.message || "Unable to load analytics right now.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const totalQuality = Number(quality.high) + Number(quality.medium) + Number(quality.low);

  const qualityBands = [
    { key: "high", label: "High (80+)", value: Number(quality.high || 0) },
    { key: "medium", label: "Medium (60-79)", value: Number(quality.medium || 0) },
    { key: "low", label: "Low (<60)", value: Number(quality.low || 0) },
  ];

  const trendCards = [
    { key: "posts", title: "Posts", rows: trend.posts || [] },
    { key: "reactions", title: "Reactions", rows: trend.reactions || [] },
    { key: "comments", title: "Comments", rows: trend.comments || [] },
  ];

  return (
    <main className="simple-page analytics-page">
      <header className="analytics-head">
        <div>
          <h2>Analytics Command Center</h2>
          <p className="muted-text">Track growth, quality, and engagement in one place.</p>
        </div>
      </header>

      {error && <p className="error-text">{error}</p>}
      {loading && <p>Loading analytics...</p>}

      {overview && (
        <section className="stats-grid analytics-kpis">
          <article className="stat-card">
            <h4>Total Users</h4>
            <p>{formatCompact(overview.users)}</p>
          </article>
          <article className="stat-card">
            <h4>Total Posts</h4>
            <p>{formatCompact(overview.posts)}</p>
          </article>
          <article className="stat-card">
            <h4>Total Reactions</h4>
            <p>{formatCompact(overview.reactions)}</p>
          </article>
          <article className="stat-card">
            <h4>Total Comments</h4>
            <p>{formatCompact(overview.comments)}</p>
          </article>
          <article className="stat-card">
            <h4>Avg News Score</h4>
            <p>{overview.avgScore}</p>
          </article>
        </section>
      )}

      <section className="reports-section">
        <h3>Category Trends</h3>
        <div className="stats-grid analytics-categories">
          {categories.map((row) => (
            <article className="stat-card" key={row.category}>
              <h4>{row.category}</h4>
              <p>{formatCompact(row.count)}</p>
              <div className="meter"><span style={{ width: `${Math.min(100, row.count * 6)}%` }} /></div>
            </article>
          ))}
        </div>
      </section>

      <section className="reports-section analytics-duo-grid">
        <h3>Quality Distribution</h3>
        <div className="stats-grid analytics-quality-grid">
          {qualityBands.map((band) => {
            const percent = totalQuality > 0 ? Math.round((band.value / totalQuality) * 100) : 0;
            return (
              <article className="stat-card" key={band.key}>
                <h4>{band.label}</h4>
                <p>{formatCompact(band.value)}</p>
                <small>{percent}% of scored posts</small>
              </article>
            );
          })}
        </div>
      </section>

      <section className="reports-section">
        <h3>7-Day Engagement Trend</h3>
        <div className="stats-grid analytics-trend-grid">
          {trendCards.map((card) => (
            <article className="stat-card" key={card.key}>
              <h4>{card.title} per Day</h4>
              {card.rows.map((row) => (
                <div className="trend-row" key={`${card.key}-${row.day}`}>
                  <small>{formatDay(row.day)}</small>
                  <div className="meter"><span style={{ width: `${Math.min(100, row.count * 12)}%` }} /></div>
                  <small>{row.count}</small>
                </div>
              ))}
            </article>
          ))}
        </div>
      </section>

      <section className="reports-section">
        <h3>Top News Posters</h3>
        <div className="stats-grid analytics-leaders-grid">
          {leaders.map((leader) => (
            <article className="stat-card" key={leader.id}>
              <h4>{leader.name}</h4>
              <p>{leader.post_count} posts</p>
              <small>avg quality {leader.avg_quality}</small>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
