"use client";

import {
  CheckCircle,
  CheckCircle2,
  Loader2,
  PlusCircle,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { type Address, formatUnits, isAddress, keccak256, toHex } from "viem";
import {
  useReadContracts,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import AuthGuard from "@/components/AuthGuard";
import Layout from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiFetch } from "@/lib/auth";
import {
  type CashOutRequest,
  ERC20_ABI,
  MASJID_INSTANCE_ABI,
  VerificationStatus,
} from "@/lib/contracts";
import { formatIDRXCompact } from "@/lib/idrx";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MasjidInfo = {
  masjid_id: string;
  masjid_name: string;
  instance_addr: string;
  vault_addr: string;
  status: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function shortenAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function cashOutStatusBadge(req: CashOutRequest, threshold: bigint) {
  if (req.canceled)
    return <Badge className="bg-slate-100 text-slate-600 border-none">Dibatalkan</Badge>;
  if (req.executed)
    return <Badge className="bg-emerald-100 text-emerald-800 border-none">Executed</Badge>;
  if (BigInt(req.approvals) >= threshold)
    return <Badge className="bg-blue-100 text-blue-800 border-none">Siap Eksekusi</Badge>;
  if (req.expiresAt < BigInt(Math.floor(Date.now() / 1000)))
    return <Badge className="bg-red-100 text-red-800 border-none">Expired</Badge>;
  return <Badge className="bg-amber-100 text-amber-800 border-none">Menunggu Approval</Badge>;
}

// ---------------------------------------------------------------------------
// Propose form
// ---------------------------------------------------------------------------

function ProposeCashOutForm({
  instanceAddress,
  onSuccess,
}: {
  instanceAddress: Address;
  onSuccess: () => void;
}) {
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [expiryDays, setExpiryDays] = useState("3");
  const [formError, setFormError] = useState<string | null>(null);

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!isAddress(to)) return setFormError("Alamat tujuan tidak valid.");
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0)
      return setFormError("Jumlah harus lebih dari 0.");
    const days = Number(expiryDays);
    if (!days || days < 1) return setFormError("Minimal 1 hari expiry.");

    const noteHash = note.trim()
      ? keccak256(toHex(note.trim()))
      : (("0x" + "0".repeat(64)) as `0x${string}`);

    writeContract(
      {
        address: instanceAddress,
        abi: MASJID_INSTANCE_ABI,
        functionName: "proposeCashOut",
        args: [
          to as Address,
          BigInt(Math.round(amountNum * 100)), // IDRX has 2 decimals
          noteHash,
          BigInt(days * 86400),
        ],
      },
      {
        onSuccess: () => {
          setTo("");
          setAmount("");
          setNote("");
          setExpiryDays("3");
          onSuccess();
        },
      }
    );
  };

  if (isSuccess) {
    return (
      <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
        <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-emerald-800">
            Pengajuan berhasil!
          </p>
          <p className="text-xs text-emerald-700 mt-0.5">
            Permintaan pencairan telah diajukan dan menunggu persetujuan.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-slate-700 text-base">
            Alamat Tujuan <span className="text-red-500">*</span>
          </Label>
          <Input
            placeholder="0x..."
            value={to}
            onChange={(e) => setTo(e.target.value)}
            disabled={isPending || isConfirming}
            className="font-mono text-sm border-slate-300 focus-visible:ring-emerald-500"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-slate-700 text-base">
            Jumlah (IDRX) <span className="text-red-500">*</span>
          </Label>
          <Input
            type="number"
            min="1"
            step="1"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={isPending || isConfirming}
            className="border-slate-300 focus-visible:ring-emerald-500"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-slate-700 text-base">
            Keterangan Pengeluaran
          </Label>
          <Input
            placeholder="Contoh: Operasional listrik bulan ini"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={isPending || isConfirming}
            className="border-slate-300 focus-visible:ring-emerald-500"
          />
          <p className="text-xs text-slate-400">
            Akan di-hash (keccak256) sebelum disimpan on-chain.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-slate-700 text-base">
            Batas Waktu (hari) <span className="text-red-500">*</span>
          </Label>
          <Input
            type="number"
            min={1}
            placeholder="3"
            value={expiryDays}
            onChange={(e) => setExpiryDays(e.target.value)}
            disabled={isPending || isConfirming}
            className="border-slate-300 focus-visible:ring-emerald-500"
          />
        </div>
      </div>

      {formError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {formError}
        </p>
      )}

      <Button
        type="submit"
        disabled={isPending || isConfirming}
        className="w-full bg-emerald-700 hover:bg-emerald-800 text-white rounded-md h-11 text-base"
      >
        {isPending || isConfirming ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {isPending ? "Konfirmasi di wallet…" : "Menunggu konfirmasi…"}
          </>
        ) : (
          <>
            <PlusCircle className="w-4 h-4 mr-2" /> Ajukan Pengeluaran
          </>
        )}
      </Button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Cash-out row actions
// ---------------------------------------------------------------------------

function CashOutActions({
  instanceAddress,
  requestId,
  req,
  threshold,
  onSettled,
}: {
  instanceAddress: Address;
  requestId: bigint;
  req: CashOutRequest;
  threshold: bigint;
  onSettled: () => void;
}) {
  const { writeContract, data: txHash, isPending, variables } =
    useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: txHash,
    query: { enabled: !!txHash },
  });

  if (req.executed || req.canceled) return null;

  const canExecute = BigInt(req.approvals) >= threshold;
  const isExpired = req.expiresAt < BigInt(Math.floor(Date.now() / 1000));
  const isBusy = isPending || isConfirming;
  const currentFn = variables?.functionName;

  return (
    <div className="flex gap-2 justify-end">
      {canExecute && !isExpired && (
        <Button
          size="sm"
          variant="outline"
          className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
          onClick={() =>
            writeContract(
              {
                address: instanceAddress,
                abi: MASJID_INSTANCE_ABI,
                functionName: "executeCashOut",
                args: [requestId],
              },
              { onSuccess: onSettled }
            )
          }
          disabled={isBusy}
        >
          {isBusy && currentFn === "executeCashOut" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <CheckCircle className="w-4 h-4 mr-1" /> Execute
            </>
          )}
        </Button>
      )}
      <Button
        size="sm"
        variant="ghost"
        className="text-red-600 hover:bg-red-50 hover:text-red-700"
        onClick={() =>
          writeContract(
            {
              address: instanceAddress,
              abi: MASJID_INSTANCE_ABI,
              functionName: "cancelCashOut",
              args: [requestId],
            },
            { onSuccess: onSettled }
          )
        }
        disabled={isBusy}
      >
        {isBusy && currentFn === "cancelCashOut" ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <XCircle className="w-4 h-4" />
        )}
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main dashboard
// ---------------------------------------------------------------------------

function BoardDashboardInner() {
  const [masjid, setMasjid] = useState<MasjidInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showPropose, setShowPropose] = useState(false);
  const [refreshNonce, setRefreshNonce] = useState(0);

  const refresh = () => setRefreshNonce((n) => n + 1);

  // Load masjid info from backend
  useEffect(() => {
    setLoading(true);
    apiFetch("/board/masjid")
      .then(async (res) => {
        if (!res.ok) {
          const err = (await res.json()) as { error?: string };
          throw new Error(err.error ?? "Gagal memuat data masjid");
        }
        const data = (await res.json()) as { data: MasjidInfo };
        setMasjid(data.data);
      })
      .catch((err: unknown) => setApiError((err as Error).message))
      .finally(() => setLoading(false));
  }, [refreshNonce]);

  const instanceAddress = masjid?.instance_addr as Address | undefined;

  const instanceContract = instanceAddress
    ? ({ address: instanceAddress, abi: MASJID_INSTANCE_ABI } as const)
    : null;

  const { data: instanceData, isLoading: loadingInstance } = useReadContracts({
    contracts: instanceContract
      ? [
          { ...instanceContract, functionName: "status" },
          { ...instanceContract, functionName: "cashOutThreshold" },
          { ...instanceContract, functionName: "cashOutVerifierCount" },
          { ...instanceContract, functionName: "cashOutNonce" },
          { ...instanceContract, functionName: "STABLECOIN" },
          { ...instanceContract, functionName: "balance" },
        ]
      : [],
    query: { enabled: !!instanceAddress, refetchInterval: 8000 },
  });

  const instanceStatus = instanceData?.[0]?.result as number | undefined;
  const cashOutThreshold = instanceData?.[1]?.result as bigint | undefined;
  const verifierCount = instanceData?.[2]?.result as bigint | undefined;
  const cashOutNonce = instanceData?.[3]?.result as bigint | undefined;
  const stablecoinAddress = instanceData?.[4]?.result as Address | undefined;
  const rawBalance = instanceData?.[5]?.result as bigint | undefined;

  const { data: tokenData } = useReadContracts({
    contracts: stablecoinAddress
      ? [
          { address: stablecoinAddress, abi: ERC20_ABI, functionName: "decimals" },
          { address: stablecoinAddress, abi: ERC20_ABI, functionName: "symbol" },
        ]
      : [],
    query: { enabled: !!stablecoinAddress },
  });

  const decimals = (tokenData?.[0]?.result as number | undefined) ?? 2;
  const symbol = (tokenData?.[1]?.result as string | undefined) ?? "IDRX";

  const formattedBalance =
    rawBalance !== undefined
      ? symbol === "IDRX"
        ? formatIDRXCompact(rawBalance)
        : `${parseFloat(formatUnits(rawBalance, decimals)).toLocaleString("id-ID", {
            minimumFractionDigits: 2,
          })} ${symbol}`
      : "—";

  const requestIds =
    cashOutNonce !== undefined
      ? Array.from({ length: Number(cashOutNonce) }, (_, i) => BigInt(i + 1))
      : [];

  const { data: cashOutData } = useReadContracts({
    contracts:
      instanceAddress && requestIds.length > 0
        ? requestIds.map((id) => ({
            address: instanceAddress,
            abi: MASJID_INSTANCE_ABI,
            functionName: "cashOutById" as const,
            args: [id] as const,
          }))
        : [],
    query: {
      enabled: !!instanceAddress && requestIds.length > 0,
      refetchInterval: 8000,
    },
  });

  const isVerified = instanceStatus === VerificationStatus.Verified;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-emerald-600 animate-spin mr-2" />
        <span className="text-slate-500">Memuat data…</span>
      </div>
    );
  }

  if (apiError) {
    return (
      <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl max-w-lg">
        <ShieldAlert className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-red-800">Gagal memuat data</p>
          <p className="text-xs text-red-700 mt-0.5">{apiError}</p>
        </div>
      </div>
    );
  }

  if (!masjid) {
    return (
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl max-w-lg">
        <p className="text-sm font-semibold text-amber-800">Masjid belum terdaftar</p>
        <p className="text-xs text-amber-700 mt-1">
          Wallet Anda belum terhubung dengan masjid manapun. Silakan daftarkan masjid terlebih dahulu.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Nama Masjid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-slate-800">{masjid.masjid_name}</div>
            <p className="font-mono text-[10px] text-slate-400 mt-1 truncate">
              {masjid.instance_addr}
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Saldo Kas</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingInstance ? (
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            ) : (
              <div className="text-2xl font-bold text-emerald-700">{formattedBalance}</div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Threshold Pencairan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">
              {cashOutThreshold?.toString() ?? "—"}{" "}
              <span className="text-sm font-normal text-slate-500">
                dari {verifierCount?.toString() ?? "?"} anggota dewan
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Not verified warning */}
      {!isVerified && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <ShieldAlert className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-800">
            Masjid belum berstatus{" "}
            <span className="font-semibold">Verified</span>. Pencairan dana
            hanya bisa dilakukan setelah terverifikasi oleh Kemenag.
          </p>
        </div>
      )}

      {/* Cash-out table */}
      <Card className="border-slate-200 shadow-sm bg-white">
        <CardHeader className="border-b border-slate-100 pb-4 flex flex-row items-center justify-between">
          <CardTitle className="text-xl text-slate-900">
            Pengajuan Pencairan
          </CardTitle>
          {isVerified && (
            <Button
              className="bg-emerald-700 hover:bg-emerald-800 text-white rounded-md h-9"
              onClick={() => setShowPropose((v) => !v)}
            >
              <PlusCircle className="w-4 h-4 mr-2" />
              {showPropose ? "Tutup Form" : "Ajukan Pengeluaran"}
            </Button>
          )}
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          {showPropose && instanceAddress && (
            <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/50">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">
                Form Pengajuan Pencairan
              </h3>
              <ProposeCashOutForm
                instanceAddress={instanceAddress}
                onSuccess={() => {
                  refresh();
                  setShowPropose(false);
                }}
              />
            </div>
          )}

          {requestIds.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">
              Belum ada pengajuan pencairan.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-200">
                  <TableHead className="text-slate-600">ID</TableHead>
                  <TableHead className="text-slate-600">Tujuan</TableHead>
                  <TableHead className="text-slate-600">Jumlah</TableHead>
                  <TableHead className="text-slate-600">Persetujuan</TableHead>
                  <TableHead className="text-slate-600">Kadaluarsa</TableHead>
                  <TableHead className="text-slate-600">Status</TableHead>
                  <TableHead className="text-right text-slate-600">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cashOutData?.map((result, idx) => {
                  if (!result?.result) return null;
                  const r = result.result as readonly [
                    Address,
                    bigint,
                    `0x${string}`,
                    Address,
                    bigint,
                    bigint,
                    number,
                    boolean,
                    boolean,
                  ];
                  const req: CashOutRequest = {
                    to: r[0],
                    amount: r[1],
                    noteHash: r[2],
                    proposer: r[3],
                    createdAt: r[4],
                    expiresAt: r[5],
                    approvals: r[6],
                    executed: r[7],
                    canceled: r[8],
                  };
                  const requestId = requestIds[idx];
                  const expiryDate = new Date(
                    Number(req.expiresAt) * 1000
                  ).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  });

                  const amountDisplay =
                    symbol === "IDRX"
                      ? formatIDRXCompact(req.amount)
                      : `${parseFloat(formatUnits(req.amount, decimals)).toLocaleString("id-ID")} ${symbol}`;

                  return (
                    <TableRow key={requestId.toString()} className="border-slate-100">
                      <TableCell className="font-mono text-xs">
                        #{requestId.toString()}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {shortenAddr(req.to)}
                      </TableCell>
                      <TableCell className="font-medium text-slate-900">
                        {amountDisplay}
                      </TableCell>
                      <TableCell className="text-slate-600">
                        <div className="flex flex-col gap-1 min-w-[80px]">
                          <span className="text-xs font-medium">
                            {req.approvals} / {cashOutThreshold?.toString() ?? "?"}
                          </span>
                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-emerald-500 h-full transition-all"
                              style={{
                                width: `${Math.min(
                                  100,
                                  cashOutThreshold
                                    ? Math.round(
                                        (req.approvals / Number(cashOutThreshold)) * 100
                                      )
                                    : 0
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {expiryDate}
                      </TableCell>
                      <TableCell>
                        {cashOutStatusBadge(req, cashOutThreshold ?? BigInt(0))}
                      </TableCell>
                      <TableCell>
                        {instanceAddress && (
                          <CashOutActions
                            instanceAddress={instanceAddress}
                            requestId={requestId}
                            req={req}
                            threshold={cashOutThreshold ?? BigInt(0)}
                            onSettled={refresh}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function BoardUI() {
  return (
    <AuthGuard role="board">
      <Layout>
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-slate-900">Dashboard Pengurus</h2>
          <p className="text-slate-500 mt-2">
            Kelola pencairan dana dan informasi masjid Anda.
          </p>
        </div>
        <BoardDashboardInner />
      </Layout>
    </AuthGuard>
  );
}
