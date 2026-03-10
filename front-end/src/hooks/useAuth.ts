"use client";

import { useEffect, useState } from "react";
import { clearToken, getClaims, type JWTClaims } from "@/lib/auth";

export function useAuth() {
  const [claims, setClaims] = useState<JWTClaims | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setClaims(getClaims());
    setReady(true);

    const handler = () => setClaims(getClaims());
    window.addEventListener("mp_auth_change", handler);
    return () => window.removeEventListener("mp_auth_change", handler);
  }, []);

  function logout() {
    clearToken();
  }

  return { claims, ready, isLoggedIn: !!claims, logout };
}
