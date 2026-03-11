"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2, PlusCircle, Trash2 } from "lucide-react";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { type Address, isAddress } from "viem";
import { useAccount } from "wagmi";
import { z } from "zod";
import AuthGuard from "@/components/AuthGuard";
import Layout from "@/components/Layout";
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
import { CONTRACT_ADDRESSES } from "@/lib/contracts";
import { uploadFileToPinata, uploadJSONToPinata } from "@/lib/pinata";
import { useRegisterMasjid } from "../hooks";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const registerSchema = z
  .object({
    name: z.string().min(3, "Nama masjid minimal 3 karakter."),
    alamat: z.string().min(5, "Alamat masjid wajib diisi."),
    foto: z.instanceof(File).optional(),
    boardMembers: z
      .array(
        z.object({
          address: z
            .string()
            .refine((v) => isAddress(v), { message: "Alamat wallet tidak valid." }),
        })
      )
      .min(1, "Minimal satu anggota dewan diperlukan.")
      .refine(
        (members) => {
          const addrs = members.map((m) => m.address.toLowerCase());
          return new Set(addrs).size === addrs.length;
        },
        { message: "Alamat anggota dewan tidak boleh duplikat." }
      ),
    threshold: z.coerce
      .number({ error: "Threshold harus berupa angka." })
      .int()
      .min(1, "Threshold minimal 1."),
  })
  .refine((data) => data.threshold <= data.boardMembers.length, {
    message: "Threshold tidak boleh melebihi jumlah anggota dewan.",
    path: ["threshold"],
  });

type RegisterFormValues = z.input<typeof registerSchema>;

// ---------------------------------------------------------------------------
// UI
// ---------------------------------------------------------------------------

export default function RegisterMasjidUI() {
  const { isConnected } = useAccount();
  const registerMasjid = useRegisterMasjid();

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      boardMembers: [{ address: "" }, { address: "" }, { address: "" }],
      threshold: 2,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "boardMembers",
  });

  const [foto, setFoto] = useState<File | null>(null);

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const onSubmit = async (values: RegisterFormValues) => {
    setUploadError(null);
    setUploading(true);
    let metadataUri: string;
    try {
      const meta: Record<string, string> = {
        name: values.name,
        alamat: values.alamat,
      };
      if (foto) {
        const fotoUri = await uploadFileToPinata(foto);
        meta.foto = fotoUri;
      }
      metadataUri = await uploadJSONToPinata(meta);
    } catch (e) {
      setUploadError((e as Error).message);
      setUploading(false);
      return;
    }
    setUploading(false);

    registerMasjid.mutate({
      name: values.name,
      metadataUri,
      stablecoin: CONTRACT_ADDRESSES.idrx,
      boardMembers: values.boardMembers.map((m) => m.address as Address),
      threshold: BigInt(values.threshold as number),
    });
  };

  const isBusy = uploading || registerMasjid.isPending || registerMasjid.isConfirming;
  const memberCount = watch("boardMembers").length;

  return (
    <AuthGuard role={["board", "guest"]}>
      <Layout>
        <div className="max-w-2xl mx-auto">
          {registerMasjid.isConfirmed && (
            <div className="mb-6 flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-emerald-800">
                  Pendaftaran berhasil!
                </p>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Instance masjid telah di-deploy. Menunggu attestasi dari
                  verifikator Kemenag.
                </p>
                {registerMasjid.data && (
                  <p className="font-mono text-[10px] text-emerald-600 mt-1 break-all">
                    Tx: {registerMasjid.data}
                  </p>
                )}
              </div>
            </div>
          )}

          <Card className="border-slate-200 shadow-sm bg-white">
            <CardHeader>
              <CardTitle className="text-2xl text-slate-900">
                Daftarkan Masjid Baru
              </CardTitle>
              <CardDescription className="text-slate-500">
                Setelah didaftarkan, masjid perlu diverifikasi oleh verifikator
                resmi Kemenag sebelum bisa menerima donasi.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Nama Masjid */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-slate-700">
                    Nama Masjid <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    placeholder="Contoh: Masjid Al-Hikmah"
                    disabled={isBusy}
                    className="border-slate-300 focus-visible:ring-emerald-500"
                    {...register("name")}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-600">{errors.name.message}</p>
                  )}
                </div>

                {/* Alamat Masjid */}
                <div className="space-y-2">
                  <Label htmlFor="alamat" className="text-slate-700">
                    Alamat Masjid <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="alamat"
                    placeholder="Contoh: Jl. Merdeka No. 1, Jakarta"
                    disabled={isBusy}
                    className="border-slate-300 focus-visible:ring-emerald-500"
                    {...register("alamat")}
                  />
                  {errors.alamat && (
                    <p className="text-sm text-red-600">{errors.alamat.message}</p>
                  )}
                </div>

                {/* Foto Masjid */}
                <div className="space-y-2">
                  <Label htmlFor="foto" className="text-slate-700">
                    Foto Masjid
                  </Label>
                  <Input
                    id="foto"
                    type="file"
                    accept="image/*"
                    disabled={isBusy}
                    onChange={(e) => setFoto(e.target.files?.[0] ?? null)}
                    className="border-slate-300 focus-visible:ring-emerald-500 cursor-pointer file:mr-3 file:text-sm file:font-medium file:text-slate-600"
                  />
                  <p className="text-xs text-slate-400">
                    Opsional. Foto tampak depan masjid Anda.
                  </p>
                </div>

                {/* Anggota Dewan */}
                <div className="border-t border-slate-100 pt-4">
                  <div className="mb-3">
                    <h3 className="text-sm font-semibold text-slate-800">
                      Anggota Dewan Masjid
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Wallet anggota dewan yang akan mendapat{" "}
                      <span className="font-mono text-slate-700">BOARD_ROLE</span>{" "}
                      — berwenang menyetujui pencairan dana.
                    </p>
                  </div>

                  <div className="space-y-2">
                    {fields.map((field, index) => (
                      <div key={field.id} className="space-y-1">
                        <div className="flex gap-2 items-center">
                          <Input
                            placeholder={`Wallet anggota #${index + 1} (0x...)`}
                            disabled={isBusy}
                            className="font-mono text-sm border-slate-300 focus-visible:ring-emerald-500"
                            {...register(`boardMembers.${index}.address`)}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={fields.length <= 1 || isBusy}
                            onClick={() => remove(index)}
                            className="text-slate-400 hover:text-red-500 hover:bg-red-50 shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        {errors.boardMembers?.[index]?.address && (
                          <p className="text-sm text-red-600">
                            {errors.boardMembers[index].address.message}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  {errors.boardMembers?.root && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.boardMembers.root.message}
                    </p>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ address: "" })}
                    disabled={isBusy}
                    className="mt-2 border-slate-300 text-slate-600 hover:bg-slate-50"
                  >
                    <PlusCircle className="w-3.5 h-3.5 mr-1.5" /> Tambah Anggota
                  </Button>
                </div>

                {/* Threshold */}
                <div className="space-y-2">
                  <Label htmlFor="threshold" className="text-slate-700">
                    Threshold Pencairan <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="threshold"
                    type="number"
                    min={1}
                    max={memberCount || 1}
                    placeholder="Contoh: 2"
                    disabled={isBusy}
                    className="border-slate-300 focus-visible:ring-emerald-500"
                    {...register("threshold")}
                  />
                  {errors.threshold ? (
                    <p className="text-sm text-red-600">{errors.threshold.message}</p>
                  ) : (
                    <p className="text-xs text-slate-400">
                      Berapa anggota dewan yang harus menyetujui sebelum dana bisa
                      dicairkan.
                    </p>
                  )}
                </div>

                {/* Upload error */}
                {uploadError && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {uploadError}
                  </p>
                )}

                {/* Contract error */}
                {registerMasjid.isError && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {(registerMasjid.error as Error).message}
                  </p>
                )}

                {!isConnected ? (
                  <p className="text-center text-sm text-slate-500 py-2">
                    Hubungkan wallet terlebih dahulu untuk mendaftar.
                  </p>
                ) : (
                  <Button
                    type="submit"
                    disabled={isBusy || registerMasjid.isConfirmed}
                    className="w-full bg-emerald-700 hover:bg-emerald-800 text-white rounded-md mt-2"
                  >
                    {isBusy ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {uploading
                          ? "Upload ke IPFS..."
                          : registerMasjid.isPending
                          ? "Konfirmasi di wallet..."
                          : "Menunggu konfirmasi..."}
                      </>
                    ) : registerMasjid.isConfirmed ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" /> Berhasil
                        Didaftarkan
                      </>
                    ) : (
                      "Deploy Instance Masjid"
                    )}
                  </Button>
                )}
              </form>
            </CardContent>
          </Card>

          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
            <p className="font-semibold mb-1">Proses setelah pendaftaran</p>
            <ol className="list-decimal list-inside space-y-1 text-xs text-amber-700">
              <li>Smart contract instance masjid akan di-deploy otomatis.</li>
              <li>
                Status masjid: <span className="font-medium">Pending</span> —
                belum bisa menerima donasi.
              </li>
              <li>
                Verifikator Kemenag akan meninjau dan melakukan attestasi
                on-chain.
              </li>
              <li>
                Setelah quorum tercapai, status berubah ke{" "}
                <span className="font-medium">Verified</span> dan masjid siap
                menerima donasi.
              </li>
            </ol>
          </div>
        </div>
      </Layout>
    </AuthGuard>
  );
}
