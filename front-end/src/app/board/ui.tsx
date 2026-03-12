"use client";

import {
  ArrowDownLeft,
  CheckCircle,
  CheckCircle2,
  Loader2,
  PlusCircle,
  ShieldAlert,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { type Address, formatUnits, isAddress, keccak256, toHex } from "viem";
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
import type { CashOutRequest } from "@/lib/contracts";
import { formatIDRXCompact } from "@/lib/idrx";
import {
  useBoardDashboard,
  useBoardDonations,
  useBoardStats,
  useCancelCashOut,
  useExecuteCashOut,
  useProposeCashOut,
} from "./hooks";

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

const proposeSchema = z.object({
  to: z.string().refine((v) => isAddress(v), { message: "Alamat tujuan tidak valid." }),
  amount: z.coerce
    .number({ error: "Jumlah harus berupa angka." })
    .positive("Jumlah harus lebih dari 0."),
  note: z.string().optional(),
  expiryDays: z.coerce
    .number({ error: "Batas waktu harus berupa angka." })
    .int("Harus bilangan bulat.")
    .min(1, "Minimal 1 hari."),
});
type ProposeFormValues = z.input<typeof proposeSchema>;

function ProposeCashOutForm({
  instanceAddress,
  onSuccess,
}: {
  instanceAddress: Address;
  onSuccess: () => void;
}) {
  const propose = useProposeCashOut();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProposeFormValues>({
    resolver: zodResolver(proposeSchema),
    defaultValues: { expiryDays: 3 },
  });

  const onSubmit = (values: ProposeFormValues) => {
    const noteHash = values.note?.trim()
      ? keccak256(toHex(values.note.trim()))
      : (("0x" + "0".repeat(64)) as `0x${string}`);

    propose.mutate(
      {
        instanceAddress,
        to: values.to as Address,
        amount: BigInt(Math.round((values.amount as number) * 100)),
        noteHash,
        ttl: BigInt((values.expiryDays as number) * 86400),
      },
      {
        onSuccess: () => {
          reset();
          onSuccess();
        },
      }
    );
  };

  const isBusy = propose.isPending || propose.isConfirming;

  if (propose.isConfirmed) {
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-slate-700 text-base">
            Alamat Tujuan <span className="text-red-500">*</span>
          </Label>
          <Input
            placeholder="0x..."
            disabled={isBusy}
            className="font-mono text-sm border-slate-300 focus-visible:ring-emerald-500"
            {...register("to")}
          />
          {errors.to && (
            <p className="text-sm text-red-600">{errors.to.message}</p>
          )}
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
            disabled={isBusy}
            className="border-slate-300 focus-visible:ring-emerald-500"
            {...register("amount")}
          />
          {errors.amount && (
            <p className="text-sm text-red-600">{errors.amount.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="text-slate-700 text-base">
            Keterangan Pengeluaran
          </Label>
          <Input
            placeholder="Contoh: Operasional listrik bulan ini"
            disabled={isBusy}
            className="border-slate-300 focus-visible:ring-emerald-500"
            {...register("note")}
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
            disabled={isBusy}
            className="border-slate-300 focus-visible:ring-emerald-500"
            {...register("expiryDays")}
          />
          {errors.expiryDays && (
            <p className="text-sm text-red-600">{errors.expiryDays.message}</p>
          )}
        </div>
      </div>

      {propose.isError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {(propose.error as Error).message}
        </p>
      )}

      <Button
        type="submit"
        disabled={isBusy}
        className="w-full bg-emerald-700 hover:bg-emerald-800 text-white rounded-md h-11 text-base"
      >
        {isBusy ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {propose.isPending ? "Konfirmasi di wallet…" : "Menunggu konfirmasi…"}
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
  const execute = useExecuteCashOut();
  const cancel = useCancelCashOut();

  if (req.executed || req.canceled) return null;

  const canExecute = BigInt(req.approvals) >= threshold;
  const isExpired = req.expiresAt < BigInt(Math.floor(Date.now() / 1000));
  const isBusy =
    execute.isPending || execute.isConfirming ||
    cancel.isPending || cancel.isConfirming;

  return (
    <div className="flex gap-2 justify-end">
      {canExecute && !isExpired && (
        <Button
          size="sm"
          variant="outline"
          className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
          onClick={() =>
            execute.mutate(
              { instanceAddress, requestId },
              { onSuccess: onSettled }
            )
          }
          disabled={isBusy}
        >
          {execute.isPending || execute.isConfirming ? (
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
          cancel.mutate(
            { instanceAddress, requestId },
            { onSuccess: onSettled }
          )
        }
        disabled={isBusy}
      >
        {cancel.isPending || cancel.isConfirming ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <XCircle className="w-4 h-4" />
        )}
      </Button>
    </div>
  );
}

function DonationHistory({ masjidId }: { masjidId: string }) {
  const { data: donations, isLoading } = useBoardDonations(masjidId);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-6 text-slate-400">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Memuat riwayat infaq…</span>
      </div>
    );
  }

  if (!donations || donations.length === 0) {
    return (
      <p className="text-sm text-slate-400 text-center py-6">
        Belum ada infaq masuk.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-slate-200">
          <TableHead className="text-slate-600">Donatur</TableHead>
          <TableHead className="text-slate-600">Jumlah</TableHead>
          <TableHead className="text-slate-600">Tanggal</TableHead>
          <TableHead className="text-slate-600 font-mono text-xs">Tx Hash</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {donations.map((d) => (
          <TableRow key={d.id} className="border-slate-100">
            <TableCell className="font-mono text-xs">
              {shortenAddr(d.donor)}
            </TableCell>
            <TableCell className="font-medium text-emerald-700">
              {formatIDRXCompact(BigInt(d.amount))}
            </TableCell>
            <TableCell className="text-xs text-slate-500">
              {new Date(d.donated_at).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </TableCell>
            <TableCell className="font-mono text-[10px] text-slate-400">
              {d.tx_hash.slice(0, 10)}…
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function BoardDashboardInner({ initialMasjidId }: { initialMasjidId?: string }) {
  const [showPropose, setShowPropose] = useState(false);
  const [selectedId, setSelectedId] = useState<string | undefined>(initialMasjidId);

  const {
    masjid,
    masjids,
    isLoading,
    apiError,
    instanceAddress,
    loadingInstance,
    cashOutThreshold,
    boardMemberCount,
    formattedBalance,
    symbol,
    decimals,
    requestIds,
    requests,
    isVerified,
  } = useBoardDashboard(selectedId);

  const { data: stats } = useBoardStats(masjid?.masjid_id);

  if (isLoading) {
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
    <div className="space-y-4">
      {masjids.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {masjids.map((m) => (
            <button
              key={m.masjid_id}
              onClick={() => setSelectedId(m.masjid_id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                masjid.masjid_id === m.masjid_id
                  ? "bg-emerald-700 text-white border-emerald-700"
                  : "bg-white text-slate-600 border-slate-300 hover:border-emerald-400"
              }`}
            >
              {m.masjid_name}
            </button>
          ))}
        </div>
      )}

      {!isVerified && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <ShieldAlert className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-800">
            Masjid belum berstatus <span className="font-semibold">Verified</span>. Pencairan dana hanya bisa dilakukan setelah terverifikasi.
          </p>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <div className="w-full lg:w-64 shrink-0 space-y-3">
          <Card className="border-slate-200 shadow-sm bg-white">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Masjid</p>
              <p className="font-bold text-slate-900 leading-tight">{masjid.masjid_name}</p>
              <p className="font-mono text-[10px] text-slate-400 mt-1 truncate">{masjid.instance_addr}</p>
              <div className="mt-2">
                {isVerified
                  ? <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">VERIFIED</span>
                  : <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">PENDING</span>
                }
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm bg-white">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> Saldo Kas
              </p>
              {loadingInstance
                ? <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                : <p className="text-2xl font-bold text-emerald-700">{formattedBalance}</p>
              }
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm bg-white">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                <ArrowDownLeft className="w-3 h-3" /> Total Infaq Masuk
              </p>
              <p className="text-2xl font-bold text-slate-800">
                {stats?.total_donations?.toLocaleString("id-ID") ?? "—"}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {stats?.total_amount
                  ? formatIDRXCompact(BigInt(stats.total_amount))
                  : "—"}
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm bg-white">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">
                Threshold Pencairan
              </p>
              <p className="text-2xl font-bold text-slate-800">
                {cashOutThreshold?.toString() ?? "—"}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                dari {boardMemberCount?.toString() ?? "?"} anggota dewan
              </p>
            </CardContent>
          </Card>

          <Button
            className="w-full bg-emerald-700 hover:bg-emerald-800 text-white h-10 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => setShowPropose((v) => !v)}
            disabled={!isVerified}
            title={!isVerified ? "Masjid harus terverifikasi dulu" : undefined}
          >
            <PlusCircle className="w-4 h-4 mr-2" />
            {showPropose ? "Tutup Form" : "Ajukan Pencairan"}
          </Button>
        </div>

        <div className="flex-1 min-w-0 space-y-6">
          {showPropose && instanceAddress && (
            <Card className="border-emerald-200 shadow-sm bg-emerald-50/30">
              <CardHeader className="pb-3 border-b border-emerald-100">
                <CardTitle className="text-base text-slate-800">Form Pengajuan Pencairan</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <ProposeCashOutForm
                  instanceAddress={instanceAddress}
                  onSuccess={() => setShowPropose(false)}
                />
              </CardContent>
            </Card>
          )}

          <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader className="border-b border-slate-100 pb-4">
              <CardTitle className="text-base font-semibold text-slate-900">
                Pengajuan Pencairan
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
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
                      <TableHead className="text-slate-600">Approval</TableHead>
                      <TableHead className="text-slate-600">Kadaluarsa</TableHead>
                      <TableHead className="text-slate-600">Status</TableHead>
                      <TableHead className="text-right text-slate-600">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map(({ requestId, req }) => {
                      const expiryDate = new Date(Number(req.expiresAt) * 1000).toLocaleDateString("id-ID", {
                        day: "numeric", month: "short", year: "numeric",
                      });
                      const amountDisplay =
                        symbol === "IDRX"
                          ? formatIDRXCompact(req.amount)
                          : `${parseFloat(formatUnits(req.amount, decimals)).toLocaleString("id-ID")} ${symbol}`;

                      return (
                        <TableRow key={requestId.toString()} className="border-slate-100">
                          <TableCell className="font-mono text-xs">#{requestId.toString()}</TableCell>
                          <TableCell className="font-mono text-xs">{shortenAddr(req.to)}</TableCell>
                          <TableCell className="font-medium text-slate-900">{amountDisplay}</TableCell>
                          <TableCell className="text-slate-600">
                            <div className="flex flex-col gap-1 min-w-[72px]">
                              <span className="text-xs font-medium">{req.approvals} / {cashOutThreshold?.toString() ?? "?"}</span>
                              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className="bg-emerald-500 h-full transition-all"
                                  style={{ width: `${Math.min(100, cashOutThreshold ? Math.round((req.approvals / Number(cashOutThreshold)) * 100) : 0)}%` }}
                                />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-slate-500">{expiryDate}</TableCell>
                          <TableCell>{cashOutStatusBadge(req, cashOutThreshold ?? BigInt(0))}</TableCell>
                          <TableCell>
                            {instanceAddress && (
                              <CashOutActions
                                instanceAddress={instanceAddress}
                                requestId={requestId}
                                req={req}
                                threshold={cashOutThreshold ?? BigInt(0)}
                                onSettled={() => {}}
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

          <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader className="border-b border-slate-100 pb-4">
              <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                Riwayat Infaq Masuk
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <DonationHistory masjidId={masjid.masjid_id} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function BoardUI({ selectedMasjidId }: { selectedMasjidId?: string }) {
  return (
    <AuthGuard role="board">
      <Layout>
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-900">Dashboard Pengurus</h2>
            <p className="text-slate-500 mt-2">Kelola pencairan dana dan informasi masjid Anda.</p>
          </div>
          <BoardDashboardInner initialMasjidId={selectedMasjidId} />
        </div>
      </Layout>
    </AuthGuard>
  );
}
