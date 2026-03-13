import { API_BASE, ipfsToHttp } from "@/lib/utils";
import type { BoardMember, CashOutItem, DonationItem, IpfsMetadata, MasjidDetail } from "./types";

export async function fetchMasjidDetail(masjidId: string): Promise<MasjidDetail> {
  const id = encodeURIComponent(masjidId);
  const res = await fetch(`${API_BASE}/public/masjids/${id}`);
  const json = (await res.json()) as { data?: MasjidDetail; error?: string };
  if (!json.data) throw new Error(json.error ?? "Masjid tidak ditemukan");
  return json.data;
}

export async function fetchMasjidDonations(masjidId: string, limit = 10): Promise<DonationItem[]> {
  const id = encodeURIComponent(masjidId);
  const res = await fetch(`${API_BASE}/public/masjids/${id}/donations?limit=${limit}`);
  const json = (await res.json()) as { data?: DonationItem[] };
  return json.data ?? [];
}

export async function fetchMasjidMembers(masjidId: string): Promise<BoardMember[]> {
  const id = encodeURIComponent(masjidId);
  const res = await fetch(`${API_BASE}/public/masjids/${id}/members`);
  const json = (await res.json()) as { data?: BoardMember[] };
  return json.data ?? [];
}

export async function fetchMasjidCashouts(masjidId: string): Promise<CashOutItem[]> {
  const id = encodeURIComponent(masjidId);
  const res = await fetch(`${API_BASE}/public/masjids/${id}/cashouts`);
  const json = (await res.json()) as { data?: CashOutItem[] };
  return json.data ?? [];
}

export async function fetchIpfsMetadata(uri: string): Promise<IpfsMetadata | null> {
  const httpUri = ipfsToHttp(uri);
  if (!httpUri) return null;
  const res = await fetch(httpUri);
  if (!res.ok) return null;
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.startsWith("image/")) return { foto: uri };
  return (await res.json()) as IpfsMetadata;
}
