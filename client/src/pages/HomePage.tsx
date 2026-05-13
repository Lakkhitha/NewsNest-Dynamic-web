import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { getHome, subscribeNewsletter, updatePreferences } from "../api";
import type { HomePayload } from "../types";
import { ArticleCard } from "../components/ArticleCard";
import { SectionHeading } from "../components/SectionHeading";
import { formatDate } from "../utils";
import { useAuth } from "../state";

export function HomePage() {
  const [home, setHome] = useState<HomePayload | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [feedback, setFeedback] = useState("");
  const [favoriteSlugs, setFavoriteSlugs] = useState<string[]>([]);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [refreshingFeed, setRefreshingFeed] = useState(false);
  const { user, refreshUser } = useAuth();

  useEffect(() => {
    getHome().then(setHome).catch(() => setHome(null));
  }, []);

  useEffect(() => {
    if (home?.favoriteCategories) {
      setFavoriteSlugs(home.favoriteCategories.map((category) => category.slug));
    }
  }, [home?.favoriteCategories]);

  if (!home) {
    return <div className="page-card">Loading NewsNest...</div>;
  }

  const featuredStories = (home.featured ?? []).length > 0 ? (home.featured ?? []) : (home.latest ?? []).slice(0, 4);
  const spotlight = featuredStories[0] || home.hero;
  const supportingFeatured = featuredStories.slice(1, 4);
  const personalizedFeed = (home.forYou ?? []).length > 0 ? (home.forYou ?? []) : (home.latest ?? []).slice(0, 4);
  const availableCategories = home.categories ?? [];

  async function savePreferences() {
    setSavingPreferences(true);
    try {
      const result = await updatePreferences(favoriteSlugs);
      setHome((current) => (current ? { ...current, favoriteCategories: result.favoriteCategories } : current));
      await refreshUser();
      const refreshed = await getHome();
      setHome(refreshed);
      setFeedback("Feed personalized successfully.");
    } finally {
      setSavingPreferences(false);
    }
  }

  async function refreshFeed() {
    setRefreshingFeed(true);
    try {
      // backend currently returns a deterministic forYou list; reshuffle client-side
      // so tapping refresh shows a different selection immediately.
      const refreshed = await getHome();

      const forYou = [...(refreshed.forYou ?? [])];
      for (let i = forYou.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [forYou[i], forYou[j]] = [forYou[j], forYou[i]];
      }

      setHome({
        ...refreshed,
        forYou,
      });
    } finally {
      setRefreshingFeed(false);
    }
  }


  return (
    <div className="stack">
      {(home.alerts ?? []).length > 0 ? (
        <section className="alert-panel card-surface">
          <span className="eyebrow">Active alerts</span>
          <div className="stack-list">
            {(home.alerts ?? []).map((alert) => (
              <Link key={alert.id} to={`/article/${alert.slug}`} className={`alert-card ${alert.alertLevel || ""}`}>
                <strong>{alert.alertLevel === "emergency" ? "Emergency" : alert.alertLevel === "traffic" ? "Traffic" : "Breaking"}</strong>
                <span>{alert.title}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="hero-grid">
        <div className="hero-copy card-surface">
          <span className="eyebrow">Editorial newsroom</span>
          <h1>Build and read news like a premium magazine, not a plain feed.</h1>
          <p>
            NewsNest combines a dynamic feed, reviewer moderation, author profiles, trending signals, and a distinctive visual language for your final year project.
          </p>
          <div className="hero-actions">
            <Link className="solid-button" to={home.hero ? `/article/${home.hero.slug}` : "/search"}>
              Read lead story
            </Link>
            <Link className="ghost-button" to="/submit">
              Submit a story
            </Link>
            <button className="ghost-button" type="button" onClick={refreshFeed} disabled={refreshingFeed}>
              {refreshingFeed ? "Refreshing..." : "Refresh feed"}
            </button>
          </div>
          <div className="hero-stats">
            <div>
              <strong>{home.latest.length}</strong>
              <span>Live stories</span>
            </div>
            <div>
              <strong>{home.trending.length}</strong>
              <span>Trending now</span>
            </div>
            <div>
              <strong>{home.categories.length}</strong>
              <span>Categories</span>
            </div>
          </div>
        </div>
        {home.hero ? (
          <article className="hero-feature card-surface">
            <img src={home.hero.imageUrl} alt={home.hero.title} onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = "hidden"; }} />


            <div className="hero-feature-body">
              <span className="eyebrow">{home.hero.category.name}</span>
              <h2>
                <Link to={`/article/${home.hero.slug}`}>{home.hero.title}</Link>
              </h2>
              <p>{home.hero.excerpt}</p>
              <div className="article-meta">
                <span>{formatDate(home.hero.publishedAt || home.hero.createdAt)}</span>
                <span>{home.hero.readingTime} min read</span>
                <span>{home.hero.trendingScore} trend</span>
              </div>
            </div>
          </article>
        ) : null}
      </section>

      {user ? (
        <section className="personalize-panel card-surface">
          <div>
            <span className="eyebrow">Personalize</span>
            <h3>Choose the categories you care about.</h3>
          </div>
          <div className="category-picker">
            {availableCategories.map((category) => {
              const active = favoriteSlugs.includes(category.slug);
              return (
                <button
                  key={category.slug}
                  type="button"
                  className={`category-chip ${active ? "active" : ""}`}
                  onClick={() => setFavoriteSlugs((current) => current.includes(category.slug) ? current.filter((slug) => slug !== category.slug) : [...current, category.slug])}
                >
                  {category.name}
                </button>
              );
            })}
          </div>
          <div className="button-row">
            <button className="solid-button" type="button" onClick={savePreferences} disabled={savingPreferences}>
              {savingPreferences ? "Saving..." : "Save preferences"}
            </button>
            <span className="feedback">{feedback}</span>
          </div>
        </section>
      ) : null}

      <section className="stack">
        <SectionHeading eyebrow="For you" title="A feed shaped around your favorite categories" description="This section updates after login based on the categories you pick." />
        <div className="content-grid">
          {personalizedFeed.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      </section>

      <section className="category-strip card-surface">
        {home.categories.map((category) => (
          <Link key={category.slug} to={`/category/${category.slug}`} className="category-chip">
            {category.name}
          </Link>
        ))}
      </section>

      <section className="split-layout">
        <div className="main-column">
          <SectionHeading eyebrow="Latest" title="Fresh headlines and user submissions" description="The feed updates from the backend, not static mock data." />
          <div className="stack-list">
            {home.latest.map((article) => (
              <ArticleCard key={article.id} article={article} compact />
            ))}
          </div>
        </div>
        <aside className="side-column">
          <SectionHeading eyebrow="Trending" title="What readers keep opening" />
          <div className="mini-list card-surface">
            {home.trending.map((article, index) => (
              <Link key={article.id} to={`/article/${article.slug}`} className="mini-story">
                <span className="rank">0{index + 1}</span>
                <div>
                  <strong>{article.title}</strong>
                  <small>{article.category.name}</small>
                  <div className="trust-line small">
                    <span>{article.validityLabel}</span>
                    <span>{article.trustScore}/100</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          <div className="newsletter card-surface">
            <span className="eyebrow">Newsletter</span>
            <h3>Get the best stories in your inbox.</h3>
            <form
              className="newsletter-form"
              onSubmit={async (event) => {
                event.preventDefault();
                const result = await subscribeNewsletter(name, email);
                setFeedback(result.message);
                setName("");
                setEmail("");
              }}
            >
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" />
              <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email address" type="email" />
              <button className="solid-button" type="submit">Subscribe</button>
            </form>
            {feedback ? <p className="feedback">{feedback}</p> : null}
          </div>
        </aside>
      </section>
    </div>
  );
}
