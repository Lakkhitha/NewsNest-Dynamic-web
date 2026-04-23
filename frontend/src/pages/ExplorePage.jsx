import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";

const categories = ["all", "world", "politics", "technology", "sports", "health", "business", "science", "climate"];

export default function ExplorePage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [items, setItems] = useState([]);
  const [trending, setTrending] = useState([]);
  const [limit, setLimit] = useState(30);
  const [sortBy, setSortBy] = useState("latest");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchData = async (q = query, cat = category, nextLimit = limit) => {
    setLoading(true);
    setError("");
    try {
      const [postsRes, trendingRes] = await Promise.all([
        api.get(`/posts?q=${encodeURIComponent(q)}&category=${cat}&limit=${nextLimit}`),
        api.get("/posts/trending?limit=10"),
      ]);
      const rows = postsRes.data || [];
      const sorted = [...rows].sort((a, b) => {
        if (sortBy === "quality") return Number(b.quality_score || 0) - Number(a.quality_score || 0);
        if (sortBy === "engagement") {
          const eb = Number(b.reaction_count || 0) + Number(b.comment_count || 0);
          const ea = Number(a.reaction_count || 0) + Number(a.comment_count || 0);
          return eb - ea;
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setItems(sorted);
      setTrending(trendingRes.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load explore data right now.");
      setItems([]);
      setTrending([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData("", "all", 30);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy]);

  return (
    <main className="page-grid">
      <section className="simple-page">
        <h2>Explore News</h2>
        {error && <p className="error-text">{error}</p>}
        <div className="row-2">
          <input
            placeholder="Search headlines or content"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="row-2" style={{ marginTop: 8 }}>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="latest">Sort: Latest</option>
            <option value="quality">Sort: Quality</option>
            <option value="engagement">Sort: Engagement</option>
          </select>
          <p style={{ margin: 0, alignSelf: "center" }}>Results: {items.length}</p>
        </div>
        <div className="action-row" style={{ marginTop: 10 }}>
          <button type="button" className="primary-btn" onClick={() => fetchData(query, category)}>
            Search
          </button>
          <button
            type="button"
            className="ghost-btn"
            onClick={() => {
              setQuery("");
              setCategory("all");
              setLimit(30);
              fetchData("", "all", 30);
            }}
          >
            Reset
          </button>
          <button
            type="button"
            className="ghost-btn"
            onClick={() => {
              const nextLimit = limit + 20;
              setLimit(nextLimit);
              fetchData(query, category, nextLimit);
            }}
          >
            Load More
          </button>
        </div>

        <div className="feed-grid" style={{ marginTop: 14 }}>
          {loading && <p>Loading explore results...</p>}
          {items.map((item) => (
            <article className="post-card" key={item.id}>
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
              </div>
            </article>
          ))}
        </div>
      </section>

      <aside className="simple-page">
        <h3>Trending Right Now</h3>
        {trending.map((item) => (
          <div key={item.id} className="mini-item">
            <strong>{item.title}</strong>
            <p>
              {item.author_name} | {item.category}
            </p>
            <small>
              {item.reaction_count} reactions, {item.comment_count} comments
            </small>
          </div>
        ))}
      </aside>
    </main>
  );
}
