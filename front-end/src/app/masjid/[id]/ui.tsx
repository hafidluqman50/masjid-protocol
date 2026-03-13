"use client";

import { ArrowUpRight, CheckCircle2, Clock, Heart, Loader2, Users, XCircle } from "lucide-react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { type Address } from "viem";
import Layout from "@/components/Layout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { formatAmount, ipfsToHttp, shortenAddr } from "@/lib/utils";
import {
  useMasjidCashouts,
  useMasjidDetail,
  useMasjidDonations,
  useMasjidMembers,
  useMasjidMetadata,
} from "./hooks";
import { DonateForm } from "./components/DonateForm";
import { StatusBadge } from "./components/StatusBadge";

export default function DetailMasjidPageUI() {
  const params = useParams();
  const masjidId = decodeURIComponent(params.id as string);

  const { data: masjid, isLoading, isError } = useMasjidDetail(masjidId);
  const { data: donations = [] } = useMasjidDonations(masjidId);
  const { data: members = [] } = useMasjidMembers(masjidId);
  const { data: cashouts = [] } = useMasjidCashouts(masjidId);
  const { data: metadata } = useMasjidMetadata(masjid?.metadata_uri);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
        </div>
      </Layout>
    );
  }

  if (isError || !masjid) {
    return (
      <Layout>
        <div className="text-center py-20 text-slate-500">
          Masjid tidak ditemukan.
        </div>
      </Layout>
    );
  }

  const isVerified = masjid.status === "verified" && !!masjid.instance_addr;
  const fotoUrl = ipfsToHttp(metadata?.foto);

  const nameByAddr: Record<string, string> = {};
  if (metadata?.boardMembers) {
    for (const bm of metadata.boardMembers) {
      if (bm.name) nameByAddr[bm.address.toLowerCase()] = bm.name;
    }
  }

  return (
    <Layout>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
        <div className="lg:col-span-2 space-y-6">
          <div>
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <h2 className="text-3xl font-bold text-slate-900">
                {masjid.masjid_name}
              </h2>
              <StatusBadge status={masjid.status} />
            </div>
            {masjid.instance_addr && (
              <p className="font-mono text-xs text-slate-400">
                {shortenAddr(masjid.instance_addr)}
              </p>
            )}
          </div>

          {fotoUrl && (
            <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm">
              <Image
                src={fotoUrl}
                alt={masjid.masjid_name}
                width={800}
                height={400}
                className="w-full object-cover max-h-72"
                unoptimized
              />
            </div>
          )}

          <Card className="border-slate-200 shadow-sm bg-white">
            <CardContent className="pt-4 pb-4">
              <div className="flex flex-col sm:flex-row gap-6 text-sm">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">
                    Terdaftar
                  </p>
                  <p className="font-medium text-slate-800">
                    {new Date(masjid.registered_at).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
                {masjid.verified_at && (
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">
                      Terverifikasi
                    </p>
                    <p className="font-medium text-emerald-700">
                      {new Date(masjid.verified_at).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {members.length > 0 && (
            <Card className="border-slate-200 shadow-sm bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-600" /> Pengurus Masjid
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-0">
                  {members.map((m, idx) => {
                    const name = nameByAddr[m.member_addr.toLowerCase()];
                    const isAdmin =
                      m.member_addr.toLowerCase() ===
                      masjid.masjid_admin.toLowerCase();
                    return (
                      <div
                        key={m.id}
                        className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0"
                      >
                        <div>
                          <p className="text-sm font-medium text-slate-800">
                            {name ?? `Anggota #${idx + 1}`}
                            {isAdmin && (
                              <span className="ml-2 text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">
                                Admin
                              </span>
                            )}
                          </p>
                          <p className="font-mono text-xs text-slate-400 mt-0.5">
                            {shortenAddr(m.member_addr)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {donations.length > 0 && (
            <Card className="border-slate-200 shadow-sm bg-white">
              <CardHeader>
                <CardTitle className="text-base text-slate-800">
                  Riwayat Infaq Terbaru
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-0">
                  {donations.map((d) => (
                    <div
                      key={d.tx_hash}
                      className="flex justify-between items-center text-sm py-2.5 border-b border-slate-100 last:border-0"
                    >
                      <div className="space-y-0.5">
                        <p className="font-mono text-xs text-slate-600">
                          {shortenAddr(d.donor)}
                        </p>
                        <p className="text-xs text-slate-400">
                          {new Date(d.donated_at).toLocaleDateString("id-ID")}
                        </p>
                      </div>
                      <span className="font-semibold text-emerald-700">
                        {formatAmount(d.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-slate-200 shadow-sm bg-white">
              <CardHeader>
                <CardTitle className="text-base text-slate-800 flex items-center gap-2">
                  <ArrowUpRight className="w-4 h-4 text-amber-600" /> Riwayat Pengeluaran Dana
                </CardTitle>
              </CardHeader>
              <CardContent>
                {cashouts.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4">Belum ada pengeluaran dana.</p>
                ) : (
                <div className="space-y-0">
                  {cashouts.map((co) => {
                    const statusIcon = co.status_label === "executed"
                      ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      : co.status_label === "canceled"
                        ? <XCircle className="w-3.5 h-3.5 text-red-400" />
                        : <Clock className="w-3.5 h-3.5 text-amber-500" />;

                    const statusColor = co.status_label === "executed"
                      ? "text-emerald-700 bg-emerald-50"
                      : co.status_label === "canceled"
                        ? "text-red-600 bg-red-50"
                        : "text-amber-700 bg-amber-50";

                    const statusLabel = co.status_label === "executed"
                      ? "Dieksekusi"
                      : co.status_label === "canceled"
                        ? "Dibatalkan"
                        : co.status_label === "expired"
                          ? "Kadaluarsa"
                          : "Pending";

                    return (
                      <div
                        key={co.tx_hash}
                        className="py-3 border-b border-slate-100 last:border-0 space-y-1.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-slate-400">Ke:</span>
                              <span className="font-mono text-xs text-slate-700 font-medium">
                                {shortenAddr(co.to_addr)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-slate-400">Diusulkan oleh:</span>
                              <span className="font-mono text-xs text-slate-600">
                                {shortenAddr(co.proposer)}
                              </span>
                            </div>
                            {co.approved_by.length > 0 && (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs text-slate-400">Disetujui:</span>
                                {co.approved_by.map((addr) => (
                                  <span key={addr} className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                    {shortenAddr(addr)}
                                  </span>
                                ))}
                              </div>
                            )}
                            <p className="text-xs text-slate-400">
                              {new Date(co.proposed_at).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              })}
                              {co.settled_at && ` · Selesai ${new Date(co.settled_at).toLocaleDateString("id-ID")}`}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className="font-semibold text-slate-800 text-sm">
                              {formatAmount(co.amount)}
                            </span>
                            <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${statusColor}`}>
                              {statusIcon} {statusLabel}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                )}
              </CardContent>
            </Card>
        </div>

        <div>
          <Card className="border-slate-200 shadow-sm bg-white sticky top-24 overflow-hidden py-0">
            <CardHeader className="bg-emerald-50 border-b border-emerald-100 py-4">
              <CardTitle className="text-emerald-900 flex items-center gap-2">
                <Heart className="w-5 h-5 text-emerald-600" /> Form Infaq
              </CardTitle>
              <CardDescription className="text-emerald-700/70">
                Pilih jumlah IDRX untuk diinfaqkan.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 pb-6">
              {isVerified ? (
                <DonateForm
                  instanceAddr={masjid.instance_addr as Address}
                  stablecoin={masjid.stablecoin as Address}
                />
              ) : (
                <p className="text-sm text-slate-400 text-center py-4">
                  Masjid ini belum terverifikasi. Infaq belum tersedia.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
