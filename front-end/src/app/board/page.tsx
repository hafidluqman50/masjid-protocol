"use client";

import { Building2, ChevronRight, Loader2, PlusCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import Layout from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBoardMasjid } from "./hooks";

function statusBadge(status: string) {
  switch (status) {
    case "verified":
      return <Badge className="bg-emerald-100 text-emerald-800 border-none">Terverifikasi</Badge>;
    case "pending":
      return <Badge className="bg-amber-100 text-amber-800 border-none">Menunggu</Badge>;
    case "flagged":
      return <Badge className="bg-orange-100 text-orange-800 border-none">Ditandai</Badge>;
    case "revoked":
      return <Badge className="bg-red-100 text-red-800 border-none">Dicabut</Badge>;
    default:
      return <Badge className="bg-slate-100 text-slate-600 border-none">{status}</Badge>;
  }
}

function BoardMasjidList() {
  const { data: masjids, isLoading, error } = useBoardMasjid();
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-emerald-600 animate-spin mr-2" />
        <span className="text-slate-500">Memuat data…</span>
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
        {(error as Error).message}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {masjids && masjids.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {masjids.map((m) => (
            <Card
              key={m.masjid_id}
              className="border-slate-200 shadow-sm hover:shadow-md transition-shadow bg-white cursor-pointer"
              onClick={() => router.push(`/board/dashboard?masjid_id=${m.masjid_id}`)}
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-base font-semibold text-slate-900">
                    {m.masjid_name}
                  </CardTitle>
                  {statusBadge(m.status)}
                </div>
                <p className="font-mono text-[10px] text-slate-400 truncate mt-1">
                  {m.instance_addr}
                </p>
              </CardHeader>
              <CardContent>
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    className="bg-emerald-700 hover:bg-emerald-800 text-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/board/dashboard?masjid_id=${m.masjid_id}`);
                    }}
                  >
                    Kelola <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 space-y-4">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto" />
          <p className="text-slate-500 text-sm">
            Wallet Anda belum terhubung dengan masjid manapun.
          </p>
          <Button
            className="bg-emerald-700 hover:bg-emerald-800 text-white"
            onClick={() => router.push("/board/register")}
          >
            <PlusCircle className="w-4 h-4 mr-2" /> Daftarkan Masjid
          </Button>
        </div>
      )}

      {masjids && masjids.length > 0 && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
            onClick={() => router.push("/board/register")}
          >
            <PlusCircle className="w-4 h-4 mr-2" /> Daftarkan Masjid Baru
          </Button>
        </div>
      )}
    </div>
  );
}

export default function BoardPage() {
  return (
    <AuthGuard role="board">
      <Layout>
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-900">Daftar Masjid</h2>
            <p className="text-slate-500 mt-2">Masjid yang terhubung dengan wallet Anda.</p>
          </div>
          <BoardMasjidList />
        </div>
      </Layout>
    </AuthGuard>
  );
}
