import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { login, loginWithGoogle, register } from "../api";
import { useAuth } from "../state";

declare global {
  interface Window {
    google?: any;
  }
}

export function AuthPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("admin@newsnest.local");
  const [password, setPassword] = useState("Admin123!");
  const [error, setError] = useState("");
  const [googleReady, setGoogleReady] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const { loginUser } = useAuth();
  const navigate = useNavigate();
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

  useEffect(() => {
    if (mode !== "login" || !googleClientId || !googleButtonRef.current) {
      return;
    }
    let cancelled = false;
    const scriptId = "google-gsi-script";
    const ensureScript = () =>
      new Promise<void>((resolve, reject) => {
        if (window.google?.accounts?.id) {
          resolve();
          return;
        }
        let script = document.getElementById(scriptId) as HTMLScriptElement | null;
        if (!script) {
          script = document.createElement("script");
          script.id = scriptId;
          script.src = "https://accounts.google.com/gsi/client";
          script.async = true;
          script.defer = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Unable to load Google sign-in"));
          document.body.appendChild(script);
          return;
        }
        script.onload = () => resolve();
      });

    ensureScript()
      .then(() => {
        if (cancelled || !window.google?.accounts?.id || !googleButtonRef.current) {
          return;
        }
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (response: { credential?: string }) => {
            if (!response.credential) return;
            const result = await loginWithGoogle(response.credential);
            loginUser(result.token, result.user);
            navigate(result.user.role === "super_admin" ? "/dashboard" : "/");
          },
        });
        googleButtonRef.current.innerHTML = "";
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          theme: "outline",
          size: "large",
          width: 360,
          text: "continue_with",
          shape: "pill",
        });
        setGoogleReady(true);
      })
      .catch(() => setGoogleReady(false));

    return () => {
      cancelled = true;
    };
  }, [googleClientId, loginUser, mode, navigate]);

  return (
    <div className="auth-layout">
      <div className="auth-copy">
        <span className="eyebrow">NewsNest access</span>
        <h1>Sign in to publish, moderate, and save stories.</h1>
        <p>Use Google sign-in for one-click access, or use the seeded demo accounts for the project presentation.</p>
        <p className="auth-note">Demo accounts: admin@newsnest.local / Admin123! and writer accounts created in the form.</p>
      </div>
      <form
        className="card-surface auth-panel"
        onSubmit={async (event) => {
          event.preventDefault();
          try {
            const result = mode === "login" ? await login(email, password) : await register(name, email, password);
            loginUser(result.token, result.user);
            navigate(result.user.role === "admin" ? "/dashboard" : "/submit");
          } catch (err) {
            setError(err instanceof Error ? err.message : "Authentication failed");
          }
        }}
      >
        <div className="toggle-row">
          <button type="button" className={mode === "login" ? "solid-button" : "ghost-button"} onClick={() => setMode("login")}>Login</button>
          <button type="button" className={mode === "register" ? "solid-button" : "ghost-button"} onClick={() => setMode("register")}>Register</button>
        </div>
        {mode === "register" ? <label>Name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" /></label> : null}
        <label>Email<input value={email} onChange={(event) => setEmail(event.target.value)} type="email" /></label>
        <label>Password<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" /></label>
        <button className="solid-button" type="submit">{mode === "login" ? "Login" : "Create account"}</button>
        {mode === "login" ? (
          <>
            <div className="or-divider"><span>or continue with</span></div>
            <div ref={googleButtonRef} className="google-button-slot" />
            {!googleClientId ? <p className="feedback">Set VITE_GOOGLE_CLIENT_ID to enable Google login.</p> : null}
            {googleClientId && !googleReady ? <p className="feedback">Loading Google sign-in...</p> : null}
          </>
        ) : null}
        {error ? <p className="feedback">{error}</p> : null}
      </form>
    </div>
  );
}
