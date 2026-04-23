import { Link, Navigate, Route, Routes } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import LoginPage from "./pages/LoginPage";
import FeedPage from "./pages/FeedPage";
import AdminPage from "./pages/AdminPage";
import ExplorePage from "./pages/ExplorePage";
import TrendingPage from "./pages/TrendingPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import MessagesPage from "./pages/MessagesPage";
import ProfilePage from "./pages/ProfilePage";
import SupportPage from "./pages/SupportPage";
import NotificationsPage from "./pages/NotificationsPage";
import PostDetailPage from "./pages/PostDetailPage";
import PeoplePage from "./pages/PeoplePage";
import Navbar from "./components/Navbar";
import api from "./lib/api";

function ProtectedRoute({ token, children }) {
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function AdminRoute({ token, user, children }) {
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== "admin") {
    return <Navigate to="/feed" replace />;
  }

  return children;
}

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem("newsnest_token") || "");
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("newsnest_user");
    return raw ? JSON.parse(raw) : null;
  });
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    if (!token) {
      setNotificationCount(0);
      return;
    }

    const loadNotificationCount = async () => {
      try {
        const { data } = await api.get("/users/me/notifications?limit=10");
        setNotificationCount(Number(data.count || 0));
      } catch {
        setNotificationCount(0);
      }
    };

    loadNotificationCount();
    const intervalId = setInterval(loadNotificationCount, 30000);
    return () => clearInterval(intervalId);
  }, [token]);

  useEffect(() => {
    if (!token) {
      return;
    }

    api
      .get("/auth/me")
      .then(({ data }) => {
        setUser(data);
        localStorage.setItem("newsnest_user", JSON.stringify(data));
      })
      .catch(() => {
        localStorage.removeItem("newsnest_token");
        localStorage.removeItem("newsnest_user");
        setToken("");
        setUser(null);
      });
  }, [token]);

  const authApi = useMemo(
    () => ({
      onAuth: (nextToken, nextUser) => {
        localStorage.setItem("newsnest_token", nextToken);
        localStorage.setItem("newsnest_user", JSON.stringify(nextUser));
        setToken(nextToken);
        setUser(nextUser);
      },
      logout: () => {
        localStorage.removeItem("newsnest_token");
        localStorage.removeItem("newsnest_user");
        setToken("");
        setUser(null);
      },
    }),
    []
  );

  const handleUserUpdated = (partialUser) => {
    setUser((prev) => {
      const merged = { ...(prev || {}), ...(partialUser || {}) };
      localStorage.setItem("newsnest_user", JSON.stringify(merged));
      return merged;
    });
  };

  return (
    <div className="app-shell">
      {token && <Navbar user={user} onLogout={authApi.logout} notificationCount={notificationCount} />}
      <Routes>
        <Route path="/login" element={<LoginPage onAuth={authApi.onAuth} />} />
        <Route
          path="/feed"
          element={
            <ProtectedRoute token={token}>
              <FeedPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/posts/:id"
          element={
            <ProtectedRoute token={token}>
              <PostDetailPage currentUser={user} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <AdminRoute token={token} user={user}>
              <AdminPage />
            </AdminRoute>
          }
        />
        <Route
          path="/explore"
          element={
            <ProtectedRoute token={token}>
              <ExplorePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/trending"
          element={
            <ProtectedRoute token={token}>
              <TrendingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/analytics"
          element={
            <ProtectedRoute token={token}>
              <AnalyticsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/messages"
          element={
            <ProtectedRoute token={token}>
              <MessagesPage currentUser={user} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute token={token}>
              <NotificationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/people"
          element={
            <ProtectedRoute token={token}>
              <PeoplePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute token={token}>
              <ProfilePage currentUser={user} onUserUpdated={handleUserUpdated} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile/:id"
          element={
            <ProtectedRoute token={token}>
              <ProfilePage currentUser={user} onUserUpdated={handleUserUpdated} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/support"
          element={
            <ProtectedRoute token={token}>
              <SupportPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to={token ? "/feed" : "/login"} replace />} />
      </Routes>
      <footer className="app-footer">
        <Link className="app-footer-brand-link" to={token ? "/feed" : "/login"}>
          <div className="app-footer-brand">
            <img src="/logo.png" alt="NewsNest - Trusted social news network logo" className="app-footer-logo" />
            <div>
              <strong>NewsNest</strong>
              <p>Trusted social news network</p>
            </div>
          </div>
        </Link>
        <small>© {new Date().getFullYear()} NewsNest. All rights reserved.</small>
      </footer>
    </div>
  );
}
