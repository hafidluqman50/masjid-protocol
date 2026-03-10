"use client";

import {
  ArrowRightCircle,
  CheckCircle2,
  FileText,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { Address } from "viem";
import {
  useAccount,
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
  CardDescription,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CONTRACT_ADDRESSES,
  MASJID_INSTANCE_ABI,
  MASJID_PROTOCOL_ABI,
  RegistrationStatus,
  VERIFIER_REGISTRY_ABI,
} from "@/lib/contracts";

// ---------------------------------------------------------------------------
// Types  (mirrors indexer API responses)
// ---------------------------------------------------------------------------

type PendingRegistration = {
  masjidId: `0x${string}`;
  masjidName: string;
  proposer: Address;
  attestYes: number;
  attestNo: number;
  status: RegistrationStatus;
  createdAt: number;
};

type PendingCashOut = {
  instanceAddress: Address;
  masjidName: string;
  requestId: number;
  to: Address;
  amount: string;     // formatted, e.g. "200 USDC"
  approvals: number;
  threshold: number;
  expiresAt: number;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const INDEXER_API = process.env.NEXT_PUBLIC_INDEXER_API_URL ?? "";

function statusBadge(status: RegistrationStatus) {
  switch (status) {
    case RegistrationStatus.Pending:
      return (
        <Badge className="bg-amber-100 text-amber-800 border-none">
          Pending
        </Badge>
      );
    case RegistrationStatus.Flagged:
      return (
        <Badge className="bg-red-100 text-red-800 border-none">Flagged</Badge>
      );
    default:
      return <Badge className="bg-slate-100 text-slate-600 border-none">{status}</Badge>;
  }
}

function shortenAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

// ---------------------------------------------------------------------------
// Sub-component: Kemenag attestation panel
// ---------------------------------------------------------------------------

function AttestPanel({
  connectedAddress,
  isKemenagVerifier,
}: {
  connectedAddress: Address | undefined;
  isKemenagVerifier: boolean;
}) {
  const [registrations, setRegistrations] = useState<PendingRegistration[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  // Manual fallback when indexer is not yet running
  const [manualMasjidId, setManualMasjidId] = useState("");
  const [noteMap, setNoteMap] = useState<Record<string, string>>({});

  const {
    writeContract,
    data: txHash,
    isPending,
    reset: resetWrite,
    variables: writeVars,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Check if the connected wallet already attested a given masjidId
  const pendingMasjidId =
    writeVars?.args?.[0] as `0x${string}` | undefined;

  // Fetch pending registrations from the indexer
  useEffect(() => {
    if (!INDEXER_API) return;
    setLoadingList(true);
    fetch(`${INDEXER_API}/registrations?status=pending`)
      .then((r) => r.json())
      .then((data: PendingRegistration[]) => setRegistrations(data))
      .catch(() => setRegistrations([]))
      .finally(() => setLoadingList(false));
  }, [isSuccess]);

  const handleAttest = (masjidId: `0x${string}`, support: boolean) => {
    const note = noteMap[masjidId] ?? "";
    writeContract({
      address: CONTRACT_ADDRESSES.masjidProtocol,
      abi: MASJID_PROTOCOL_ABI,
      functionName: "attest",
      args: [masjidId, support, note],
    });
  };

  const handleManualAttest = (support: boolean) => {
    if (!manualMasjidId.startsWith("0x")) return;
    handleAttest(manualMasjidId as `0x${string}`, support);
  };

  if (!connectedAddress) {
    return (
      <p className="text-sm text-slate-500 text-center py-8">
        Hubungkan wallet untuk melihat antrean.
      </p>
    );
  }

  if (!isKemenagVerifier) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-slate-500">
        <ShieldAlert className="w-8 h-8 text-slate-400" />
        <p className="text-sm font-medium">
          Wallet Anda tidak terdaftar sebagai verifikator Kemenag.
        </p>
        <p className="text-xs text-slate-400">
          Hanya verifikator yang terdaftar di VerifierRegistry yang dapat melakukan
          attestasi pendaftaran masjid.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success banner */}
      {isSuccess && (
        <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-800">
              Attestasi berhasil dikirim!
            </p>
            <p className="text-xs text-emerald-700 mt-0.5">
              Vote Anda telah tercatat on-chain. Jika quorum tercapai, status
              masjid akan berubah otomatis.
            </p>
            {txHash && (
              <p className="font-mono text-[10px] text-emerald-600 mt-1 break-all">
                Tx: {txHash}
              </p>
            )}
            <button
              onClick={() => resetWrite()}
              className="text-xs underline text-emerald-700 mt-1"
            >
              Attest masjid lain
            </button>
          </div>
        </div>
      )}

      {/* List from indexer */}
      {loadingList ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
        </div>
      ) : registrations.length > 0 ? (
        <div className="space-y-4">
          {registrations.map((reg) => (
            <div
              key={reg.masjidId}
              className="flex flex-col md:flex-row md:items-center justify-between p-5 border border-slate-200 rounded-xl bg-slate-50/50 hover:border-emerald-200 transition-colors gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-slate-900 text-lg">
                    {reg.masjidName}
                  </h3>
                  {statusBadge(reg.status)}
                </div>
                <div className="flex items-center text-xs text-slate-500 gap-4 font-mono flex-wrap">
                  <span className="flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    {shortenAddr(reg.masjidId)}
                  </span>
                  <span>
                    ✅ {reg.attestYes} Yes · ❌ {reg.attestNo} No
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2 min-w-[280px]">
                <Input
                  placeholder="Catatan (Opsional)..."
                  value={noteMap[reg.masjidId] ?? ""}
                  onChange={(e) =>
                    setNoteMap((prev) => ({
                      ...prev,
                      [reg.masjidId]: e.target.value,
                    }))
                  }
                  disabled={
                    isPending ||
                    isConfirming ||
                    (pendingMasjidId === reg.masjidId && isSuccess)
                  }
                  className="text-sm border-slate-300 h-9 bg-white"
                />
                <div className="flex gap-2">
                  <Button
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-9"
                    onClick={() => handleAttest(reg.masjidId, true)}
                    disabled={isPending || isConfirming}
                  >
                    {isPending && pendingMasjidId === reg.masjidId ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" /> Setujui
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 h-9"
                    onClick={() => handleAttest(reg.masjidId, false)}
                    disabled={isPending || isConfirming}
                  >
                    {isPending && pendingMasjidId === reg.masjidId ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 mr-2" /> Tolak
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-slate-400 text-sm">
          {INDEXER_API
            ? "Tidak ada masjid yang menunggu attestasi."
            : "Indexer belum terhubung. Gunakan form manual di bawah."}
        </div>
      )}

      {/* Manual fallback (always visible if no indexer OR as extra option) */}
      <div className="border-t border-slate-100 pt-5">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Attest via Masjid ID
        </p>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-slate-700 text-sm">Masjid ID</Label>
            <Input
              placeholder="0x... (bytes32)"
              value={manualMasjidId}
              onChange={(e) => setManualMasjidId(e.target.value)}
              disabled={isPending || isConfirming}
              className="font-mono text-sm border-slate-300 focus-visible:ring-emerald-500"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-700 text-sm">Catatan (Opsional)</Label>
            <Input
              placeholder="Catatan attestasi..."
              value={noteMap[manualMasjidId] ?? ""}
              onChange={(e) =>
                setNoteMap((prev) => ({
                  ...prev,
                  [manualMasjidId]: e.target.value,
                }))
              }
              disabled={isPending || isConfirming}
              className="border-slate-300 focus-visible:ring-emerald-500"
            />
          </div>
          <div className="flex gap-2">
            <Button
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={
                !manualMasjidId.startsWith("0x") || isPending || isConfirming
              }
              onClick={() => handleManualAttest(true)}
            >
              {isPending || isConfirming ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Setujui
                </>
              )}
            </Button>
            <Button
              variant="outline"
              className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
              disabled={
                !manualMasjidId.startsWith("0x") || isPending || isConfirming
              }
              onClick={() => handleManualAttest(false)}
            >
              <XCircle className="w-4 h-4 mr-2" /> Tolak
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: Cash-out approval panel (for masjid board members)
// ---------------------------------------------------------------------------

function CashOutApprovalPanel({
  connectedAddress,
}: {
  connectedAddress: Address | undefined;
}) {
  const [cashOuts, setCashOuts] = useState<PendingCashOut[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  // Manual fallback
  const [manualInstance, setManualInstance] = useState("");
  const [manualRequestId, setManualRequestId] = useState("");

  const {
    writeContract,
    data: txHash,
    isPending,
    reset: resetWrite,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } =
    useWaitForTransactionReceipt({ hash: txHash });

  // Fetch pending cash-outs for this wallet from indexer
  useEffect(() => {
    if (!INDEXER_API || !connectedAddress) return;
    setLoadingList(true);
    fetch(
      `${INDEXER_API}/cashouts/pending?verifier=${connectedAddress}`
    )
      .then((r) => r.json())
      .then((data: PendingCashOut[]) => setCashOuts(data))
      .catch(() => setCashOuts([]))
      .finally(() => setLoadingList(false));
  }, [connectedAddress, isSuccess]);

  const handleApprove = (instanceAddress: Address, requestId: number) => {
    writeContract({
      address: instanceAddress,
      abi: MASJID_INSTANCE_ABI,
      functionName: "approveCashOut",
      args: [BigInt(requestId)],
    });
  };

  const handleManualApprove = () => {
    if (!isAddress(manualInstance) || !manualRequestId) return;
    handleApprove(manualInstance as Address, Number(manualRequestId));
  };

  if (!connectedAddress) {
    return (
      <p className="text-sm text-slate-500 text-center py-8">
        Hubungkan wallet untuk melihat antrean.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {isSuccess && (
        <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-800">
              Persetujuan berhasil dikirim!
            </p>
            {txHash && (
              <p className="font-mono text-[10px] text-emerald-600 mt-1 break-all">
                Tx: {txHash}
              </p>
            )}
            <button
              onClick={() => resetWrite()}
              className="text-xs underline text-emerald-700 mt-1"
            >
              Approve lagi
            </button>
          </div>
        </div>
      )}

      {/* List from indexer */}
      {loadingList ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
        </div>
      ) : cashOuts.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow className="border-slate-200">
              <TableHead className="text-slate-600">ID</TableHead>
              <TableHead className="text-slate-600">Masjid</TableHead>
              <TableHead className="text-slate-600">Tujuan</TableHead>
              <TableHead className="text-slate-600">Jumlah</TableHead>
              <TableHead className="text-slate-600">Progress</TableHead>
              <TableHead className="text-right text-slate-600">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cashOuts.map((co) => {
              const pct = Math.round((co.approvals / co.threshold) * 100);
              return (
                <TableRow key={`${co.instanceAddress}-${co.requestId}`} className="border-slate-100">
                  <TableCell className="font-mono text-xs">
                    #{co.requestId}
                  </TableCell>
                  <TableCell className="font-medium text-slate-800 max-w-[120px] truncate">
                    {co.masjidName}
                  </TableCell>
                  <TableCell className="font-mono text-xs truncate max-w-[100px]">
                    {shortenAddr(co.to)}
                  </TableCell>
                  <TableCell className="font-semibold text-slate-900">
                    {co.amount}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 min-w-[100px]">
                      <span className="text-xs text-slate-600 font-medium">
                        {co.approvals} / {co.threshold}
                      </span>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 shadow-none border-none"
                      onClick={() =>
                        handleApprove(co.instanceAddress, co.requestId)
                      }
                      disabled={isPending || isConfirming}
                    >
                      {isPending || isConfirming ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <ArrowRightCircle className="w-4 h-4 mr-1.5" />{" "}
                          Approve
                        </>
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : (
        <div className="text-center py-6 text-slate-400 text-sm">
          {INDEXER_API
            ? "Tidak ada pengajuan pencairan yang menunggu persetujuan Anda."
            : "Indexer belum terhubung. Gunakan form manual di bawah."}
        </div>
      )}

      {/* Manual fallback */}
      <div className="border-t border-slate-100 pt-5">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Approve via Instance & Request ID
        </p>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-slate-700 text-sm">
              Alamat Instance Masjid
            </Label>
            <Input
              placeholder="0x... (MasjidInstance address)"
              value={manualInstance}
              onChange={(e) => setManualInstance(e.target.value)}
              disabled={isPending || isConfirming}
              className="font-mono text-sm border-slate-300 focus-visible:ring-emerald-500"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-700 text-sm">Request ID</Label>
            <Input
              type="number"
              min={1}
              placeholder="Contoh: 1"
              value={manualRequestId}
              onChange={(e) => setManualRequestId(e.target.value)}
              disabled={isPending || isConfirming}
              className="border-slate-300 focus-visible:ring-emerald-500"
            />
          </div>
          <Button
            className="w-full bg-emerald-700 hover:bg-emerald-800 text-white"
            disabled={
              !isAddress(manualInstance) ||
              !manualRequestId ||
              isPending ||
              isConfirming
            }
            onClick={handleManualApprove}
          >
            {isPending || isConfirming ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isPending ? "Konfirmasi di wallet..." : "Menunggu konfirmasi..."}
              </>
            ) : (
              <>
                <ArrowRightCircle className="w-4 h-4 mr-2" /> Approve Cash Out
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function VerifierPortal() {
  const { address: connectedAddress, isConnected } = useAccount();

  // Check if wallet is a registered Kemenag verifier
  const { data: isKemenagVerifier, isLoading: checkingRole } = useReadContract({
    address: CONTRACT_ADDRESSES.verifierRegistry,
    abi: VERIFIER_REGISTRY_ABI,
    functionName: "isVerifier",
    args: connectedAddress ? [connectedAddress] : undefined,
    query: { enabled: !!connectedAddress },
  });

  // Fetch the verifier's label (e.g. "Kemenag Provinsi DKI Jakarta")
  const { data: verifierLabel } = useReadContract({
    address: CONTRACT_ADDRESSES.verifierRegistry,
    abi: VERIFIER_REGISTRY_ABI,
    functionName: "verifierLabel",
    args: connectedAddress ? [connectedAddress] : undefined,
    query: { enabled: !!connectedAddress && !!isKemenagVerifier },
  });

  return (
    <Layout>
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-slate-900">Portal Verifikator</h2>
        <p className="text-slate-500 mt-2">
          Evaluasi pendaftaran masjid (Kemenag) dan setujui pengajuan pencairan
          dana (Anggota Dewan Masjid).
        </p>
      </div>

      {/* Role badge */}
      {isConnected && (
        <div className="mb-6">
          {checkingRole ? (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 text-slate-500 text-sm">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Memeriksa peran...
            </div>
          ) : isKemenagVerifier ? (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-sm font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Verifikator Kemenag
              {verifierLabel ? (
                <span className="text-emerald-600 font-normal">
                  · {verifierLabel as string}
                </span>
              ) : null}
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-sm">
              <ShieldAlert className="w-4 h-4 text-slate-400" />
              Bukan verifikator Kemenag — hanya dapat menyetujui pencairan dana
              (jika terdaftar sebagai anggota dewan masjid).
            </div>
          )}
        </div>
      )}

      <Tabs defaultValue="registration" className="w-full">
        <TabsList className="grid w-full md:w-[500px] grid-cols-2 mb-8 bg-slate-200/50 p-1">
          <TabsTrigger
            value="registration"
            className="data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm"
          >
            Verifikasi Masjid
          </TabsTrigger>
          <TabsTrigger
            value="cashout"
            className="data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm"
          >
            Persetujuan Dana
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: Kemenag attestation */}
        <TabsContent value="registration">
          <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader className="border-b border-slate-100 pb-4">
              <CardTitle className="text-xl text-slate-900">
                Antrean Pendaftaran Masjid
              </CardTitle>
              <CardDescription className="text-slate-500">
                Hanya verifikator yang terdaftar di VerifierRegistry (Kemenag)
                yang dapat melakukan attestasi ini.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <AttestPanel
                connectedAddress={connectedAddress}
                isKemenagVerifier={!!isKemenagVerifier}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: Board member cash-out approval */}
        <TabsContent value="cashout">
          <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader className="border-b border-slate-100 pb-4">
              <CardTitle className="text-xl text-slate-900">
                Antrean Pengajuan Pencairan (Cash Out)
              </CardTitle>
              <CardDescription className="text-slate-500">
                Untuk anggota dewan masjid yang terdaftar sebagai cash-out
                verifier. Peran ini berbeda dari verifikator Kemenag.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <CashOutApprovalPanel connectedAddress={connectedAddress} />
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </Layout>
  );
}