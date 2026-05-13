import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { addComment, bookmarkArticle, fetchBookmarks, getArticle } from "../api";
import { useAuth } from "../state";
import type { ArticleDetailPayload, Article } from "../types";
import { ArticleCard } from "../components/ArticleCard";
import { formatDate, initials } from "../utils";

export function ArticlePage() {
  const { slug = "" } = useParams();
  const { user } = useAuth();
  const [payload, setPayload] = useState<ArticleDetailPayload | null>(null);
  const [comment, setComment] = useState("");
  const [bookmarked, setBookmarked] = useState(false);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    if (!slug) return;
    getArticle(slug).then(setPayload).catch(() => setPayload(null));
  }, [slug]);

  useEffect(() => {
    if (!user) return;
    fetchBookmarks()
      .then((result) => {
        setBookmarked(Boolean(payload?.article && result.bookmarks.some((item) => item.id === payload.article.id)));
      })
      .catch(() => setBookmarked(false));
  }, [payload?.article?.id, user]);

  if (!payload) {
    return <div className="page-card">Loading article...</div>;
  }

  const article = payload.article;

  return (
    <div className="stack article-page">
      <article className="article-hero card-surface">
        <span className="eyebrow">{article.category.name}</span>
        <div className="article-validity-row">
          <span className={`trust-chip ${article.verifiedPublisher ? "verified" : "review"}`}>{article.validityLabel}</span>
          <span className={`alert-pill ${article.alertLevel || ""}`}>{article.alertLevel ? article.alertLevel.charAt(0).toUpperCase() + article.alertLevel.slice(1) : "Story"}</span>
          {article.sourceName ? <span className="source-chip">{article.sourceName}</span> : null}
        </div>
        <h1>{article.title}</h1>
        <p className="lede">{article.excerpt}</p>
        <div className="article-meta large">
          <span>{formatDate(article.publishedAt || article.createdAt)}</span>
          <span>{article.readingTime} min read</span>
          <span>{article.views} views</span>
          <span>{article.trendingScore} trend</span>
          <span>Trust {article.trustScore}/100</span>
        </div>
        <div className="article-author">
          <div className="avatar">{article.author.avatarUrl ? <img src={article.author.avatarUrl} alt={article.author.name} /> : initials(article.author.name)}</div>
          <div>
            <strong>{article.author.name}</strong>
            <p>{article.author.bio}</p>
          </div>
          {user ? (
            <button
              className="ghost-button"
              type="button"
              onClick={async () => {
                const result = await bookmarkArticle(article.id);
                setBookmarked(result.bookmarked);
              }}
            >
              {bookmarked ? "Bookmarked" : "Bookmark"}
            </button>
          ) : (
            <Link className="ghost-button" to="/auth">Bookmark</Link>
          )}
        </div>
      </article>

      <img className="article-cover" src={article.imageUrl} alt={article.title} onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = "hidden"; }} />



      <section className="article-grid">
        <div className="article-content card-surface">
          <div className="rich-text">
            {article.content.split("\n").map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <div className="article-tags">
            {article.tags.map((tag) => (
              <span key={tag.slug} className="tag-pill">#{tag.name}</span>
            ))}
          </div>
        </div>
        <aside className="article-aside">
          <div className="card-surface">
            <span className="eyebrow">Related</span>
            <div className="stack-list">
              {payload.related.map((item) => (
                <ArticleCard key={item.id} article={item} compact />
              ))}
            </div>
          </div>
        </aside>
      </section>

      <section className="card-surface comments-section">
        <span className="eyebrow">Leave a Comment</span>
        <div className="stack-list comments-list">
          {payload.comments.map((item) => (
            <div key={item.id} className="comment-item">
              <div className="avatar small">{item.userAvatarUrl ? <img src={item.userAvatarUrl} alt={item.userName} /> : initials(item.userName)}</div>
              <div>
                <strong>{item.userName}</strong>
                <p>{item.content}</p>
              </div>
            </div>
          ))}
        </div>
        {user ? (
          <form
            className="comment-form"
            onSubmit={async (event) => {
              event.preventDefault();
              await addComment(article.id, comment);
              setFeedback("Comment posted");
              setComment("");
              const refreshed = await getArticle(slug);
              setPayload(refreshed);
            }}
          >
            <textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Leave a thoughtful comment" />
            <button className="solid-button" type="submit">Post comment</button>
          </form>
        ) : (
          <p className="feedback"><Link to="/auth">Sign in</Link> to join the conversation.</p>
        )}
        {feedback ? <p className="feedback">{feedback}</p> : null}
      </section>
    </div>
  );
}
