import { useEffect, useState } from "react";
import { deleteArticle, fetchBookmarks, fetchDashboard, fetchMyArticles, updateArticleStatus, updateUserRole } from "../api";
import { useAuth } from "../state";
import type { Article, DashboardPayload } from "../types";
import { ArticleCard } from "../components/ArticleCard";
import { formatDate } from "../utils";

export function DashboardPage() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [bookmarks, setBookmarks] = useState<Article[]>([]);
  const [roleFeedback, setRoleFeedback] = useState("");

  useEffect(() => {
    if (!user) return;
    if (user.role === "super_admin") {
      fetchDashboard().then(setDashboard).catch(() => setDashboard(null));
    } else {
      fetchMyArticles().then((result) => setArticles(result.articles)).catch(() => setArticles([]));
      fetchBookmarks().then((result) => setBookmarks(result.bookmarks)).catch(() => setBookmarks([]));
    }
  }, [user]);

  if (!user) {
    return <div className="page-card">Please sign in to open the dashboard.</div>;
  }

  if (user.role !== "super_admin") {
    return (
      <div className="stack">
        <section className="page-hero card-surface">
          <span className="eyebrow">Writer dashboard</span>
          <h1>Your drafts, submissions, and saved stories.</h1>
          <p>Use your dashboard to write articles, manage your own posts, and personalize your feed.</p>
        </section>
        <section className="card-surface">
          <span className="eyebrow">Favorite categories</span>
          <div className="stack-list">
            {user.favoriteCategories?.length ? user.favoriteCategories.map((category) => <span key={category.slug} className="tag-pill">{category.name}</span>) : <p className="muted-copy">No favorites selected yet.</p>}
          </div>
        </section>
        <section className="two-column">
          <div className="card-surface">
            <span className="eyebrow">My stories</span>
            <div className="stack-list">
              {articles.map((article) => (
                <div key={article.id} className="dashboard-story-card">
                  <ArticleCard article={article} compact />
                  <div className="button-row">
                    <button className="ghost-button" type="button" onClick={async () => {
                      await deleteArticle(article.id);
                      const result = await fetchMyArticles();
                      setArticles(result.articles);
                    }}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="card-surface">
            <span className="eyebrow">Bookmarks</span>
            <div className="stack-list">{bookmarks.map((article) => <ArticleCard key={article.id} article={article} compact />)}</div>
          </div>
        </section>
      </div>
    );
  }

  if (!dashboard) {
    return <div className="page-card">Loading dashboard...</div>;
  }

  return (
    <div className="stack">
      <section className="page-hero card-surface">
        <span className="eyebrow">Admin dashboard</span>
        <h1>Moderate submissions and keep the newsroom moving.</h1>
      </section>
      <section className="metric-grid">
        {Object.entries(dashboard.counts).map(([label, value]) => (
          <div key={label} className="metric-card card-surface">
            <span className="eyebrow">{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </section>
      <section className="two-column">
        <div className="card-surface">
          <span className="eyebrow">Pending review</span>
          <div className="stack-list">
            {dashboard.submissions.length === 0 ? (
              <div className="empty-state">
                <strong>No pending submissions</strong>
                <p>New writer stories will appear here for review.</p>
              </div>
            ) : (
              dashboard.submissions.map((article) => (
                <div key={article.id} className="review-row">
                  <div>
                    <strong>{article.title}</strong>
                    <p>{article.excerpt}</p>
                    <small>{formatDate(article.createdAt)} · {article.author.name}</small>
                  </div>
                  <div className="button-row">
                    <button
                      className="ghost-button"
                      type="button"
                      onClick={async () => {
                        await updateArticleStatus(article.id, "approved");
                        setDashboard(await fetchDashboard());
                      }}
                    >
                      Approve
                    </button>
                    <button
                      className="ghost-button"
                      type="button"
                      onClick={async () => {
                        await updateArticleStatus(article.id, "rejected");
                        setDashboard(await fetchDashboard());
                      }}
                    >
                      Reject
                    </button>
                    <button
                      className="solid-button"
                      type="button"
                      onClick={async () => {
                        await updateArticleStatus(article.id, "published");
                        setDashboard(await fetchDashboard());
                      }}
                    >
                      Publish
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="card-surface">
          <span className="eyebrow">Trending stories</span>
          <div className="stack-list">{dashboard.topArticles.map((article) => <ArticleCard key={article.id} article={article} compact />)}</div>
        </div>
      </section>
      <section className="two-column">
        <div className="card-surface">
          <span className="eyebrow">Recent comments</span>
          <div className="stack-list">
            {dashboard.recentComments.map((comment) => (
              <div key={comment.id} className="review-row">
                <div>
                  <strong>{comment.userName}</strong>
                  <p>{comment.content}</p>
                  <small>{comment.articleTitle}</small>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="card-surface">
          <span className="eyebrow">Writers</span>
          <div className="stack-list">
            {dashboard.writers.map((writer) => (
              <div key={writer.id} className="review-row">
                <div>
                  <strong>{writer.name}</strong>
                  <p>{writer.email}</p>
                </div>
                <small>{writer.role}</small>
              </div>
            ))}
          </div>
          <span className="eyebrow">Admin management</span>
          <div className="stack-list admin-management-list">
            {dashboard.userManagement?.map((account) => (
              <div key={account.id} className="review-row">
                <div>
                  <strong>{account.name}</strong>
                  <p>{account.email}</p>
                  <small>{account.provider}</small>
                </div>
                <div className="button-row">
                  <select
                    value={account.role}
                    onChange={async (event) => {
                      await updateUserRole(account.id, event.target.value);
                      const refreshed = await fetchDashboard();
                      setDashboard(refreshed);
                      setRoleFeedback("Role updated");
                    }}
                  >
                    <option value="writer">Writer</option>
                    <option value="editor">Editor</option>
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
          <div className="mini-chart">
            {dashboard.topArticles.slice(0, 5).map((article) => (
              <div key={article.id} className="chart-bar" style={{ height: `${20 + article.trendingScore}px` }} />
            ))}
          </div>
          {roleFeedback ? <p className="feedback">{roleFeedback}</p> : null}
        </div>
      </section>
    </div>
  );
}
