import Layout from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ExplorerPage() {
  const masjids = [
    { id: "0x123...", name: "Masjid Al-Ikhlas", status: "Verified", balance: "1,500 USDC" },
    { id: "0x456...", name: "Masjid An-Nur", status: "Pending", balance: "0 USDC" },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Verified": return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-none">Terverifikasi</Badge>;
      case "Pending": return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200 border-none">Menunggu</Badge>;
      default: return <Badge className="bg-red-100 text-red-800 hover:bg-red-200 border-none">Bermasalah</Badge>;
    }
  };

  return (
    <Layout>
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Jelajahi Masjid</h2>
          <p className="text-slate-500 mt-2">Daftar masjid yang terdaftar dalam protokol. Donasi dengan aman dan transparan.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {masjids.map((masjid) => (
          <Card key={masjid.id} className="border-slate-200 shadow-sm hover:shadow-md transition-shadow bg-white">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg font-semibold text-slate-900">{masjid.name}</CardTitle>
                {getStatusBadge(masjid.status)}
              </div>
              <CardDescription className="font-mono text-xs text-slate-400 truncate">{masjid.id}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center mt-4">
                <div className="flex flex-col">
                  <span className="text-xs text-slate-500">Saldo Kas</span>
                  <span className="font-semibold text-emerald-700">{masjid.balance}</span>
                </div>
                <Button variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                  Lihat Detail
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </Layout>
  );
}