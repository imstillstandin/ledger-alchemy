const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("ic_token");
}

export function setToken(token: string) {
  localStorage.setItem("ic_token", token);
}

export function clearToken() {
  localStorage.removeItem("ic_token");
}

async function req(path: string, opts: RequestInit = {}) {
  const headers: any = { "Content-Type": "application/json", ...(opts.headers || {}) };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${path}`, { ...opts, headers });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error(data?.detail || `Request failed: ${res.status}`);
  }
  return data;
}

export const api = {
  health: () => req("/health"),
  items: () => req("/items"),
  challenge: (wallet: string) => req("/auth/challenge", { method: "POST", body: JSON.stringify({ wallet }) }),
  login: (wallet: string, nonce: string, signature?: string) =>
    req("/auth/login", { method: "POST", body: JSON.stringify({ wallet, nonce, signature }) }),
  craft: (left_item_id: number, right_item_id: number) =>
    req("/craft", { method: "POST", body: JSON.stringify({ left_item_id, right_item_id }) }),
  inventory: () => req("/me/inventory"),
  leaderboard: () => req("/leaderboard")
};
