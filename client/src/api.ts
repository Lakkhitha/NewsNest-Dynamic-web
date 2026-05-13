import type { Article, ArticleDetailPayload, AuthResponse, DashboardPayload, HomePayload, User } from "./types";

type RequestOptions = RequestInit & {
  rawBody?: boolean;
};

function getToken() {
  return localStorage.getItem("newsnest-token");
}

async function request<T>(path: string, options: RequestOptions = {}) {
  const headers = new Headers(options.headers || {});
  if (!options.rawBody && options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const token = getToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  const response = await fetch(path, { ...options, headers, body: options.rawBody ? options.body : options.body ? JSON.stringify(options.body) : undefined });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || "Request failed");
  }
  return payload as T;
}

export function login(email: string, password: string) {
  return request<AuthResponse>("/api/auth/login", { method: "POST", body: { email, password } });
}

export function register(name: string, email: string, password: string) {
  return request<AuthResponse>("/api/auth/register", { method: "POST", body: { name, email, password } });
}

export function loginWithGoogle(credential: string) {
  return request<AuthResponse>("/api/auth/google", { method: "POST", body: { credential } });
}

export function me() {
  return request<{ user: User }>("/api/auth/me");
}

export function getPreferences() {
  return request<{ favoriteCategories: Array<{ id: number; name: string; slug: string; description?: string }> }>("/api/me/preferences");
}

export function updatePreferences(categorySlugs: string[]) {
  return request<{ favoriteCategories: Array<{ id: number; name: string; slug: string; description?: string }> }>("/api/me/preferences", { method: "PUT", body: { categorySlugs } });
}

export function getHome() {
  return request<HomePayload>("/api/home");
}

export function getArticles(params: { q?: string; category?: string } = {}) {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.category) search.set("category", params.category);
  const suffix = search.toString() ? `?${search.toString()}` : "";
  return request<{ articles: Article[] }>(`/api/articles${suffix}`);
}

export function getCategory(slug: string) {
  return request<{ category: { id: number; name: string; slug: string; description?: string }; articles: Article[] }>(`/api/categories/${slug}`);
}

export function getArticle(slug: string) {
  return request<ArticleDetailPayload>(`/api/articles/${slug}`);
}

export function getCategories() {
  return request<{ categories: Array<{ id: number; name: string; slug: string; description?: string }> }>("/api/categories");
}

export function subscribeNewsletter(name: string, email: string) {
  return request<{ message: string }>("/api/newsletter", { method: "POST", body: { name, email } });
}

export function sendContact(payload: { name: string; email: string; subject: string; message: string }) {
  return request<{ message: string }>("/api/contact", { method: "POST", body: payload });
}

export function submitArticle(formData: FormData) {
  return request<{ article: Article }>("/api/articles", { method: "POST", body: formData, rawBody: true });
}

export function bookmarkArticle(id: number) {
  return request<{ bookmarked: boolean }>(`/api/articles/${id}/bookmark`, { method: "POST" });
}

export function addComment(id: number, content: string) {
  return request<{ ok: boolean }>(`/api/articles/${id}/comments`, { method: "POST", body: { content } });
}

export function fetchBookmarks() {
  return request<{ bookmarks: Article[] }>("/api/me/bookmarks");
}

export function fetchDashboard() {
  return request<DashboardPayload>("/api/dashboard/summary");
}

export function fetchMyArticles() {
  return request<{ articles: Article[] }>("/api/my/articles");
}

export function updateArticleStatus(id: number, status: string) {
  return request<{ ok: boolean }>(`/api/articles/${id}/status`, { method: "PATCH", body: { status } });
}

export function toggleFeature(id: number, featured: boolean) {
  return request<{ ok: boolean }>(`/api/articles/${id}/feature`, { method: "PATCH", body: { featured: featured ? 1 : 0 } });
}

export function deleteArticle(id: number) {
  return request<{ ok: boolean }>(`/api/articles/${id}`, { method: "DELETE" });
}

export function updateUserRole(id: number, role: string) {
  return request<{ ok: boolean }>(`/api/admin/users/${id}/role`, { method: "PATCH", body: { role } });
}

export function uploadAsset(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return request<{ url: string }>("/api/upload", { method: "POST", body: formData, rawBody: true });
}
