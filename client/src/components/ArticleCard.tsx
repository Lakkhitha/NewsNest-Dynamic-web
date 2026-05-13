import { Link } from "react-router-dom";
import type { Article } from "../types";
import { formatDate } from "../utils";

export function ArticleCard({ article, compact = false }: { article: Article; compact?: boolean }) {
  const alertLabel = article.alertLevel ? article.alertLevel.charAt(0).toUpperCase() + article.alertLevel.slice(1) : "";
  return (
    <article className={`article-card ${compact ? "compact" : ""}`}>
      <Link className="article-media" to={`/article/${article.slug}`}>
        <img src={article.imageUrl} alt={article.title} />
        <div className="article-media-badges">
          <span className="article-category">{article.category.name}</span>
          {alertLabel ? <span className={`alert-pill ${article.alertLevel}`}>{alertLabel}</span> : null}
        </div>
      </Link>
      <div className="article-body">
        <div className="article-meta">
          <span>{formatDate(article.publishedAt || article.createdAt)}</span>
          <span>{article.readingTime} min read</span>
          <span>{article.trendingScore} trend</span>
          <span className={`trust-chip ${article.verifiedPublisher ? "verified" : "review"}`}>{article.validityLabel}</span>
        </div>
        <h3>
          <Link to={`/article/${article.slug}`}>{article.title}</Link>
        </h3>
        <p>{article.excerpt}</p>
        <div className="trust-line">
          <span>Trust score {article.trustScore}/100</span>
          {article.sourceName ? <span>Source {article.sourceName}</span> : null}
        </div>
        <div className="article-tags">
          {article.tags.slice(0, 3).map((tag) => (
            <span key={tag.slug} className="tag-pill">
              #{tag.name}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}
