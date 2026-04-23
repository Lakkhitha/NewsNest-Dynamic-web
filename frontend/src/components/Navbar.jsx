import { Link, useLocation } from "react-router-dom";

function NavItem({ to, label }) {
  const location = useLocation();
  const active = location.pathname === to;
  return (
    <Link className={`nav-item ${active ? "active" : ""}`} to={to}>
      {label}
    </Link>
  );
}

export default function Navbar({ user, onLogout, notificationCount = 0 }) {
  return (
    <header className="topbar">
      <div className="brand-wrap">
        <img className="brand-logo" src="/logo.png" alt="NewsNest logo" />
        <div>
          <h1 className="brand-title">NewsNest</h1>
          <p className="brand-sub">Social News Network</p>
        </div>
      </div>
      <nav className="topnav">
        <NavItem to="/feed" label="Timeline" />
        <NavItem to="/explore" label="Explore" />
        <NavItem to="/trending" label="Trending" />
        <NavItem to="/analytics" label="Analysis" />
        <NavItem to="/messages" label="Messages" />
        <NavItem to="/notifications" label={`Alerts ${notificationCount > 0 ? `(${notificationCount})` : ""}`} />
        <NavItem to="/people" label="People" />
        <NavItem to="/profile" label="Profile" />
        <NavItem to="/support" label="Support" />
        {user?.role === "admin" && <NavItem to="/admin" label="Admin" />}
      </nav>
      <div className="user-box">
        <span>{user?.name}</span>
        <button onClick={onLogout} className="ghost-btn" type="button">
          Logout
        </button>
      </div>
    </header>
  );
}
