const IDRX_DECIMALS = 2;

export function formatIDRX(raw: bigint, decimals = IDRX_DECIMALS): string {
  const value = Number(raw) / Math.pow(10, decimals);
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatIDRXCompact(raw: bigint, decimals = IDRX_DECIMALS): string {
  const value = Number(raw) / Math.pow(10, decimals);
  if (value >= 1_000_000_000) {
    return `Rp ${(value / 1_000_000_000).toFixed(1)} M`;
  }
  if (value >= 1_000_000) {
    return `Rp ${(value / 1_000_000).toFixed(1)} jt`;
  }
  if (value >= 1_000) {
    return `Rp ${(value / 1_000).toFixed(0)} rb`;
  }
  return formatIDRX(raw, decimals);
}
