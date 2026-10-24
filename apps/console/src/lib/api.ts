
export const API = "http://localhost:4000";

const TOKEN_KEY = "ailo_owner_token";

export function getToken() {
  return typeof window === "undefined" ? null : window.localStorage.getItem(TOKEN_KEY);
}

export async function signIn(pin: string): Promise<string> {
  const response = await fetch(`${API}/v1/owner/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin }),
  });
  if (!response.ok) throw new Error("Sign in failed. Check the PIN and try again.");
  const { token } = await response.json();
  if (typeof token !== "string" || !token) throw new Error("The server did not return a session token.");
  window.localStorage.setItem(TOKEN_KEY, token);
  window.dispatchEvent(new Event("ailo:session"));
  return token;
}

export async function ownerFetch<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  if (!token) throw new Error("Sign in required.");
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init.headers, Authorization: `Owner ${token}` },
  });
  if (!response.ok) throw new Error(`Request failed (${response.status}): ${path}`);
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
