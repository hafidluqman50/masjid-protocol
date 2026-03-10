"use client";

import {
  CheckCircle2,
  FileText,
  Loader2,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiFetch } from "@/lib/auth";
import {
  CONTRACT_ADDRESSES,
  MASJID_PROTOCOL_ABI,
  RegistrationStatus,
} from "@/lib/contracts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type QueueItem = {
  masjid_id: string;
  masjid_name: string;
  proposer: string;
  yes_count: number;
  no_count: number;
  status: string;
  registered_at: string;
};

type HistoryItem = {
  masjid_id: string;
  masjid_name: string;
  support: boolean;
  note_hash: string;
  yes_count: number;
  no_count: number;
  attested_at: string;
  tx_hash: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function shortenAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function statusBadge(status: string) {
  switch (status) {
    case "verified":
      return (
        <Badge className="bg-emerald-100 text-emerald-800 border-none">
          Terverifikasi
        </Badge>
      );
    case "pending":
      return (
        <Badge className="bg-amber-100 text-amber-800 border-none">
          Menunggu
        </Badge>
      );
    case "flagged":
      return (
        <Badge className="bg-red-100 text-red-800 border-none">
          Bermasalah
        </Badge>
      );
    default:
      return (
        <Badge className="bg-slate-100 text-slate-600 border-none">
          {status}
        </Badge>
      );
  }
}

// ---------------------------------------------------------------------------
// Attestation queue panel
// ---------------------------------------------------------------------------

function AttestPanel() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
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

  const pendingMasjidId = writeVars?.args?.[0] as `0x${string}` | undefined;

  const loadQueue = () => {
    setLoading(true);
    apiFetch("/verifier/queue")
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as { data?: QueueItem[] };
        setQueue(data.data ?? []);
      })
      .catch(() => setQueue([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadQueue();
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

  return (
    <div className="space-y-6">
      {isSuccess && (
        <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-emerald-800">
              Attestasi berhasil dikirim!
            </p>
            <p className="text-xs text-emerald-700 mt-0.5">
              Vote Anda telah tercatat on-chain.
            </p>
            <button
              onClick={() => {
                resetWrite();
                loadQueue();
              }}
              className="text-xs underline text-emerald-700 mt-1"
            >
              Attest masjid lain
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
        </div>
      ) : queue.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">
          Tidak ada masjid yang menunggu attestasi.
        </p>
      ) : (
        <div className="space-y-4">
          {queue.map((item) => (
            <div
              key={item.masjid_id}
              className="flex flex-col md:flex-row md:items-center justify-between p-5 border border-slate-200 rounded-xl bg-slate-50/50 hover:border-emerald-200 transition-colors gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-slate-900 text-lg">
                    {item.masjid_name}
                  </h3>
                  {statusBadge(item.status)}
                </div>
                <div className="flex items-center text-xs text-slate-500 gap-4 font-mono flex-wrap">
                  <span className="flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    {shortenAddr(item.masjid_id)}
                  </span>
                  <span>
                    ✅ {item.yes_count} · ❌ {item.no_count}
                  </span>
                  <span>
                    {new Date(item.registered_at).toLocaleDateString("id-ID")}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2 min-w-[280px]">
                <Input
                  placeholder="Catatan (Opsional)..."
                  value={noteMap[item.masjid_id] ?? ""}
                  onChange={(e) =>
                    setNoteMap((prev) => ({
                      ...prev,
                      [item.masjid_id]: e.target.value,
                    }))
                  }
                  disabled={isPending || isConfirming}
                  className="text-sm border-slate-300 h-9 bg-white"
                />
                <div className="flex gap-2">
                  <Button
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-9"
                    onClick={() =>
                      handleAttest(item.masjid_id as `0x${string}`, true)
                    }
                    disabled={isPending || isConfirming}
                  >
                    {isPending && pendingMasjidId === item.masjid_id ? (
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
                    onClick={() =>
                      handleAttest(item.masjid_id as `0x${string}`, false)
                    }
                    disabled={isPending || isConfirming}
                  >
                    {isPending && pendingMasjidId === item.masjid_id ? (
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
      )}

      {/* Manual attest by ID */}
      <ManualAttestForm />
    </div>
  );
}

function ManualAttestForm() {
  const [masjidId, setMasjidId] = useState("");
  const [note, setNote] = useState("");

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const handleAttest = (support: boolean) => {
    if (!masjidId.startsWith("0x")) return;
    writeContract({
      address: CONTRACT_ADDRESSES.masjidProtocol,
      abi: MASJID_PROTOCOL_ABI,
      functionName: "attest",
      args: [masjidId as `0x${string}`, support, note],
    });
  };

  return (
    <div className="border-t border-slate-100 pt-5 space-y-3">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
        Attest via Masjid ID
      </p>
      {isSuccess && (
        <p className="text-sm text-emerald-700 font-medium">
          ✅ Berhasil dikirim
        </p>
      )}
      <div className="space-y-1.5">
        <Label className="text-slate-700 text-sm">Masjid ID</Label>
        <Input
          placeholder="0x... (bytes32)"
          value={masjidId}
          onChange={(e) => setMasjidId(e.target.value)}
          disabled={isPending || isConfirming}
          className="font-mono text-sm border-slate-300 focus-visible:ring-emerald-500"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-slate-700 text-sm">Catatan (Opsional)</Label>
        <Input
          placeholder="Catatan attestasi..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          disabled={isPending || isConfirming}
          className="border-slate-300 focus-visible:ring-emerald-500"
        />
      </div>
      <div className="flex gap-2">
        <Button
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
          disabled={!masjidId.startsWith("0x") || isPending || isConfirming}
          onClick={() => handleAttest(true)}
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
          disabled={!masjidId.startsWith("0x") || isPending || isConfirming}
          onClick={() => handleAttest(false)}
        >
          <XCircle className="w-4 h-4 mr-2" /> Tolak
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// History panel
// ---------------------------------------------------------------------------

function HistoryPanel() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/verifier/history")
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as { data?: HistoryItem[] };
        setHistory(data.data ?? []);
      })
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <p className="text-sm text-slate-400 text-center py-6">
        Belum ada riwayat attestasi.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-slate-200">
          <TableHead className="text-slate-600">Masjid</TableHead>
          <TableHead className="text-slate-600">Keputusan</TableHead>
          <TableHead className="text-slate-600">Ya / Tidak</TableHead>
          <TableHead className="text-slate-600">Tanggal</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {history.map((item) => (
          <TableRow key={item.tx_hash} className="border-slate-100">
            <TableCell>
              <div className="font-medium text-slate-800">{item.masjid_name}</div>
              <div className="font-mono text-[10px] text-slate-400">
                {shortenAddr(item.masjid_id)}
              </div>
            </TableCell>
            <TableCell>
              {item.support ? (
                <Badge className="bg-emerald-100 text-emerald-800 border-none">
                  Disetujui
                </Badge>
              ) : (
                <Badge className="bg-red-100 text-red-700 border-none">
                  Ditolak
                </Badge>
              )}
            </TableCell>
            <TableCell className="text-sm text-slate-600">
              <span className="text-emerald-700 font-semibold">
                {item.yes_count}
              </span>{" "}
              /{" "}
              <span className="text-red-600 font-semibold">
                {item.no_count}
              </span>
            </TableCell>
            <TableCell className="text-xs text-slate-500">
              {new Date(item.attested_at).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function VerifierDashboardInner() {
  return (
    <div className="space-y-6">
      <Card className="border-slate-200 shadow-sm bg-white">
        <CardHeader className="border-b border-slate-100 pb-4 flex flex-row items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
          <CardTitle className="text-xl text-slate-900">
            Portal Verifikator
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <Tabs defaultValue="queue">
            <TabsList className="mb-6 bg-slate-100 p-1 rounded-lg">
              <TabsTrigger
                value="queue"
                className="data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm"
              >
                Antrean Attestasi
              </TabsTrigger>
              <TabsTrigger
                value="history"
                className="data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm"
              >
                Riwayat
              </TabsTrigger>
            </TabsList>
            <TabsContent value="queue">
              <AttestPanel />
            </TabsContent>
            <TabsContent value="history">
              <HistoryPanel />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifierUI() {
  return (
    <AuthGuard role="verifier">
      <Layout>
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-slate-900">
            Dashboard Verifikator
          </h2>
          <p className="text-slate-500 mt-2">
            Tinjau dan berikan attestasi untuk pendaftaran masjid baru.
          </p>
        </div>
        <VerifierDashboardInner />
      </Layout>
    </AuthGuard>
  );
}
