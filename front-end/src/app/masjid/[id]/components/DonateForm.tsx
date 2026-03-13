"use client";

import { Heart, Loader2 } from "lucide-react";
import { useState } from "react";
import { type Address } from "viem";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parseDonateAmount } from "@/lib/utils";
import { useApproveToken, useCashIn, useTokenInfo } from "../hooks";

type Step = "idle" | "approving" | "donating" | "done";

export function DonateForm({
  instanceAddr,
  stablecoin,
}: {
  instanceAddr: Address;
  stablecoin: Address;
}) {
  const { address: userAddr } = useAccount();

  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState<string | null>(null);

  const { dec, balance, allowance, refetchAllowance } = useTokenInfo(stablecoin, instanceAddr, userAddr);
  const approve = useApproveToken();
  const cashIn = useCashIn();

  const parsedAmount = parseDonateAmount(amount, dec);
  const zero = BigInt(0);

  const handleSubmit = async () => {
    if (parsedAmount === zero || !userAddr) return;
    setError(null);

    if (allowance >= parsedAmount) {
      setStep("donating");
      cashIn.mutate(
        { instanceAddr, amount: parsedAmount, note },
        {
          onSuccess: () => setStep("done"),
          onError: (err) => { setError(err.message); setStep("idle"); },
        }
      );
    } else {
      setStep("approving");
      approve.mutate(
        { stablecoin, spender: instanceAddr, amount: parsedAmount },
        {
          onSuccess: async () => {
            await refetchAllowance();
            setStep("donating");
            cashIn.mutate(
              { instanceAddr, amount: parsedAmount, note },
              {
                onSuccess: () => setStep("done"),
                onError: (err) => { setError(err.message); setStep("idle"); },
              }
            );
          },
          onError: (err) => { setError(err.message); setStep("idle"); },
        }
      );
    }
  };

  if (step === "done") {
    return (
      <div className="text-center py-6 space-y-2">
        <p className="text-emerald-700 font-semibold text-lg">✅ Infaq berhasil!</p>
        <p className="text-sm text-slate-500">Terima kasih, infaq Anda telah tercatat on-chain.</p>
        <Button
          variant="outline"
          className="border-emerald-200 text-emerald-700 mt-2"
          onClick={() => { setAmount(""); setNote(""); setStep("idle"); setError(null); approve.reset(); cashIn.reset(); }}
        >
          Infaq lagi
        </Button>
      </div>
    );
  }

  const busy = step !== "idle";
  const isOverBalance = userAddr && parsedAmount > balance;
  const balanceNum = Number(balance) / Math.pow(10, dec);
  const remaining = balanceNum - (parseFloat(amount) || 0);

  const buttonLabel = () => {
    if (step === "approving" && approve.isPending) return <><Loader2 className="w-4 h-4 animate-spin mr-2" />Konfirmasi approve di wallet…</>;
    if (step === "approving") return <><Loader2 className="w-4 h-4 animate-spin mr-2" />Menunggu approve…</>;
    if (step === "donating" && cashIn.isPending) return <><Loader2 className="w-4 h-4 animate-spin mr-2" />Konfirmasi transaksi di wallet…</>;
    if (step === "donating") return <><Loader2 className="w-4 h-4 animate-spin mr-2" />Menunggu konfirmasi…</>;
    return <><Heart className="w-4 h-4 mr-2" />Kirim Infaq</>;
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-slate-700">Jumlah (IDRX)</label>
          {userAddr && (
            <span className={`text-xs font-medium ${isOverBalance ? "text-red-500" : "text-slate-500"}`}>
              Sisa: {remaining.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} IDRX
            </span>
          )}
        </div>
        <Input
          type="number"
          min="0"
          step="0.01"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={busy}
          className={`text-lg border-slate-300 focus-visible:ring-emerald-500 ${isOverBalance ? "border-red-400 focus-visible:ring-red-400" : ""}`}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">Catatan Infaq (Opsional)</label>
        <Input
          placeholder="Al-Fatihah untuk keluarga..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          disabled={busy}
          className="border-slate-300 focus-visible:ring-emerald-500"
        />
        <p className="text-[10px] text-slate-400">Catatan akan di-hash menggunakan keccak256 on-chain.</p>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      {!userAddr ? (
        <p className="text-xs text-slate-400 text-center pt-2">Hubungkan wallet untuk berinfaq.</p>
      ) : (
        <Button
          className="w-full bg-emerald-700 hover:bg-emerald-800 text-white mt-2"
          disabled={parsedAmount === zero || busy || !!isOverBalance}
          onClick={handleSubmit}
        >
          {buttonLabel()}
        </Button>
      )}
    </div>
  );
}
