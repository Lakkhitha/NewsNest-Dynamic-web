import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";

function getPasswordStrength(password) {
  if (!password) return { label: "", value: 0 };
  let score = 0;
  if (password.length >= 8) score += 25;
  if (/[A-Z]/.test(password)) score += 20;
  if (/[a-z]/.test(password)) score += 20;
  if (/[0-9]/.test(password)) score += 20;
  if (/[^A-Za-z0-9]/.test(password)) score += 15;

  if (score < 45) return { label: "Weak", value: score };
  if (score < 75) return { label: "Medium", value: score };
  return { label: "Strong", value: score };
}

export default function LoginPage({ onAuth }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const strength = getPasswordStrength(form.password);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/auth/login" : "/auth/register";
      const payload =
        mode === "login"
          ? { email: form.email, password: form.password }
          : { name: form.name, email: form.email, password: form.password };
      const { data } = await api.post(endpoint, payload);
      onAuth(data.token, data.user);
      navigate("/feed");
    } catch (err) {
      if (!err.response) {
        setError("Cannot reach server. Start backend at http://127.0.0.1:4000 and try again.");
      } else {
        setError(err.response?.data?.message || "Authentication failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <img src="/logo.png" alt="NewsNest logo" className="auth-logo" />
          <div>
            <h2>NewsNest</h2>
            <small>Social News Network</small>
          </div>
        </div>
        <p>Report verified news. Follow trusted posters. Discover what matters.</p>
        <form onSubmit={submit} className="auth-form">
          {mode === "register" && (
            <input
              placeholder="Full name"
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              required
            />
          )}
          <input
            placeholder="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
            required
          />
          <input
            placeholder="Password"
            type={showPassword ? "text" : "password"}
            value={form.password}
            onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
            required
            minLength={6}
          />
          <div className="auth-inline-controls">
            <button className="ghost-btn" type="button" onClick={() => setShowPassword((s) => !s)}>
              {showPassword ? "Hide Password" : "Show Password"}
            </button>
          </div>
          {mode === "register" && (
            <div className="auth-strength">
              <p>Password strength: {strength.label || "Type password"}</p>
              <div className="meter">
                <span style={{ width: `${strength.value}%` }} />
              </div>
            </div>
          )}
          {error && <p className="error-text">{error}</p>}
          <button className="primary-btn" type="submit" disabled={loading}>
            {loading ? "Please wait..." : mode === "login" ? "Login" : "Create account"}
          </button>
        </form>
        {mode === "login" && (
          <div className="demo-quick-auth">
            <p>Quick Demo Login</p>
            <div className="action-row">
              <button
                className="ghost-btn"
                type="button"
                onClick={() => setForm((s) => ({ ...s, email: "admin@newsnest.app", password: "Admin@123" }))}
              >
                Fill Admin
              </button>
              <button
                className="ghost-btn"
                type="button"
                onClick={() => setForm((s) => ({ ...s, email: "luna@newsnest.app", password: "User@123" }))}
              >
                Fill User
              </button>
            </div>
          </div>
        )}
        <button
          className="link-btn"
          type="button"
          onClick={() => setMode(mode === "login" ? "register" : "login")}
        >
          {mode === "login" ? "Need an account? Register" : "Already have an account? Login"}
        </button>
        <small>Demo admin: admin@newsnest.app / Admin@123</small>
      </div>
    </main>
  );
}
