import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getCategory } from "../api";
import type { Article } from "../types";
import { ArticleCard } from "../components/ArticleCard";

export function CategoryPage() {
  const { slug = "" } = useParams();
  const [category, setCategory] = useState<{ id: number; name: string; slug: string; description?: string } | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);

  useEffect(() => {
    if (!slug) return;
    getCategory(slug)
      .then((result) => {
        setCategory(result.category);
        setArticles(result.articles);
      })
      .catch(() => {
        setCategory(null);
        setArticles([]);
      });
  }, [slug]);

  if (!category) {
    return <div className="page-card">Category not found.</div>;
  }

  return (
    <div className="stack">
      <section className="page-hero card-surface">
        <span className="eyebrow">Category</span>
        <h1>{category.name}</h1>
        <p>{category.description}</p>
        <Link className="ghost-button" to="/search">Explore all stories</Link>
      </section>
      <section className="content-grid">
        {articles.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </section>
      {articles.length === 0 ? <div className="page-card">No stories in this category yet.</div> : null}
    </div>
  );
}
