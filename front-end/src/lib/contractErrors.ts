import { BaseError, ContractFunctionRevertedError } from "viem";

const ERROR_MESSAGES: Record<string, string> = {
  // MasjidProtocol
  NotOwner: "Hanya pemilik kontrak yang dapat melakukan aksi ini.",
  NotMasjidAdmin: "Anda bukan admin masjid ini.",
  NotAuthorizedVerifier: "Anda bukan verifikator resmi.",
  InvalidThreshold: "Threshold tidak valid.",
  ZeroAddress: "Alamat tidak boleh kosong (zero address).",
  EmptyName: "Nama tidak boleh kosong.",
  InvalidStatus: "Status masjid tidak memenuhi syarat untuk aksi ini.",
  AlreadyAttested: "Masjid ini sudah pernah diattestasi oleh Anda.",
  AlreadyRegisteredName: "Nama masjid sudah terdaftar.",
  MasjidNotFound: "Masjid tidak ditemukan.",
  // MasjidInstance
  OnlyProtocol: "Hanya protokol yang dapat memanggil fungsi ini.",
  AmountZero: "Jumlah harus lebih dari nol.",
  TransferFailed: "Transfer token gagal. Periksa saldo dan allowance.",
  DuplicateVerifier: "Alamat anggota dewan duplikat.",
  InvalidExpiry: "Batas waktu tidak valid (minimal 1 hari).",
  CashOutNotFound: "Permintaan pencairan tidak ditemukan.",
  CashOutExpired: "Permintaan pencairan sudah expired.",
  CashOutAlreadyApproved: "Anda sudah menyetujui permintaan ini.",
  CashOutAlreadyExecuted: "Permintaan pencairan sudah dieksekusi.",
  CashOutIsCanceled: "Permintaan pencairan sudah dibatalkan.",
  CashOutThresholdNotReached: "Belum cukup persetujuan untuk mengeksekusi pencairan.",
  // VerifierRegistry
  NotAuthority: "Hanya authority yang dapat melakukan aksi ini.",
  AlreadyVerifier: "Alamat ini sudah terdaftar sebagai verifikator.",
  NotVerifier: "Alamat ini bukan verifikator.",
  InvalidQuorum: "Quorum tidak valid.",
  QuorumExceedsVerifierCount: "Quorum melebihi jumlah verifikator.",
};

export function mapContractError(err: unknown): string {
  if (err instanceof BaseError) {
    // User rejected in wallet
    if (err.message.includes("User rejected") || err.message.includes("user rejected")) {
      return "Transaksi dibatalkan di wallet.";
    }

    // Viem ContractFunctionRevertedError — has the custom error name
    const revert = err.walk((e) => e instanceof ContractFunctionRevertedError);
    if (revert instanceof ContractFunctionRevertedError) {
      const name = revert.data?.errorName ?? revert.reason ?? "";
      if (name && ERROR_MESSAGES[name]) return ERROR_MESSAGES[name];
      if (name) return `Kontrak menolak transaksi: ${name}`;
    }

    // Fallback to short message
    return err.shortMessage ?? err.message;
  }

  if (err instanceof Error) return err.message;
  return "Terjadi kesalahan yang tidak diketahui.";
}
