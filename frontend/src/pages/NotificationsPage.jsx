import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [dashboard, setDashboard] = useState({ publishedToday: 0, unreadMessages: 0, openReports: 0 });
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [query, setQuery] = useState("");
  const [seen, setSeen] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const [notificationRes, dashboardRes] = await Promise.all([
        api.get("/users/me/notifications?limit=60"),
        api.get("/users/me/dashboard"),
      ]);
      setNotifications(notificationRes.data.items || []);
      setDashboard(dashboardRes.data || { publishedToday: 0, unreadMessages: 0, openReports: 0 });
    } finally {
      setLoading(false);
    }
  };

  const visibleNotifications = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    return notifications.filter((n) => {
      if (filterType !== "all" && n.type !== filterType) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      return `${n.actor || ""} ${n.message || ""}`.toLowerCase().includes(keyword);
    });
  }, [notifications, filterType, query]);

  const unreadCount = useMemo(
    () => visibleNotifications.filter((n, idx) => !seen[`${n.type}-${n.created_at}-${idx}`]).length,
    [visibleNotifications, seen]
  );

  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <main className="simple-page">
      <section className="quick-panels" style={{ marginBottom: 14 }}>
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
      </section>

      <section className="mini-item command-center-links">
        <strong>User Command Center</strong>
        <div className="action-row" style={{ marginTop: 8 }}>
          <Link className="ghost-btn" to="/feed">Go Timeline</Link>
          <Link className="ghost-btn" to="/messages">Open Messages</Link>
          <Link className="ghost-btn" to="/support">Support Center</Link>
          <Link className="ghost-btn" to="/analytics">View Analysis</Link>
        </div>
      </section>

      <div className="feed-head">
        <div>
          <h2>Notifications</h2>
          <p>Dynamic alerts from comments, reactions, follows, and direct messages. Unread in view: {unreadCount}</p>
        </div>
        <div className="action-row">
          <button type="button" className="primary-btn" onClick={load}>
            Refresh
          </button>
          <button
            type="button"
            className="ghost-btn"
            onClick={() => {
              const nextSeen = {};
              visibleNotifications.forEach((n, idx) => {
                nextSeen[`${n.type}-${n.created_at}-${idx}`] = true;
              });
              setSeen((prev) => ({ ...prev, ...nextSeen }));
            }}
          >
            Mark Visible as Viewed
          </button>
        </div>
      </div>

      <div className="row-2" style={{ marginBottom: 10 }}>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="all">All Types</option>
          <option value="reaction">Reactions</option>
          <option value="comment">Comments</option>
          <option value="follow">Follows</option>
          <option value="message">Messages</option>
        </select>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by actor or message"
        />
      </div>

      {loading && <p>Loading notifications...</p>}

      <section className="reports-section">
        {visibleNotifications.map((n, idx) => {
          const key = `${n.type}-${n.created_at}-${idx}`;
          const isSeen = Boolean(seen[key]);

          return (
          <div className={`mini-item ${isSeen ? "seen-item" : "unseen-item"}`} key={key}>
            <div className="notif-head">
              <strong>{n.actor || "NewsNest"}</strong>
              <span className="chip">{n.type}</span>
            </div>
            <p>{n.message}</p>
            <div className="action-row" style={{ marginTop: 6 }}>
              <small>{new Date(n.created_at).toLocaleString()}</small>
              <button
                type="button"
                className="ghost-btn"
                onClick={() => setSeen((prev) => ({ ...prev, [key]: true }))}
              >
                {isSeen ? "Viewed" : "Mark Viewed"}
              </button>
            </div>
          </div>
          );
        })}
      </section>
    </main>
  );
}
