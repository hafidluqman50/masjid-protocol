"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
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

type MasjidSummary = {
  masjid_id: string;
  masjid_name: string;
  status: string;
  latest_balance: string | null;
  total_donated: string | null;
  total_donors: number;
  instance_addr: string | null;
  registered_at: string;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";

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

function formatBalance(raw: string | null) {
  if (!raw) return "—";
  const n = parseFloat(raw);
  if (isNaN(n)) return "—";
  return (n / 100).toLocaleString("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + " IDRX";
}

export default function ExplorerPage() {
  const [masjids, setMasjids] = useState<MasjidSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/public/masjids`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Gagal memuat data");
        const body = (await res.json()) as { data?: MasjidSummary[] };
        setMasjids(body.data ?? []);
      })
      .catch((err: unknown) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold text-slate-900">Daftar Masjid</h2>
          <p className="text-slate-500 mt-2">
            Daftar masjid yang terdaftar dalam protokol. Berinfaq dengan aman dan
            transparan.
          </p>
        </div>

        {loading && (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
          </div>
        )}

        {error && (
          <p className="text-center text-red-600 py-8">{error}</p>
        )}

        {!loading && !error && masjids.length === 0 && (
          <p className="text-center text-slate-400 py-16">
            Belum ada masjid terdaftar.
          </p>
        )}

        {!loading && !error && masjids.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {masjids.map((masjid) => (
              <Card
                key={masjid.masjid_id}
                className="border-slate-200 shadow-sm hover:shadow-md transition-shadow bg-white"
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start gap-2">
                    <CardTitle className="text-lg font-semibold text-slate-900 leading-tight">
                      {masjid.masjid_name}
                    </CardTitle>
                    {statusBadge(masjid.status)}
                  </div>
                  <CardDescription className="font-mono text-xs text-slate-400 truncate">
                    {masjid.masjid_id.slice(0, 10)}…{masjid.masjid_id.slice(-8)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center mt-4">
                    <div className="flex flex-col">
                      <span className="text-xs text-slate-500">Saldo Kas</span>
                      <span className="font-semibold text-emerald-700">
                        {formatBalance(masjid.latest_balance)}
                      </span>
                    </div>
                    {masjid.status === "verified" ? (
                      <Link href={`/masjid/${encodeURIComponent(masjid.masjid_id)}`}>
                        <Button
                          variant="outline"
                          className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                        >
                          Lihat Detail
                        </Button>
                      </Link>
                    ) : (
                      <Button
                        variant="outline"
                        disabled
                        className="border-slate-200 text-slate-400"
                      >
                        Belum Aktif
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
