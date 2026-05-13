import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { me } from "./api";
import type { User } from "./types";

type AuthContextValue = {
  user: User | null;
  token: string | null;
  ready: boolean;
  loginUser: (token: string, user: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("newsnest-token"));
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem("newsnest-user");
    return raw ? (JSON.parse(raw) as User) : null;
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    if (!token) {
      setReady(true);
      return;
    }
    me()
      .then((result) => {
        if (!active) return;
        setUser(result.user);
        localStorage.setItem("newsnest-user", JSON.stringify(result.user));
      })
      .catch(() => {
        if (!active) return;
        localStorage.removeItem("newsnest-token");
        localStorage.removeItem("newsnest-user");
        setToken(null);
        setUser(null);
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, [token]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      ready,
      loginUser: (nextToken, nextUser) => {
        setToken(nextToken);
        setUser(nextUser);
        localStorage.setItem("newsnest-token", nextToken);
        localStorage.setItem("newsnest-user", JSON.stringify(nextUser));
      },
      logout: () => {
        localStorage.removeItem("newsnest-token");
        localStorage.removeItem("newsnest-user");
        setToken(null);
        setUser(null);
      },
      refreshUser: async () => {
        const result = await me();
        setUser(result.user);
        localStorage.setItem("newsnest-user", JSON.stringify(result.user));
      },
    }),
    [ready, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

type ThemeContextValue = {
  theme: "light" | "dark";
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const stored = localStorage.getItem("newsnest-theme");
    if (stored === "light" || stored === "dark") return stored;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("newsnest-theme", theme);
  }, [theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, toggleTheme: () => setTheme((current) => (current === "dark" ? "light" : "dark")) }),
    [theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
