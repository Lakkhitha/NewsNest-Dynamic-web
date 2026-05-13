import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { getHome } from "../api";
import { useAuth, useTheme } from "../state";
import { Ticker } from "./Ticker";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [breaking, setBreaking] = useState<any[]>([]);
  const [toastVisible, setToastVisible] = useState(false);

  useEffect(() => {
    getHome()
      .then((payload) => {
        setBreaking((payload.breaking ?? []).slice(0, 5));
        setAlerts((payload.alerts ?? []).slice(0, 3));
      })
      .catch(() => setBreaking([]));
  }, [location.pathname]);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (alerts.length === 0) {
      setToastVisible(false);
      return;
    }
    setToastVisible(true);
    const [alert] = alerts;
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted" && alert) {
      new Notification("NewsNest alert", { body: alert.title });
    }
    const timeout = window.setTimeout(() => setToastVisible(false), 7000);
    return () => window.clearTimeout(timeout);
  }, [alerts]);

  return (
    <div className="app-shell">
      <header className="site-header">
        {alerts.length > 0 ? (
          <div className="alert-ribbon">
            <strong>{alerts[0].alertLevel === "emergency" ? "Emergency alert" : "Breaking alert"}</strong>
            <span>{alerts[0].title}</span>
            <Link className="alert-link" to={`/article/${alerts[0].slug}`}>Read more</Link>
          </div>
        ) : null}
        <div className="top-strip">
          <span className="dot pulse" />
          <span>Premium editorial newsroom</span>
          <span className="time-chip">{new Intl.DateTimeFormat("en", { weekday: "short", month: "short", day: "numeric" }).format(new Date())}</span>
        </div>
        <div className="nav-row">
          <Link to="/" className="brand" onClick={() => setMenuOpen(false)}>
            <span className="brand-mark brand-logo-wrap">
              <img className="brand-logo" src="/logo.png" alt="NewsNest logo" />
            </span>
            <span>
              NewsNest
              <small>Dynamic newsroom</small>
            </span>
          </Link>
          <button className="menu-button" onClick={() => setMenuOpen((value) => !value)} aria-label="Toggle menu">
            <span />
            <span />
          </button>
          <nav className={`nav-links ${menuOpen ? "open" : ""}`}>
            <NavLink to="/" onClick={() => setMenuOpen(false)}>Home</NavLink>
            <NavLink to="/search" onClick={() => setMenuOpen(false)}>Search</NavLink>
            <NavLink to="/dashboard" onClick={() => setMenuOpen(false)}>Dashboard</NavLink>
            <NavLink to="/submit" onClick={() => setMenuOpen(false)}>Submit</NavLink>
          </nav>
          <div className="nav-actions">
            <Link className="ghost-button nav-search-button" to="/search">Search</Link>
            <button className="ghost-button" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === "dark" ? "Light" : "Dark"}
            </button>
            {user ? (
              <button className="solid-button" type="button" onClick={logout}>
                {user.name.split(" ")[0]}
              </button>
            ) : (
              <Link className="solid-button" to="/auth">
                Sign in
              </Link>
            )}
          </div>
        </div>
        <Ticker articles={breaking as any} />
      </header>
      {toastVisible && alerts.length > 0 ? (
        <div className="alert-toast">
          <span className="alert-toast-label">{alerts[0].alertLevel === "emergency" ? "Emergency" : "Alert"}</span>
          <strong>{alerts[0].title}</strong>
          <p>{alerts[0].excerpt}</p>
        </div>
      ) : null}
      <main className="site-main">{children}</main>
      <footer className="site-footer">
        <div className="footer-brand">
          <strong>NewsNest by Lakkhitha Kariyawasam</strong>
          <p>From Colombo, Sri Lanka. A dynamic newsroom platform with editorial UX, moderation workflows, and personalized news feeds.</p>
        </div>
        <div className="footer-links">
          <Link to="/search">Categories</Link>
          <Link to="/privacy">Privacy</Link>
          <Link to="/contact">Contact</Link>
          <Link to="/dashboard">Dashboard</Link>
        </div>
      </footer>
    </div>
  );
}
