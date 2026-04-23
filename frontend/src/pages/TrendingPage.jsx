import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";

export default function TrendingPage() {
  const [items, setItems] = useState([]);
  const [limit, setLimit] = useState(20);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchTrending = async (nextPage = page, nextLimit = limit) => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get(`/posts/trending?page=${nextPage}&limit=${nextLimit}`);
      setItems(data || []);
      setPage(nextPage);
      setLimit(nextLimit);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load trending stories.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrending(1, 20);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="simple-page">
      <div className="feed-head">
        <div>
          <h2>Trending Stories</h2>
          <p>Top stories ranked by engagement and freshness.</p>
        </div>
        <div className="action-row">
          <button className="primary-btn" type="button" onClick={() => fetchTrending(page, limit)}>
            Refresh
          </button>
          <button
            className="ghost-btn"
            type="button"
            onClick={() => {
              const nextPage = Math.max(1, page - 1);
              fetchTrending(nextPage, limit);
            }}
            disabled={page <= 1}
          >
            Previous
          </button>
          <button
            className="ghost-btn"
            type="button"
            onClick={() => fetchTrending(page + 1, limit)}
          >
            Next
          </button>
        </div>
      </div>

      <div className="row-2" style={{ marginBottom: 10 }}>
        <p style={{ margin: 0, alignSelf: "center" }}>Page {page}</p>
        <select value={limit} onChange={(e) => fetchTrending(1, Number(e.target.value))}>
          <option value={10}>10 per page</option>
          <option value={20}>20 per page</option>
        </select>
      </div>

      {error && <p className="error-text">{error}</p>}
      {loading && <p>Loading trending stories...</p>}

      <section className="feed-grid">
        {items.map((item) => (
          <article className="post-card" key={item.id}>
            <div className="post-meta">
              <span>{item.author_name}</span>
              <span>{new Date(item.created_at).toLocaleString()}</span>
            </div>
            <h3>
              <Link className="post-link" to={`/posts/${item.id}`}>{item.title}</Link>
            </h3>
            <div className="chip-row">
              <span className="chip">{item.category}</span>
              <span className="chip">{item.reaction_count} reactions</span>
              <span className="chip">{item.comment_count} comments</span>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
