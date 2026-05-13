import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getCategories, fetchMyArticles, submitArticle } from "../api";
import { useAuth } from "../state";
import type { Article } from "../types";
import { ArticleCard } from "../components/ArticleCard";

export function SubmitPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Array<{ id: number; name: string; slug: string }>>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [feedback, setFeedback] = useState("");
  const [form, setForm] = useState({ title: "", excerpt: "", content: "", categorySlug: "", tags: "", featured: false, breaking: false });
  const [file, setFile] = useState<File | null>(null);

  async function submitStory(status: "draft" | "pending") {
    const formData = new FormData();
    Object.entries(form).forEach(([key, value]) => formData.append(key, String(value)));
    formData.append("status", status);
    if (file) formData.append("image", file);
    const result = await submitArticle(formData);
    setFeedback(`Saved ${result.article.status} story: ${result.article.title}`);
    setForm({ title: "", excerpt: "", content: "", categorySlug: categories[0]?.slug || "", tags: "", featured: false, breaking: false });
    setFile(null);
    navigate(`/article/${result.article.slug}`);
  }

  useEffect(() => {
    getCategories().then((result) => {
      setCategories(result.categories);
      setForm((current) => ({ ...current, categorySlug: result.categories[0]?.slug || "" }));
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchMyArticles().then((result) => setArticles(result.articles)).catch(() => setArticles([]));
  }, [user]);

  if (!user) {
    return (
      <div className="page-card">
        <h1>Sign in to submit news</h1>
        <p>Writers can create stories, upload images, and send articles for moderation.</p>
        <Link className="solid-button" to="/auth">Sign in</Link>
      </div>
    );
  }

  return (
    <div className="stack">
      <section className="page-hero card-surface">
        <span className="eyebrow">Writer studio</span>
        <h1>Create a story for moderation or save a draft.</h1>
        <p>Use this flow for your final-year project to demonstrate a fully dynamic submission pipeline.</p>
      </section>

      <section className="two-column">
        <form
          className="form-panel card-surface"
          onSubmit={async (event) => {
            event.preventDefault();
            await submitStory("pending");
          }}
        >
          <label>Title<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
          <label>Excerpt<textarea value={form.excerpt} onChange={(event) => setForm({ ...form, excerpt: event.target.value })} /></label>
          <label>Content<textarea value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} rows={10} /></label>
          <div className="grid-two">
            <label>Category<select value={form.categorySlug} onChange={(event) => setForm({ ...form, categorySlug: event.target.value })}>{categories.map((category) => <option key={category.slug} value={category.slug}>{category.name}</option>)}</select></label>
            <label>Tags<input value={form.tags} onChange={(event) => setForm({ ...form, tags: event.target.value })} placeholder="comma, separated, tags" /></label>
          </div>
          <label>Cover image<input type="file" accept="image/*" onChange={(event) => setFile(event.target.files?.[0] || null)} /></label>
          <div className="grid-two switches">
            <label><input type="checkbox" checked={form.featured} onChange={(event) => setForm({ ...form, featured: event.target.checked })} /> Featured</label>
            <label><input type="checkbox" checked={form.breaking} onChange={(event) => setForm({ ...form, breaking: event.target.checked })} /> Breaking</label>
          </div>
          <div className="button-row">
            <button className="ghost-button" type="button" onClick={() => submitStory("draft")}>Save draft</button>
            <button className="solid-button" type="submit">Submit for review</button>
          </div>
          {feedback ? <p className="feedback">{feedback}</p> : null}
        </form>
        <aside className="card-surface">
          <span className="eyebrow">Your stories</span>
          <div className="stack-list">
            {articles.map((article) => (
              <ArticleCard key={article.id} article={article} compact />
            ))}
          </div>
        </aside>
      </section>
    </div>
  );
}
