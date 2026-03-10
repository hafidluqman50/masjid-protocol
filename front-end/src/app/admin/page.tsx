"use client";

import {
  CheckCircle,
  CheckCircle2,
  Loader2,
  PlusCircle,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { type Address, formatUnits, isAddress, keccak256, toHex } from "viem";
import {
  useAccount,
  useReadContract,
  useReadContracts,
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
import {
  type CashOutRequest,
  ERC20_ABI,
  MASJID_INSTANCE_ABI,
  VerificationStatus,
} from "@/lib/contracts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function shortenAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function cashOutStatusBadge(req: CashOutRequest, threshold: bigint) {
  if (req.canceled)
    return (
      <Badge className="bg-slate-100 text-slate-600 border-none">
        Dibatalkan
      </Badge>
    );
  if (req.executed)
    return (
      <Badge className="bg-emerald-100 text-emerald-800 border-none">
        Executed
      </Badge>
    );
  if (BigInt(req.approvals) >= threshold)
    return (
      <Badge className="bg-blue-100 text-blue-800 border-none">
        Siap Eksekusi
      </Badge>
    );
  if (req.expiresAt < BigInt(Math.floor(Date.now() / 1000)))
    return (
      <Badge className="bg-red-100 text-red-800 border-none">Expired</Badge>
    );
  return (
    <Badge className="bg-amber-100 text-amber-800 border-none">
      Menunggu Approval
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: Propose Cash-Out form
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
      : ("0x" + "0".repeat(64)) as `0x${string}`;

    writeContract(
      {
        address: instanceAddress,
        abi: MASJID_INSTANCE_ABI,
        functionName: "proposeCashOut",
        args: [
          to as Address,
          BigInt(Math.round(amountNum * 1e6)), // assumes 6-decimal stablecoin (USDC/USDT)
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
      },
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
            Cash-out request telah diajukan dan menunggu persetujuan anggota
            dewan.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-slate-700 text-sm">
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
          <Label className="text-slate-700 text-sm">
            Jumlah (USDC) <span className="text-red-500">*</span>
          </Label>
          <Input
            type="number"
            min="0.01"
            step="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={isPending || isConfirming}
            className="border-slate-300 focus-visible:ring-emerald-500"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-slate-700 text-sm">
            Keterangan Pengeluaran
          </Label>
          <Input
            placeholder="Contoh: Operasional listrik bulan ini"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={isPending || isConfirming}
            className="border-slate-300 focus-visible:ring-emerald-500"
          />
          <p className="text-[10px] text-slate-400">
            Akan di-hash (keccak256) sebelum disimpan on-chain.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-slate-700 text-sm">
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
        className="w-full bg-emerald-700 hover:bg-emerald-800 text-white rounded-md"
      >
        {isPending || isConfirming ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {isPending ? "Konfirmasi di wallet..." : "Menunggu konfirmasi..."}
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
// Sub-component: Cash-out row actions (execute / cancel)
// ---------------------------------------------------------------------------

function CashOutActions({
  instanceAddress,
  requestId,
  req,
  threshold,
  isAdmin,
  onSettled,
}: {
  instanceAddress: Address;
  requestId: bigint;
  req: CashOutRequest;
  threshold: bigint;
  isAdmin: boolean;
  onSettled: () => void;
}) {
  const { writeContract, data: txHash, isPending, variables } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: txHash,
    query: { enabled: !!txHash },
  });

  if (!isAdmin || req.executed || req.canceled) return null;

  const canExecute = BigInt(req.approvals) >= threshold;
  const isExpired =
    req.expiresAt < BigInt(Math.floor(Date.now() / 1000));

  const isBusy = isPending || isConfirming;
  const currentFn = variables?.functionName;

  const handleExecute = () => {
    writeContract(
      {
        address: instanceAddress,
        abi: MASJID_INSTANCE_ABI,
        functionName: "executeCashOut",
        args: [requestId],
      },
      { onSuccess: onSettled },
    );
  };

  const handleCancel = () => {
    writeContract(
      {
        address: instanceAddress,
        abi: MASJID_INSTANCE_ABI,
        functionName: "cancelCashOut",
        args: [requestId],
      },
      { onSuccess: onSettled },
    );
  };

  return (
    <div className="flex gap-2 justify-end">
      {canExecute && !isExpired && (
        <Button
          size="sm"
          variant="outline"
          className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
          onClick={handleExecute}
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
        onClick={handleCancel}
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
// Main page
// ---------------------------------------------------------------------------

export default function AdminDashboard() {
  const { address: connectedAddress, isConnected } = useAccount();

  // The masjid instance address — in production this comes from routing
  // (e.g. /admin/[instanceAddress]) or from wallet-specific indexer query.
  // For now we keep a simple input so the admin can enter it manually.
  const [instanceInput, setInstanceInput] = useState("");
  const [instanceAddress, setInstanceAddress] = useState<Address | null>(null);
  const [showPropose, setShowPropose] = useState(false);
  const [refreshNonce, setRefreshNonce] = useState(0);

  const refresh = () => setRefreshNonce((n) => n + 1);

  // ── Read instance state ──────────────────────────────────────────────────
  const instanceContract = instanceAddress
    ? ({ address: instanceAddress, abi: MASJID_INSTANCE_ABI } as const)
    : null;

  const { data: instanceData, isLoading: loadingInstance } = useReadContracts({
    contracts: instanceContract
      ? [
          { ...instanceContract, functionName: "masjidName" },
          { ...instanceContract, functionName: "masjidAdmin" },
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

  const masjidName = instanceData?.[0]?.result as string | undefined;
  const masjidAdmin = instanceData?.[1]?.result as Address | undefined;
  const instanceStatus = instanceData?.[2]?.result as number | undefined;
  const cashOutThreshold = instanceData?.[3]?.result as bigint | undefined;
  const verifierCount = instanceData?.[4]?.result as bigint | undefined;
  const cashOutNonce = instanceData?.[5]?.result as bigint | undefined;
  const stablecoinAddress = instanceData?.[6]?.result as Address | undefined;
  const rawBalance = instanceData?.[7]?.result as bigint | undefined;

  const isAdmin =
    !!masjidAdmin &&
    !!connectedAddress &&
    masjidAdmin.toLowerCase() === connectedAddress.toLowerCase();

  // ── Read stablecoin decimals & symbol ────────────────────────────────────
  const { data: tokenData } = useReadContracts({
    contracts: stablecoinAddress
      ? [
          { address: stablecoinAddress, abi: ERC20_ABI, functionName: "decimals" },
          { address: stablecoinAddress, abi: ERC20_ABI, functionName: "symbol" },
        ]
      : [],
    query: { enabled: !!stablecoinAddress },
  });

  const decimals = (tokenData?.[0]?.result as number | undefined) ?? 6;
  const symbol = (tokenData?.[1]?.result as string | undefined) ?? "USDC";

  const formattedBalance =
    rawBalance !== undefined
      ? `${parseFloat(formatUnits(rawBalance, decimals)).toLocaleString("id-ID", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })} ${symbol}`
      : "—";

  // ── Read cash-out requests ───────────────────────────────────────────────
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

  // ── Connect instance ─────────────────────────────────────────────────────
  const handleConnect = () => {
    if (!isAddress(instanceInput.trim())) return;
    setInstanceAddress(instanceInput.trim() as Address);
    setShowPropose(false);
  };

  const isVerified = instanceStatus === VerificationStatus.Verified;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <Layout>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900">Admin Dashboard</h2>
        <p className="text-slate-500 mt-2">
          Kelola pengeluaran dan pengaturan instance masjid Anda.
        </p>
      </div>

      {/* Instance address input */}
      {!instanceAddress ? (
        <Card className="border-slate-200 shadow-sm bg-white max-w-xl">
          <CardHeader>
            <CardTitle className="text-lg text-slate-800">
              Masukkan Alamat Instance Masjid
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-slate-700 text-sm">
                MasjidInstance Address
              </Label>
              <div className="flex gap-2">
                <Input
                  placeholder="0x..."
                  value={instanceInput}
                  onChange={(e) => setInstanceInput(e.target.value)}
                  className="font-mono text-sm border-slate-300 focus-visible:ring-emerald-500"
                />
                <Button
                  onClick={handleConnect}
                  disabled={!isAddress(instanceInput.trim())}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white shrink-0"
                >
                  Buka
                </Button>
              </div>
              <p className="text-xs text-slate-400">
                Alamat ini didapat saat masjid berhasil didaftarkan lewat
                MasjidProtocol.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : loadingInstance ? (
        <div className="flex items-center gap-2 text-slate-500 py-12 justify-center">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Memuat data instance...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Admin guard */}
          {isConnected && !isAdmin && (
            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <ShieldAlert className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-800">
                  Wallet bukan admin masjid ini
                </p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Aksi pengeluaran (propose, execute, cancel) hanya tersedia
                  untuk admin:{" "}
                  <span className="font-mono">{shortenAddr(masjidAdmin ?? "")}</span>
                </p>
              </div>
            </div>
          )}

          {/* Stats row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-slate-200 shadow-sm bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">
                  Nama Masjid
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-slate-800">
                  {masjidName ?? "—"}
                </div>
                <p className="font-mono text-[10px] text-slate-400 mt-1 truncate">
                  {instanceAddress}
                </p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">
                  Saldo Kas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-emerald-700">
                  {formattedBalance}
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">
                  Cash-Out Threshold
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-800">
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
                Masjid belum berstatus <span className="font-semibold">Verified</span>.
                Pencairan dana hanya bisa dilakukan setelah terverifikasi oleh
                Kemenag.
              </p>
            </div>
          )}

          {/* Propose form */}
          <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader className="border-b border-slate-100 pb-4 flex flex-row items-center justify-between">
              <CardTitle className="text-xl text-slate-900">
                Daftar Pengajuan Pencairan
              </CardTitle>
              {isAdmin && isVerified && (
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
                    Form Pengajuan Pencairan Baru
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

              {/* Cash-out table */}
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
                      <TableHead className="text-slate-600">
                        Persetujuan
                      </TableHead>
                      <TableHead className="text-slate-600">
                        Kadaluarsa
                      </TableHead>
                      <TableHead className="text-slate-600">Status</TableHead>
                      <TableHead className="text-right text-slate-600">
                        Aksi
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cashOutData?.map((result, idx) => {
                      if (!result?.result) return null;

                      // cashOutById returns a tuple; map to object
                      const r = result.result as readonly [
                        Address,   // to
                        bigint,    // amount
                        `0x${string}`, // noteHash
                        Address,   // proposer
                        bigint,    // createdAt
                        bigint,    // expiresAt
                        number,    // approvals
                        boolean,   // executed
                        boolean,   // canceled
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
                        Number(req.expiresAt) * 1000,
                      ).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      });

                      return (
                        <TableRow
                          key={requestId.toString()}
                          className="border-slate-100"
                        >
                          <TableCell className="font-mono text-xs">
                            #{requestId.toString()}
                          </TableCell>
                          <TableCell className="font-mono text-xs truncate max-w-[120px]">
                            {shortenAddr(req.to)}
                          </TableCell>
                          <TableCell className="font-medium text-slate-900">
                            {parseFloat(
                              formatUnits(req.amount, decimals),
                            ).toLocaleString("id-ID", {
                              minimumFractionDigits: 2,
                            })}{" "}
                            {symbol}
                          </TableCell>
                          <TableCell className="text-slate-600">
                            <div className="flex flex-col gap-1 min-w-[80px]">
                              <span className="text-xs font-medium">
                                {req.approvals} /{" "}
                                {cashOutThreshold?.toString() ?? "?"}
                              </span>
                              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className="bg-emerald-500 h-full transition-all"
                                  style={{
                                    width: `${Math.min(
                                      100,
                                      cashOutThreshold
                                        ? Math.round(
                                            (req.approvals /
                                              Number(cashOutThreshold)) *
                                              100,
                                          )
                                        : 0,
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
                            {cashOutStatusBadge(
                              req,
                              cashOutThreshold ?? BigInt(0),
                            )}
                          </TableCell>
                          <TableCell>
                            <CashOutActions
                              instanceAddress={instanceAddress!}
                              requestId={requestId}
                              req={req}
                              threshold={cashOutThreshold ?? BigInt(0)}
                              isAdmin={isAdmin}
                              onSettled={refresh}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Change instance button */}
          <div className="text-right">
            <button
              onClick={() => {
                setInstanceAddress(null);
                setInstanceInput("");
              }}
              className="text-xs text-slate-400 hover:text-slate-600 underline"
            >
              Ganti instance masjid
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
}