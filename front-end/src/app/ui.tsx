"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import Link from "next/link";
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
import { API_BASE, formatAmount } from "@/lib/utils";

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

async function fetchMasjids(): Promise<MasjidSummary[]> {
  const res = await fetch(`${API_BASE}/public/masjids`);
  if (!res.ok) throw new Error("Gagal memuat data");
  const body = (await res.json()) as { data?: MasjidSummary[] };
  return body.data ?? [];
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

export default function ExplorerPageUI() {
  const { data: masjids = [], isLoading, isError } = useQuery({
    queryKey: ["masjids"],
    queryFn: fetchMasjids,
  });

  return (
    <Layout>
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-bold text-slate-900">Daftar Masjid</h2>
        <p className="text-slate-500 mt-2">
          Daftar masjid yang terdaftar dalam protokol. Berinfaq dengan aman dan transparan.
        </p>
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
        </div>
      )}

      {isError && (
        <p className="text-center text-red-600 py-8">Gagal memuat data.</p>
      )}

      {!isLoading && !isError && masjids.length === 0 && (
        <p className="text-center text-slate-400 py-16">Belum ada masjid terdaftar.</p>
      )}

      {!isLoading && !isError && masjids.length > 0 && (
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
                      {formatAmount(masjid.latest_balance)}
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
                    <Button variant="outline" disabled className="border-slate-200 text-slate-400">
                      Belum Aktif
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </Layout>
  );
}
