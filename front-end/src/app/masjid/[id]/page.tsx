"use client";

import { Heart, Loader2, ShieldCheck, ShieldAlert, Users } from "lucide-react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { simulateContract } from "@wagmi/core";
import { type Address, keccak256, toHex, parseUnits } from "viem";
import {
  useAccount,
  useConfig,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import Layout from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  CONTRACT_ADDRESSES,
  ERC20_ABI,
  MASJID_INSTANCE_ABI,
} from "@/lib/contracts";
import { mapContractError } from "@/lib/contractErrors";

type MasjidDetail = {
  masjid_id: string;
  masjid_name: string;
  status: string;
  instance_addr: string | null;
  stablecoin: string;
  masjid_admin: string;
  registered_at: string;
  verified_at: string | null;
  metadata_uri: string;
};

type BoardMember = {
  id: number;
  member_addr: string;
  instance_addr: string;
  is_active: boolean;
};

type IpfsMetadata = {
  foto?: string;
  boardMembers?: Array<{ address: string; name?: string }>;
};

type DonationItem = {
  donor: string;
  amount: string;
  donated_at: string;
  tx_hash: string;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";

function shortenAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatAmount(raw: string | null | undefined, decimals = 2) {
  if (!raw) return "—";
  const n = parseFloat(raw);
  if (isNaN(n)) return "—";
  const val = n / Math.pow(10, decimals);
  return (
    val.toLocaleString("id-ID", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + " IDRX"
  );
}

function ipfsToHttp(uri: string | undefined): string | null {
  if (!uri) return null;
  if (uri.startsWith("ipfs://")) return `https://ipfs.io/ipfs/${uri.slice(7)}`;
  return uri;
}

function statusBadge(status: string) {
  switch (status) {
    case "verified":
      return (
        <Badge className="bg-emerald-100 text-emerald-800 border-none inline-flex items-center gap-1">
          <ShieldCheck className="w-3 h-3" /> Terverifikasi
        </Badge>
      );
    case "pending":
      return (
        <Badge className="bg-amber-100 text-amber-800 border-none">
          Menunggu Verifikasi
        </Badge>
      );
    case "flagged":
      return (
        <Badge className="bg-red-100 text-red-800 border-none inline-flex items-center gap-1">
          <ShieldAlert className="w-3 h-3" /> Bermasalah
        </Badge>
      );
    default:
      return (
        <Badge className="bg-slate-100 text-slate-500 border-none">{status}</Badge>
      );
  }
}

function DonateForm({
  instanceAddr,
  stablecoin,
}: {
  instanceAddr: Address;
  stablecoin: Address;
}) {
  const { address: userAddr } = useAccount();
  const config = useConfig();

  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [step, setStep] = useState<"idle" | "approving" | "waiting_approve" | "donating" | "waiting_donate" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  const { data: decimals } = useReadContract({
    address: stablecoin,
    abi: ERC20_ABI,
    functionName: "decimals",
  });
  const dec = (decimals as number | undefined) ?? 2;

  const { data: balance } = useReadContract({
    address: stablecoin,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: userAddr ? [userAddr] : undefined,
    query: { enabled: !!userAddr },
  });

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: stablecoin,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: userAddr ? [userAddr, instanceAddr] : undefined,
    query: { enabled: !!userAddr },
  });

  const { writeContractAsync: writeApprove, data: approveTx } = useWriteContract();
  const { writeContractAsync: writeCashIn, data: cashInTx } = useWriteContract();

  const { isSuccess: approveConfirmed } = useWaitForTransactionReceipt({ hash: approveTx });
  const { isSuccess: cashInConfirmed } = useWaitForTransactionReceipt({ hash: cashInTx });

  const zero = BigInt(0);
  const parsedAmount = (() => {
    try { return amount ? parseUnits(amount, dec) : zero; }
    catch { return zero; }
  })();
  const noteHash: `0x${string}` = note.trim()
    ? keccak256(toHex(note.trim()))
    : "0x0000000000000000000000000000000000000000000000000000000000000000";

  useEffect(() => {
    if (!approveConfirmed) return;
    void (async () => {
      await refetchAllowance();
      setStep("donating");
      try {
        const { request } = await simulateContract(config, {
          address: instanceAddr,
          abi: MASJID_INSTANCE_ABI,
          functionName: "cashIn",
          args: [parsedAmount, noteHash],
        });
        setStep("waiting_donate");
        await writeCashIn(request);
      } catch (err) {
        setError(mapContractError(err));
        setStep("idle");
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approveConfirmed]);

  useEffect(() => {
    if (cashInConfirmed) setStep("done");
  }, [cashInConfirmed]);

  const handleSubmit = async () => {
    if (parsedAmount === zero || !userAddr) return;
    setError(null);

    const currentAllowance = (allowance as bigint | undefined) ?? zero;

    if (currentAllowance >= parsedAmount) {
      setStep("donating");
      try {
        const { request } = await simulateContract(config, {
          address: instanceAddr,
          abi: MASJID_INSTANCE_ABI,
          functionName: "cashIn",
          args: [parsedAmount, noteHash],
        });
        setStep("waiting_donate");
        await writeCashIn(request);
      } catch (err) {
        setError(mapContractError(err));
        setStep("idle");
      }
    } else {
      setStep("approving");
      try {
        const { request } = await simulateContract(config, {
          address: stablecoin,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [instanceAddr, parsedAmount],
        });
        setStep("waiting_approve");
        await writeApprove(request);
      } catch (err) {
        setError(mapContractError(err));
        setStep("idle");
      }
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
          onClick={() => { setAmount(""); setNote(""); setStep("idle"); setError(null); }}
        >
          Infaq lagi
        </Button>
      </div>
    );
  }

  const busy = step !== "idle";

  const buttonLabel = () => {
    switch (step) {
      case "approving":       return <><Loader2 className="w-4 h-4 animate-spin mr-2" />Konfirmasi approve di wallet…</>;
      case "waiting_approve": return <><Loader2 className="w-4 h-4 animate-spin mr-2" />Menunggu approve…</>;
      case "donating":        return <><Loader2 className="w-4 h-4 animate-spin mr-2" />Konfirmasi transaksi di wallet…</>;
      case "waiting_donate":  return <><Loader2 className="w-4 h-4 animate-spin mr-2" />Menunggu konfirmasi…</>;
      default:                return <><Heart className="w-4 h-4 mr-2" />Kirim Infaq</>;
    }
  };

  const balanceRaw = (balance as bigint | undefined) ?? zero;
  const balanceNum = Number(balanceRaw) / Math.pow(10, dec);
  const remaining = balanceNum - (parseFloat(amount) || 0);
  const isOverBalance = userAddr && parsedAmount > balanceRaw;

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

export default function DetailMasjidPage() {
  const params = useParams();
  const masjidId = decodeURIComponent(params.id as string);

  const [masjid, setMasjid] = useState<MasjidDetail | null>(null);
  const [members, setMembers] = useState<BoardMember[]>([]);
  const [metadata, setMetadata] = useState<IpfsMetadata | null>(null);
  const [donations, setDonations] = useState<DonationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const id = encodeURIComponent(masjidId);
    Promise.all([
      fetch(`${API_BASE}/public/masjids/${id}`).then((r) => r.json()),
      fetch(`${API_BASE}/public/masjids/${id}/donations?limit=10`).then((r) => r.json()),
    ])
      .then(async ([masjidRes, donRes]) => {
        const m = masjidRes as { data?: MasjidDetail; error?: string };
        if (!m.data) {
          setNotFound(true);
          return;
        }
        setMasjid(m.data);
        setDonations((donRes as { data?: DonationItem[] }).data ?? []);

        fetch(`${API_BASE}/public/masjids/${id}/members`)
          .then((r) => r.json())
          .then((res) => setMembers((res as { data?: BoardMember[] }).data ?? []))
          .catch(() => {});

        const httpUri = ipfsToHttp(m.data.metadata_uri);
        if (httpUri) {
          fetch(httpUri)
            .then((r) => r.ok ? r.json() : null)
            .then((meta) => { if (meta) setMetadata(meta as IpfsMetadata); })
            .catch(() => {});
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [masjidId]);

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
        </div>
      </Layout>
    );
  }

  if (notFound || !masjid) {
    return (
      <Layout>
        <div className="text-center py-20 text-slate-500">
          Masjid tidak ditemukan.
        </div>
      </Layout>
    );
  }

  const isVerified = masjid.status === "verified" && !!masjid.instance_addr;
  const fotoUrl = ipfsToHttp(metadata?.foto);

  const nameByAddr: Record<string, string> = {};
  if (metadata?.boardMembers) {
    for (const bm of metadata.boardMembers) {
      if (bm.name) nameByAddr[bm.address.toLowerCase()] = bm.name;
    }
  }

  return (
    <Layout>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
        <div className="lg:col-span-2 space-y-6">
          <div>
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <h2 className="text-3xl font-bold text-slate-900">
                {masjid.masjid_name}
              </h2>
              {statusBadge(masjid.status)}
            </div>
            {masjid.instance_addr && (
              <p className="font-mono text-xs text-slate-400">
                {shortenAddr(masjid.instance_addr)}
              </p>
            )}
          </div>

          {fotoUrl && (
            <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm">
              <Image
                src={fotoUrl}
                alt={masjid.masjid_name}
                width={800}
                height={400}
                className="w-full object-cover max-h-72"
                unoptimized
              />
            </div>
          )}

          <Card className="border-slate-200 shadow-sm bg-white">
            <CardContent className="pt-4 pb-4">
              <div className="flex flex-col sm:flex-row gap-6 text-sm">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">
                    Terdaftar
                  </p>
                  <p className="font-medium text-slate-800">
                    {new Date(masjid.registered_at).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
                {masjid.verified_at && (
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">
                      Terverifikasi
                    </p>
                    <p className="font-medium text-emerald-700">
                      {new Date(masjid.verified_at).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {members.length > 0 && (
            <Card className="border-slate-200 shadow-sm bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-600" /> Pengurus Masjid
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-0">
                  {members.map((m, idx) => {
                    const name = nameByAddr[m.member_addr.toLowerCase()];
                    const isAdmin =
                      m.member_addr.toLowerCase() ===
                      masjid.masjid_admin.toLowerCase();
                    return (
                      <div
                        key={m.id}
                        className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0"
                      >
                        <div>
                          <p className="text-sm font-medium text-slate-800">
                            {name ?? `Anggota #${idx + 1}`}
                            {isAdmin && (
                              <span className="ml-2 text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">
                                Admin
                              </span>
                            )}
                          </p>
                          <p className="font-mono text-xs text-slate-400 mt-0.5">
                            {shortenAddr(m.member_addr)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {donations.length > 0 && (
            <Card className="border-slate-200 shadow-sm bg-white">
              <CardHeader>
                <CardTitle className="text-base text-slate-800">
                  Riwayat Infaq Terbaru
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-0">
                  {donations.map((d) => (
                    <div
                      key={d.tx_hash}
                      className="flex justify-between items-center text-sm py-2.5 border-b border-slate-100 last:border-0"
                    >
                      <div className="space-y-0.5">
                        <p className="font-mono text-xs text-slate-600">
                          {shortenAddr(d.donor)}
                        </p>
                        <p className="text-xs text-slate-400">
                          {new Date(d.donated_at).toLocaleDateString("id-ID")}
                        </p>
                      </div>
                      <span className="font-semibold text-emerald-700">
                        {formatAmount(d.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div>
          <Card className="border-slate-200 shadow-sm bg-white sticky top-24 overflow-hidden py-0">
            <CardHeader className="bg-emerald-50 border-b border-emerald-100 py-4">
              <CardTitle className="text-emerald-900 flex items-center gap-2">
                <Heart className="w-5 h-5 text-emerald-600" /> Form Infaq
              </CardTitle>
              <CardDescription className="text-emerald-700/70">
                Pilih jumlah IDRX untuk diinfaqkan.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 pb-6">
              {isVerified ? (
                <DonateForm
                  instanceAddr={masjid.instance_addr as Address}
                  stablecoin={masjid.stablecoin as Address}
                />
              ) : (
                <p className="text-sm text-slate-400 text-center py-4">
                  Masjid ini belum terverifikasi. Infaq belum tersedia.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
