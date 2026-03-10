"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Loader2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getClaims, roleRedirect, siweLogin, updateName } from "@/lib/auth";

type Step = "connect" | "signing" | "name" | "redirecting";

export default function ConnectUI() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const [step, setStep] = useState<Step>("connect");
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);

  // Redirect if already logged in
  useEffect(() => {
    const claims = getClaims();
    if (claims) {
      router.replace(roleRedirect(claims.role));
    }
  }, [router]);

  // Auto-trigger SIWE when wallet connects
  useEffect(() => {
    if (!isConnected || !address || step !== "connect") return;

    const existing = getClaims();
    if (
      existing &&
      existing.address.toLowerCase() === address.toLowerCase()
    ) {
      if (!existing.name) {
        setStep("name");
      } else {
        setStep("redirecting");
        router.replace(roleRedirect(existing.role));
      }
      return;
    }

    setStep("signing");
    setError(null);

    siweLogin(address, signMessageAsync)
      .then((claims) => {
        if (!claims.name) {
          setStep("name");
        } else {
          setStep("redirecting");
          router.replace(roleRedirect(claims.role));
        }
      })
      .catch((err: unknown) => {
        setError((err as Error).message ?? "Gagal masuk");
        setStep("connect");
      });
  }, [isConnected, address, step, router, signMessageAsync]);

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return setNameError("Nama tidak boleh kosong");
    if (trimmed.length < 3) return setNameError("Nama minimal 3 karakter");
    setNameError(null);
    try {
      const claims = await updateName(trimmed);
      setStep("redirecting");
      router.replace(roleRedirect(claims.role));
    } catch (err: unknown) {
      setNameError((err as Error).message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-700 flex items-center justify-center">
              <ShieldCheck className="w-7 h-7 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Masjid Protocol</h1>
          <p className="text-slate-500 mt-2 text-sm leading-relaxed">
            Donasi masjid yang transparan dan terverifikasi di atas blockchain
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          {/* Step: connect */}
          {step === "connect" && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-lg font-semibold text-slate-800">
                  Hubungkan Dompet
                </h2>
                <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                  Gunakan dompet kripto Anda untuk masuk ke platform. Tanda
                  tangan digital akan diminta untuk memverifikasi identitas
                  Anda.
                </p>
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-center">
                  {error}
                </p>
              )}

              <div className="flex justify-center">
                <ConnectButton label="Hubungkan Dompet" />
              </div>

              <p className="text-xs text-slate-400 text-center leading-relaxed">
                Dengan melanjutkan, Anda menyetujui bahwa platform ini berjalan
                di jaringan Base Sepolia.
              </p>
            </div>
          )}

          {/* Step: signing */}
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

          {/* Step: name */}
          {step === "name" && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-lg font-semibold text-slate-800">
                  Lengkapi Profil
                </h2>
                <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                  Masukkan nama lengkap Anda. Nama ini akan ditampilkan di
                  seluruh platform.
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
                  <p className="text-xs text-slate-400">
                    Minimal 3 karakter. Tidak dapat diganti secara bebas.
                  </p>
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

          {/* Step: redirecting */}
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
