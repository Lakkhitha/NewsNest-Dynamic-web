import { useEffect, useState } from "react";
import api from "../lib/api";

export default function SupportPage() {
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [myReports, setMyReports] = useState([]);
  const [myFeedbacks, setMyFeedbacks] = useState([]);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [reportsRes, feedbacksRes] = await Promise.all([
        api.get("/social/my/reports"),
        api.get("/social/my/feedbacks"),
      ]);
      setMyReports(reportsRes.data || []);
      setMyFeedbacks(feedbacksRes.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load support data.");
      setMyReports([]);
      setMyFeedbacks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const sendFeedback = async (e) => {
    e.preventDefault();
    if (!feedbackMessage.trim()) return;
    setError("");
    try {
      await api.post("/social/feedback", { message: feedbackMessage.trim() });
      setFeedbackMessage("");
      setNotice("Feedback submitted successfully.");
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to submit feedback.");
    }
  };

  return (
    <main className="page-grid">
      <section className="simple-page">
        <h2>Support and Feedback</h2>
        {error && <p className="error-text">{error}</p>}
        <form className="auth-form" onSubmit={sendFeedback}>
          <textarea
            placeholder="Share your feedback about moderation, UX, speed, or trustworthiness"
            value={feedbackMessage}
            onChange={(e) => setFeedbackMessage(e.target.value)}
            rows={4}
          />
          <button className="primary-btn" type="submit">
            Submit Feedback
          </button>
          {notice && <p>{notice}</p>}
        </form>

        <section className="reports-section">
          <h3>My Feedback History</h3>
          {loading && <p>Loading support data...</p>}
          {myFeedbacks.map((item) => (
            <div className="mini-item" key={item.id}>
              <p>{item.message}</p>
              <small>{new Date(item.created_at).toLocaleString()}</small>
            </div>
          ))}
        </section>
      </section>

      <aside className="simple-page">
        <h3>My Reports</h3>
        {myReports.map((r) => (
          <div key={r.id} className="mini-item">
            <strong>{r.post_title || "Removed post"}</strong>
            <p>{r.reason}</p>
            <small>
              {r.status} | {new Date(r.created_at).toLocaleString()}
            </small>
          </div>
        ))}
      </aside>
    </main>
  );
}
