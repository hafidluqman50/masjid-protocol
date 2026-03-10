import { Heart, ShieldCheck } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function DetailMasjidPage() {
  return (
    <Layout>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Kolom Info Detail */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-3xl font-bold text-slate-900">Masjid Al-Ikhlas</h2>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                <ShieldCheck className="w-3 h-3 mr-1" /> Terverifikasi
              </span>
            </div>
            <p className="font-mono text-sm text-slate-500">Contract: 0x123abc...def456</p>
          </div>

          <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader>
              <CardTitle className="text-lg text-slate-800">Tentang Masjid</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 leading-relaxed text-sm">
                (Informasi diambil dari metadataURI). Masjid Al-Ikhlas berlokasi di Jakarta.
                Dana yang terkumpul akan digunakan untuk operasional harian dan santunan anak yatim.
                Seluruh pengeluaran diatur oleh Multi-sig smart contract yang transparan.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Kolom Aksi Donasi */}
        <div>
          <Card className="border-slate-200 shadow-sm bg-white sticky top-24">
            <CardHeader className="bg-emerald-50 border-b border-emerald-100 rounded-t-xl">
              <CardTitle className="text-emerald-900 flex items-center gap-2">
                <Heart className="w-5 h-5 text-emerald-600" /> Form Donasi
              </CardTitle>
              <CardDescription className="text-emerald-700/70">
                Pilih jumlah token untuk disumbangkan.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Jumlah (USDC)</label>
                <Input type="number" placeholder="0.00" className="text-lg border-slate-300 focus-visible:ring-emerald-500" />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Catatan Donasi (Opsional)</label>
                <Input placeholder="Al-Fatihah untuk keluarga..." className="border-slate-300 focus-visible:ring-emerald-500" />
                <p className="text-[10px] text-slate-400">Catatan akan di-hash menggunakan keccak256 di on-chain.</p>
              </div>

              <div className="pt-4 space-y-2">
                {/* Sesuai kontrak: Memerlukan Approve ERC20 terlebih dahulu, 
                  lalu memanggil masjidInstance.cashIn(amount, noteHash) 
                */}
                <Button variant="outline" className="w-full border-slate-300 text-slate-700 hover:bg-slate-50">
                  1. Approve USDC
                </Button>
                <Button className="w-full bg-emerald-700 hover:bg-emerald-800 text-white rounded-md shadow-none">
                  2. Selesaikan Donasi (Cash In)
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}