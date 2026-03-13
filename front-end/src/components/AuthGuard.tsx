"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  role: string | string[];
  children: React.ReactNode;
}

export default function AuthGuard({ role, children }: Props) {
  const { claims, ready } = useAuth();
  const router = useRouter();

  const allowed = useMemo(
    () => (Array.isArray(role) ? role : [role]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(role)]
  );

  useEffect(() => {
    if (!ready) return;
    if (!claims) {
      router.replace("/connect");
      return;
    }
    if (!allowed.includes(claims.role)) {
      router.replace("/");
    }
  }, [ready, claims, router, allowed]);

  if (!ready) return null;
  if (!claims || !allowed.includes(claims.role)) return null;

  return <>{children}</>;
}
