import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";

export default function PeoplePage() {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const search = async () => {
    const q = query.trim();
    if (!q) {
      setItems([]);
      setError("");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const { data } = await api.get(`/users/search?q=${encodeURIComponent(q)}&limit=20&page=1`);
      setItems(data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to search users.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="simple-page">
      <h2>Discover People</h2>
      <p>Find journalists and creators by name or bio keywords.</p>

      <div className="row-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search people by name or bio"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              search();
            }
          }}
        />
        <button className="primary-btn" type="button" onClick={search}>
          Search
        </button>
      </div>

      {loading && <p>Searching users...</p>}
      {error && <p className="error-text">{error}</p>}
      {!loading && !error && query.trim() && items.length === 0 && <p>No matching users found.</p>}

      <section className="feed-grid" style={{ marginTop: 12 }}>
        {items.map((u) => (
          <article className="mini-item" key={u.id}>
            <strong>{u.name}</strong>
            <p>{u.bio || "Citizen journalist"}</p>
            <Link className="ghost-btn" to={`/profile/${u.id}`}>
              View Profile
            </Link>
          </article>
        ))}
      </section>
    </main>
  );
}
