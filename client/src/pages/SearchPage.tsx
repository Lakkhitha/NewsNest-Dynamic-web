import { FormEvent, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getArticles, getCategories } from "../api";
import type { Article } from "../types";
import { ArticleCard } from "../components/ArticleCard";

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [category, setCategory] = useState(searchParams.get("category") || "");
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Array<{ id: number; name: string; slug: string }>>([]);

  useEffect(() => {
    getCategories().then((result) => setCategories(result.categories));
  }, []);

  useEffect(() => {
    setQuery(searchParams.get("q") || "");
    setCategory(searchParams.get("category") || "");
    getArticles({ q: searchParams.get("q") || undefined, category: searchParams.get("category") || undefined }).then((result) => setArticles(result.articles));
  }, [searchParams]);

  function applyFilters(event: FormEvent) {
    event.preventDefault();
    const next = new URLSearchParams();
    if (query) next.set("q", query);
    if (category) next.set("category", category);
    setSearchParams(next);
  }

  return (
    <div className="stack">
      <section className="page-hero card-surface">
        <span className="eyebrow">Search</span>
        <h1>Find stories across the newsroom.</h1>
        <div className="category-tab-row">
          <button type="button" className={`category-chip ${!category ? "active" : ""}`} onClick={() => setCategory("")}>All</button>
          {categories.map((item) => (
            <button key={item.slug} type="button" className={`category-chip ${category === item.slug ? "active" : ""}`} onClick={() => setCategory(item.slug)}>
              {item.name}
            </button>
          ))}
        </div>
        <form className="filter-row" onSubmit={applyFilters}>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by title, excerpt, or keyword" />
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="">All categories</option>
            {categories.map((item) => (
              <option key={item.slug} value={item.slug}>{item.name}</option>
            ))}
          </select>
          <button className="solid-button" type="submit">Search</button>
        </form>
      </section>
      <section className="content-grid">
        {articles.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </section>
      {articles.length === 0 ? <div className="page-card">No results yet. Try a different query or category.</div> : null}
      <div className="inline-link-row">
        <Link to="/submit">Need a new story? Submit it here.</Link>
      </div>
    </div>
  );
}
