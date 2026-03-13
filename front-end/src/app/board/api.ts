import { apiFetch } from "@/lib/auth";

export type MasjidInfo = {
  masjid_id: string;
  masjid_name: string;
  instance_addr: string;
  vault_addr: string;
  status: string;
};

export type CashInRecord = {
  id: number;
  instance_addr: string;
  masjid_id: string | null;
  donor: string;
  amount: string;
  new_balance: string;
  note_hash: string;
  block_number: number;
  tx_hash: string;
  donated_at: string;
};

export type DonationStats = {
  total_donors: number;
  total_donations: number;
  total_amount: string;
  last_donated_at: string | null;
};

export async function fetchBoardMasjid(): Promise<MasjidInfo[]> {
  const res = await apiFetch("/board/masjid");
  if (!res.ok) {
    const err = (await res.json()) as { error?: string };
    throw new Error(err.error ?? "Gagal memuat data masjid");
  }
  const data = (await res.json()) as { data: MasjidInfo[] };
  return data.data ?? [];
}

export async function fetchBoardDonations(
  masjidId: string | undefined,
  limit = 20
): Promise<CashInRecord[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (masjidId) params.set("masjid_id", masjidId);
  const res = await apiFetch(`/board/donations?${params}`);
  if (!res.ok) {
    const err = (await res.json()) as { error?: string };
    throw new Error(err.error ?? "Gagal memuat riwayat infaq");
  }
  const data = (await res.json()) as { data: CashInRecord[] };
  return data.data ?? [];
}

export async function fetchBoardStats(
  masjidId: string | undefined
): Promise<DonationStats | null> {
  const params = masjidId ? `?masjid_id=${masjidId}` : "";
  const res = await apiFetch(`/board/stats${params}`);
  if (!res.ok) {
    const err = (await res.json()) as { error?: string };
    throw new Error(err.error ?? "Gagal memuat statistik");
  }
  const data = (await res.json()) as { data: DonationStats | null };
  return data.data ?? null;
}
