"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Building2, CheckCircle2, Loader2, ShieldCheck, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  claimBoardRole,
  getClaims,
  roleRedirect,
  siweLogin,
  updateName,
  type JWTClaims,
} from "@/lib/auth";

type Step = "connect" | "signing" | "name" | "role" | "redirecting";

export default function ConnectUI() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const [step, setStep] = useState<Step>("connect");
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [claims, setClaims] = useState<JWTClaims | null>(null);
  const [claimingBoard, setClaimingBoard] = useState(false);
  const signingRef = useRef(false);

  useEffect(() => {
    const existing = getClaims();
    if (existing) {
      router.replace(roleRedirect(existing.role));
    }
  }, [router]);

  useEffect(() => {
    if (!isConnected || !address || step !== "connect" || signingRef.current) return;

    const existing = getClaims();
    if (existing && existing.address.toLowerCase() === address.toLowerCase()) {
      if (!existing.name) {
        setClaims(existing);
        setStep("role");
      } else {
        setStep("redirecting");
        router.replace(roleRedirect(existing.role));
      }
      return;
    }

    signingRef.current = true;
    setStep("signing");
    setError(null);

    siweLogin(address, signMessageAsync)
      .then((c) => {
        setClaims(c);
        if (!c.name) {
          setStep("role");
        } else {
          setStep("redirecting");
          router.replace(roleRedirect(c.role));
        }
      })
      .catch((err: unknown) => {
        setError((err as Error).message ?? "Gagal masuk");
        setStep("connect");
      })
      .finally(() => {
        signingRef.current = false;
      });
  }, [isConnected, address, step, router, signMessageAsync]);

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return setNameError("Nama tidak boleh kosong");
    if (trimmed.length < 3) return setNameError("Nama minimal 3 karakter");
    setNameError(null);
    try {
      const updated = await updateName(trimmed);
      setClaims(updated);
      setStep("redirecting");
      router.replace(roleRedirect(updated.role));
    } catch (err: unknown) {
      setNameError((err as Error).message);
    }
  };

  const handleSelectGuest = () => {
    setStep("name");
  };

  const handleSelectBoard = async () => {
    setRoleError(null);
    setClaimingBoard(true);
    try {
      const updated = await claimBoardRole();
      setClaims(updated);
      setStep("name");
    } catch (err: unknown) {
      setRoleError((err as Error).message);
    } finally {
      setClaimingBoard(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-700 flex items-center justify-center">
              <ShieldCheck className="w-7 h-7 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Masjid Protocol</h1>
          <p className="text-slate-500 mt-2 text-sm leading-relaxed">
            Infaq masjid yang transparan dan terverifikasi di atas blockchain
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          {step === "connect" && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-lg font-semibold text-slate-800">
                  Hubungkan Dompet
                </h2>
                <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                  Gunakan dompet kripto Anda untuk masuk ke platform.
                </p>
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-center">
                  {error}
                </p>
              )}

              <div className="flex justify-center">
                <ConnectButton label="Connect Wallet" />
              </div>

              <p className="text-xs text-slate-400 text-center leading-relaxed">
                Platform berjalan di jaringan Base Sepolia.
              </p>
            </div>
          )}

          {step === "signing" && (
            <div className="text-center py-6 space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                <Loader2 className="w-7 h-7 text-emerald-600 animate-spin" />
              </div>
              <div>
                <p className="font-semibold text-slate-800 text-lg">
                  Menunggu tanda tangan…
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  Silakan konfirmasi permintaan tanda tangan di dompet Anda
                </p>
              </div>
            </div>
          )}

          {step === "name" && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-lg font-semibold text-slate-800">
                  Lengkapi Profil
                </h2>
                <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                  Masukkan nama lengkap Anda.
                </p>
              </div>

              <form onSubmit={handleNameSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-slate-700 text-base">
                    Nama Lengkap <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="Contoh: Bapak Ahmad Fauzi"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="border-slate-300 focus-visible:ring-emerald-500 text-base h-11"
                    autoFocus
                  />
                  {nameError && (
                    <p className="text-xs text-red-600">{nameError}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full bg-emerald-700 hover:bg-emerald-800 text-white h-11 text-base"
                >
                  Simpan & Lanjutkan
                </Button>
              </form>
            </div>
          )}

          {step === "role" && claims && (
            <div className="space-y-5">
              <div className="text-center">
                <div className="flex justify-center mb-3">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                </div>
                <h2 className="text-lg font-semibold text-slate-800">
                  Selamat datang, {claims.name}!
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Pilih peran Anda di platform ini.
                </p>
              </div>

              {roleError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-center">
                  {roleError}
                </p>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleSelectGuest}
                  disabled={claimingBoard}
                  className="rounded-xl border-2 border-slate-200 bg-white p-4 text-center hover:border-emerald-400 hover:bg-emerald-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <User className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                  <p className="text-sm font-semibold text-slate-800">Pengunjung</p>
                  <p className="text-xs text-slate-500 mt-0.5">Donatur umum</p>
                </button>

                <button
                  onClick={handleSelectBoard}
                  disabled={claimingBoard}
                  className="rounded-xl border-2 border-slate-200 bg-white p-4 text-center hover:border-emerald-400 hover:bg-emerald-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {claimingBoard ? (
                    <Loader2 className="w-8 h-8 mx-auto mb-2 text-emerald-600 animate-spin" />
                  ) : (
                    <Building2 className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                  )}
                  <p className="text-sm font-semibold text-slate-800">Pengurus Masjid</p>
                  <p className="text-xs text-slate-500 mt-0.5">Board masjid terdaftar</p>
                </button>
              </div>

              <p className="text-xs text-slate-400 text-center">
                Pengurus Masjid hanya untuk alamat wallet yang telah terdaftar sebagai board on-chain.
              </p>
            </div>
          )}

          {step === "redirecting" && (
            <div className="text-center py-6 space-y-3">
              <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
              <p className="text-slate-600 font-medium">
                Mengarahkan ke dashboard…
              </p>
            </div>
          )}
        </div>

        <p className="text-center mt-6">
          <Link
            href="/"
            className="text-sm text-slate-500 hover:text-emerald-700 transition-colors"
          >
            ← Kembali ke beranda
          </Link>
        </p>
      </div>
    </div>
  );
}
