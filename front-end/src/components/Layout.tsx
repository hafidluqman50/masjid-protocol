"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

function getNavLinks(role?: string) {
  switch (role) {
    case "board":
      return [
        { href: "/board", label: "Daftar Masjid" },
        { href: "/board/dashboard", label: "Dashboard" },
      ];
    case "verifier":
      return [{ href: "/verifier", label: "Dashboard Verifikasi" }];
    case "admin":
      return [{ href: "/admin", label: "Admin Panel" }];
    default:
      return [{ href: "/", label: "Eksplorasi" }];
  }
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { claims, ready, logout } = useAuth();

  function handleLogout() {
    logout();
    router.push("/");
  }

  const navLinks = getNavLinks(claims?.role);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-xl font-bold text-emerald-800 tracking-tight shrink-0">
              Masjid Protocol
            </Link>

            <nav className="hidden md:flex gap-4 text-sm font-medium text-slate-600">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`hover:text-emerald-700 transition-colors ${
                    pathname === link.href ? "text-emerald-700 font-semibold" : ""
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Base Sepolia
            </span>

            {ready && (
              <>
                {claims ? (
                  <div className="hidden md:flex items-center gap-2">
                    <span className="text-sm text-slate-700 max-w-[140px] truncate font-medium">
                      {claims.name || claims.address.slice(0, 8) + "…"}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase tracking-wide">
                      {claims.role}
                    </span>
                    <button
                      onClick={handleLogout}
                      className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      Keluar
                    </button>
                  </div>
                ) : (
                  <Link
                    href="/connect"
                    className="text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 transition-colors px-3 py-1.5 rounded-md"
                  >
                    Connect Wallet
                  </Link>
                )}
              </>
            )}

            <button
              className="md:hidden p-1.5 rounded-md text-slate-600 hover:bg-slate-100 transition-colors"
              onClick={() => setMobileOpen((prev) => !prev)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden border-t border-slate-100 bg-white px-4 py-3 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`block py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-emerald-700"
                }`}
              >
                {link.label}
              </Link>
            ))}
            {ready && claims && (
              <button
                onClick={() => { setMobileOpen(false); handleLogout(); }}
                className="block w-full text-left py-2 px-3 rounded-md text-sm font-medium text-slate-500 hover:bg-slate-50"
              >
                Keluar
              </button>
            )}
            {ready && !claims && (
              <Link
                href="/connect"
                onClick={() => setMobileOpen(false)}
                className="block py-2 px-3 rounded-md text-sm font-medium text-emerald-700 hover:bg-emerald-50"
              >
                Connect Wallet
              </Link>
            )}
          </div>
        )}
      </header>

      <main className="flex-grow container mx-auto px-4 py-8">{children}</main>

      <footer className="border-t border-slate-200 bg-white py-4">
        <p className="text-center text-xs text-slate-400">
          Masjid Protocol — Infaq transparan di atas blockchain.
        </p>
      </footer>
    </div>
  );
}
