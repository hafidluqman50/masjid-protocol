"use client";

import { CheckCircle2, Loader2, PlusCircle, Trash2 } from "lucide-react";
import { useState } from "react";
import { type Address, isAddress } from "viem";
import {
	useAccount,
	useWaitForTransactionReceipt,
	useWriteContract,
} from "wagmi";
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
import { CONTRACT_ADDRESSES, MASJID_PROTOCOL_ABI } from "@/lib/contracts";

export default function RegisterPage() {
	const { isConnected } = useAccount();

	// ── Form state ──────────────────────────────────────────────────────────
	const [masjidName, setMasjidName] = useState("");
	const [metadataUri, setMetadataUri] = useState("");
	const [stablecoin, setStablecoin] = useState("");
	const [boardMembers, setBoardMembers] = useState<string[]>(["", "", ""]);
	const [cashOutThreshold, setCashOutThreshold] = useState("2");
	const [formError, setFormError] = useState<string | null>(null);

	// ── Contract write ───────────────────────────────────────────────────────
	const { writeContract, data: txHash, isPending } = useWriteContract();

	const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
		hash: txHash,
	});

	// ── Board member helpers ─────────────────────────────────────────────────
	const updateBoardMember = (index: number, value: string) => {
		setBoardMembers((prev) => prev.map((v, i) => (i === index ? value : v)));
	};

	const addBoardMember = () => setBoardMembers((prev) => [...prev, ""]);

	const removeBoardMember = (index: number) => {
		if (boardMembers.length <= 1) return;
		setBoardMembers((prev) => prev.filter((_, i) => i !== index));
	};

	// ── Validation & submit ──────────────────────────────────────────────────
	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		setFormError(null);

		if (!masjidName.trim()) return setFormError("Nama masjid wajib diisi.");
		if (!metadataUri.trim()) return setFormError("Metadata URI wajib diisi.");
		if (!isAddress(stablecoin))
			return setFormError("Alamat stablecoin tidak valid.");

		const validVerifiers = boardMembers.filter((v) => v.trim() !== "");
		if (validVerifiers.length === 0)
			return setFormError(
				"Minimal satu anggota dewan (cash-out verifier) diperlukan.",
			);

		const invalidVerifier = validVerifiers.find((v) => !isAddress(v));
		if (invalidVerifier)
			return setFormError(`Alamat tidak valid: ${invalidVerifier}`);

		const uniqueVerifiers = new Set(validVerifiers.map((v) => v.toLowerCase()));
		if (uniqueVerifiers.size !== validVerifiers.length)
			return setFormError("Alamat anggota dewan tidak boleh duplikat.");

		const threshold = Number(cashOutThreshold);
		if (!threshold || threshold < 1 || threshold > validVerifiers.length)
			return setFormError(
				`Threshold harus antara 1 dan ${validVerifiers.length} (jumlah anggota dewan).`,
			);

		writeContract({
			address: CONTRACT_ADDRESSES.masjidProtocol,
			abi: MASJID_PROTOCOL_ABI,
			functionName: "register",
			args: [
				masjidName.trim(),
				metadataUri.trim(),
				stablecoin as Address,
				validVerifiers as Address[],
				BigInt(threshold),
			],
		});
	};

	// ── Render ───────────────────────────────────────────────────────────────
	return (
		<Layout>
			<div className="max-w-2xl mx-auto">
				{/* Success state */}
				{isSuccess && (
					<div className="mb-6 flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
						<CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
						<div>
							<p className="text-sm font-semibold text-emerald-800">
								Pendaftaran berhasil!
							</p>
							<p className="text-xs text-emerald-700 mt-0.5">
								Instance masjid telah di-deploy. Sekarang menunggu attestasi
								dari verifikator Kemenag.
							</p>
							{txHash && (
								<p className="font-mono text-[10px] text-emerald-600 mt-1 break-all">
									Tx: {txHash}
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
						<form onSubmit={handleSubmit} className="space-y-6">
							{/* Nama Masjid */}
							<div className="space-y-2">
								<Label htmlFor="name" className="text-slate-700">
									Nama Masjid <span className="text-red-500">*</span>
								</Label>
								<Input
									id="name"
									placeholder="Contoh: Masjid Al-Hikmah"
									value={masjidName}
									onChange={(e) => setMasjidName(e.target.value)}
									disabled={isPending || isConfirming}
									className="border-slate-300 focus-visible:ring-emerald-500"
								/>
							</div>

							{/* Metadata URI */}
							<div className="space-y-2">
								<Label htmlFor="metadata" className="text-slate-700">
									Metadata URI <span className="text-red-500">*</span>
								</Label>
								<Input
									id="metadata"
									placeholder="ipfs://Qm..."
									value={metadataUri}
									onChange={(e) => setMetadataUri(e.target.value)}
									disabled={isPending || isConfirming}
									className="border-slate-300 focus-visible:ring-emerald-500"
								/>
								<p className="text-xs text-slate-400">
									Link ke file JSON di IPFS berisi nama, alamat, foto masjid,
									dll.
								</p>
							</div>

							{/* Stablecoin */}
							<div className="space-y-2">
								<Label htmlFor="stablecoin" className="text-slate-700">
									Alamat Token (ERC-20) <span className="text-red-500">*</span>
								</Label>
								<Input
									id="stablecoin"
									placeholder="0x..."
									value={stablecoin}
									onChange={(e) => setStablecoin(e.target.value)}
									disabled={isPending || isConfirming}
									className="font-mono text-sm border-slate-300 focus-visible:ring-emerald-500"
								/>
								<p className="text-xs text-slate-400">
									Token stablecoin (misal USDC/USDT) yang akan digunakan untuk
									donasi dan pencairan.
								</p>
							</div>

							{/* Separator */}
							<div className="border-t border-slate-100 pt-4">
								<div className="mb-3">
									<h3 className="text-sm font-semibold text-slate-800">
										Anggota Dewan Masjid (Cash-Out Verifiers)
									</h3>
									<p className="text-xs text-slate-500 mt-1">
										Wallet anggota dewan yang berwenang menyetujui pencairan
										dana kas masjid. Peran ini{" "}
										<span className="font-medium text-slate-700">berbeda</span>{" "}
										dengan verifikator Kemenag — mereka hanya mengelola
										operasional keuangan internal.
									</p>
								</div>

								<div className="space-y-2">
									{boardMembers.map((member, index) => (
										<div key={index} className="flex gap-2 items-center">
											<Input
												placeholder={`Wallet anggota #${index + 1} (0x...)`}
												value={member}
												onChange={(e) =>
													updateBoardMember(index, e.target.value)
												}
												disabled={isPending || isConfirming}
												className="font-mono text-sm border-slate-300 focus-visible:ring-emerald-500"
											/>
											<Button
												type="button"
												variant="ghost"
												size="icon"
												disabled={
													boardMembers.length <= 1 || isPending || isConfirming
												}
												onClick={() => removeBoardMember(index)}
												className="text-slate-400 hover:text-red-500 hover:bg-red-50 shrink-0"
											>
												<Trash2 className="w-4 h-4" />
											</Button>
										</div>
									))}
								</div>

								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={addBoardMember}
									disabled={isPending || isConfirming}
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
									max={boardMembers.filter((v) => v.trim()).length || 1}
									placeholder="Contoh: 2"
									value={cashOutThreshold}
									onChange={(e) => setCashOutThreshold(e.target.value)}
									disabled={isPending || isConfirming}
									className="border-slate-300 focus-visible:ring-emerald-500"
								/>
								<p className="text-xs text-slate-400">
									Berapa anggota dewan yang harus menyetujui sebelum dana bisa
									dicairkan.
								</p>
							</div>

							{/* Error */}
							{formError && (
								<p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
									{formError}
								</p>
							)}

							{/* Submit */}
							{!isConnected ? (
								<p className="text-center text-sm text-slate-500 py-2">
									Hubungkan wallet terlebih dahulu untuk mendaftar.
								</p>
							) : (
								<Button
									type="submit"
									disabled={isPending || isConfirming || isSuccess}
									className="w-full bg-emerald-700 hover:bg-emerald-800 text-white rounded-md mt-2"
								>
									{isPending || isConfirming ? (
										<>
											<Loader2 className="w-4 h-4 mr-2 animate-spin" />
											{isPending
												? "Konfirmasi di wallet..."
												: "Menunggu konfirmasi..."}
										</>
									) : isSuccess ? (
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

				{/* Info box */}
				<div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
					<p className="font-semibold mb-1">ℹ️ Proses setelah pendaftaran</p>
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
	);
}
