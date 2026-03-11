import { apiFetch } from "@/lib/auth";

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export type MasjidInfo = {
  masjid_id: string;
  masjid_name: string;
  instance_addr: string;
  vault_addr: string;
  status: string;
};

// ---------------------------------------------------------------------------
// Raw API fetch functions
// ---------------------------------------------------------------------------

export async function fetchBoardMasjid(): Promise<MasjidInfo> {
  const res = await apiFetch("/board/masjid");
  if (!res.ok) {
    const err = (await res.json()) as { error?: string };
    throw new Error(err.error ?? "Gagal memuat data masjid");
  }
  const data = (await res.json()) as { data: MasjidInfo };
  return data.data;
}
