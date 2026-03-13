const TOKEN_KEY = "mp_jwt";

export interface JWTClaims {
  address: string;
  name: string;
  role: "admin" | "verifier" | "board" | "guest";
  exp: number;
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  window.dispatchEvent(new Event("mp_auth_change"));
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  window.dispatchEvent(new Event("mp_auth_change"));
}

export function decodeToken(token: string): JWTClaims | null {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(
      atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
    ) as JWTClaims;
  } catch {
    return null;
  }
}

export function isTokenValid(token: string): boolean {
  const claims = decodeToken(token);
  if (!claims) return false;
  return claims.exp * 1000 > Date.now();
}

export function getClaims(): JWTClaims | null {
  const token = getToken();
  if (!token) return null;
  if (!isTokenValid(token)) {
    clearToken();
    return null;
  }
  return decodeToken(token);
}

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";

export async function siweLogin(
  address: string,
  signMessage: (args: { message: string }) => Promise<`0x${string}`>
): Promise<JWTClaims> {
  const nonceRes = await fetch(`${API_BASE}/auth/nonce?address=${address}`);
  if (!nonceRes.ok) throw new Error("Gagal mendapatkan nonce");
  const { message } = (await nonceRes.json()) as { message: string };

  const signature = await signMessage({ message });

  const verifyRes = await fetch(`${API_BASE}/auth/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address, message, signature }),
  });
  if (!verifyRes.ok) {
    const err = (await verifyRes.json()) as { error?: string };
    throw new Error(err.error ?? "Autentikasi gagal");
  }
  const { token } = (await verifyRes.json()) as { token: string };
  setToken(token);
  const claims = decodeToken(token);
  if (!claims) throw new Error("Token tidak valid");
  return claims;
}

export async function updateName(name: string): Promise<JWTClaims> {
  const token = getToken();
  if (!token) throw new Error("Sesi tidak ditemukan");
  const res = await fetch(`${API_BASE}/auth/me/name`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error("Gagal menyimpan nama");
  const { token: newToken } = (await res.json()) as { token: string };
  setToken(newToken);
  const claims = decodeToken(newToken);
  if (!claims) throw new Error("Token tidak valid");
  return claims;
}

export async function claimBoardRole(): Promise<JWTClaims> {
  const token = getToken();
  if (!token) throw new Error("Sesi tidak ditemukan");
  const res = await fetch(`${API_BASE}/auth/me/role`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const err = (await res.json()) as { error?: string };
    throw new Error(err.error ?? "Gagal mengklaim role");
  }
  const { token: newToken } = (await res.json()) as { token: string };
  setToken(newToken);
  const claims = decodeToken(newToken);
  if (!claims) throw new Error("Token tidak valid");
  return claims;
}

export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = getToken();
  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Content-Type": "application/json",
    },
  });
}

export function roleRedirect(role: string): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "verifier":
      return "/verifier";
    case "board":
      return "/board";
    default:
      return "/";
  }
}
