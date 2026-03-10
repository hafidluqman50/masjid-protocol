"use client";

import { Loader2, ShieldAlert, ShieldCheck, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MasjidRow = {
  masjid_id: string;
  masjid_name: string;
  masjid_admin: string;
  status: string;
  yes_count: number;
  no_count: number;
  registered_at: string;
};

type VerifierRow = {
  address: string;
  label: string;
  is_active: boolean;
  added_at: string;
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
      return <Badge className="bg-emerald-100 text-emerald-800 border-none">Terverifikasi</Badge>;
    case "pending":
      return <Badge className="bg-amber-100 text-amber-800 border-none">Menunggu</Badge>;
    case "flagged":
      return <Badge className="bg-red-100 text-red-800 border-none">Bermasalah</Badge>;
    default:
      return <Badge className="bg-slate-100 text-slate-600 border-none">{status}</Badge>;
  }
}

// ---------------------------------------------------------------------------
// Verifier label update row
// ---------------------------------------------------------------------------

function VerifierLabelCell({
  verifier,
  onUpdated,
}: {
  verifier: VerifierRow;
  onUpdated: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(verifier.label);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch(
        `/admin/verifiers/${verifier.address}/label`,
        {
          method: "PATCH",
          body: JSON.stringify({ label }),
        }
      );
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error ?? "Gagal menyimpan");
      }
      setEditing(false);
      onUpdated();
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-700">{verifier.label || "—"}</span>
        <button
          onClick={() => setEditing(true)}
          className="text-xs text-emerald-600 hover:underline"
        >
          Ubah
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-2">
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="h-8 text-sm border-slate-300 focus-visible:ring-emerald-500"
          autoFocus
        />
        <Button
          size="sm"
          className="bg-emerald-700 hover:bg-emerald-800 text-white h-8"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : "Simpan"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 text-slate-500"
          onClick={() => {
            setEditing(false);
            setLabel(verifier.label);
          }}
          disabled={saving}
        >
          Batal
        </Button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function AdminDashboardInner() {
  const [masjids, setMasjids] = useState<MasjidRow[]>([]);
  const [verifiers, setVerifiers] = useState<VerifierRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiFetch("/admin/masjids").then((r) => r.json()),
      apiFetch("/admin/verifiers").then((r) => r.json()),
    ])
      .then(([masjidRes, verifierRes]) => {
        setMasjids(
          (masjidRes as { data?: MasjidRow[] }).data ?? []
        );
        setVerifiers(
          (verifierRes as { data?: VerifierRow[] }).data ?? []
        );
      })
      .catch((err: unknown) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, [refreshNonce]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-emerald-600 animate-spin mr-2" />
        <span className="text-slate-500">Memuat data…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl max-w-lg">
        <ShieldAlert className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-red-800">Gagal memuat data</p>
          <p className="text-xs text-red-700 mt-0.5">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Total Masjid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-800">
              {masjids.length}
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Menunggu Verifikasi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">
              {masjids.filter((m) => m.status === "pending").length}
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Verifikator Aktif
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-700">
              {verifiers.filter((v) => v.is_active).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Verifiers */}
      <Card className="border-slate-200 shadow-sm bg-white">
        <CardHeader className="border-b border-slate-100 pb-4">
          <CardTitle className="text-xl text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            Daftar Verifikator
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {verifiers.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">
              Belum ada verifikator terdaftar.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-200">
                  <TableHead className="text-slate-600">Alamat</TableHead>
                  <TableHead className="text-slate-600">Label</TableHead>
                  <TableHead className="text-slate-600">Status</TableHead>
                  <TableHead className="text-slate-600">Terdaftar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {verifiers.map((v) => (
                  <TableRow key={v.address} className="border-slate-100">
                    <TableCell className="font-mono text-xs">
                      {shortenAddr(v.address)}
                    </TableCell>
                    <TableCell>
                      <VerifierLabelCell
                        verifier={v}
                        onUpdated={() => setRefreshNonce((n) => n + 1)}
                      />
                    </TableCell>
                    <TableCell>
                      {v.is_active ? (
                        <Badge className="bg-emerald-100 text-emerald-800 border-none">
                          Aktif
                        </Badge>
                      ) : (
                        <Badge className="bg-slate-100 text-slate-500 border-none">
                          Nonaktif
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {new Date(v.added_at).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <UserPlus className="w-4 h-4" />
              <span>
                Penambahan verifikator dilakukan via smart contract oleh pemilik
                protokol.
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Masjids */}
      <Card className="border-slate-200 shadow-sm bg-white">
        <CardHeader className="border-b border-slate-100 pb-4">
          <CardTitle className="text-xl text-slate-900">
            Daftar Masjid
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {masjids.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">
              Belum ada masjid terdaftar.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-200">
                  <TableHead className="text-slate-600">Nama</TableHead>
                  <TableHead className="text-slate-600">Admin</TableHead>
                  <TableHead className="text-slate-600">Status</TableHead>
                  <TableHead className="text-slate-600">
                    Ya / Tidak
                  </TableHead>
                  <TableHead className="text-slate-600">Terdaftar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {masjids.map((m) => (
                  <TableRow key={m.masjid_id} className="border-slate-100">
                    <TableCell className="font-medium text-slate-900">
                      {m.masjid_name}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {shortenAddr(m.masjid_admin)}
                    </TableCell>
                    <TableCell>{statusBadge(m.status)}</TableCell>
                    <TableCell className="text-sm text-slate-600">
                      <span className="text-emerald-700 font-semibold">
                        {m.yes_count}
                      </span>{" "}
                      /{" "}
                      <span className="text-red-600 font-semibold">
                        {m.no_count}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {new Date(m.registered_at).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminUI() {
  return (
    <AuthGuard role="admin">
      <Layout>
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-slate-900">Dashboard Admin</h2>
          <p className="text-slate-500 mt-2">
            Kelola verifikator dan pantau seluruh masjid dalam protokol.
          </p>
        </div>
        <AdminDashboardInner />
      </Layout>
    </AuthGuard>
  );
}
