import { Link } from "react-router-dom";
import type { Article } from "../types";

export function Ticker({ articles }: { articles: Article[] }) {
  const items = articles.length > 0 ? articles : [];
  return (
    <div className="ticker-shell" aria-label="Breaking news ticker">
      <div className="ticker-label">Live</div>
      <div className="ticker-track">
        <div className="ticker-content">
          {[...items, ...items].map((article, index) => (
            <Link key={`${article.slug}-${index}`} to={`/article/${article.slug}`} className="ticker-item">
              <span>{article.breaking ? "Breaking" : "Update"}</span>
              <strong>{article.title}</strong>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
