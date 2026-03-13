import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { parseUnits } from "viem"

export const API_BASE = process.env.NEXT_PUBLIC_API_URL!;

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function shortenAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function formatAmount(raw: string | null | undefined, decimals = 2) {
  if (!raw) return "—";
  const n = parseFloat(raw);
  if (isNaN(n)) return "—";
  const val = n / Math.pow(10, decimals);
  return (
    val.toLocaleString("id-ID", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + " IDRX"
  );
}

export function ipfsToHttp(uri: string | undefined): string | null {
  if (!uri) return null;
  if (uri.startsWith("ipfs://")) return `https://apricot-traditional-bison-98.mypinata.cloud/ipfs/${uri.slice(7)}`;
  return uri;
}

export function parseDonateAmount(amount: string, dec: number): bigint {
  try { return amount ? parseUnits(amount, dec) : BigInt(0); }
  catch { return BigInt(0); }
}
