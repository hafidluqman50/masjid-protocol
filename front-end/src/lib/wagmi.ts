import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { hardhat, sepolia } from "wagmi/chains";

export const wagmiConfig = getDefaultConfig({
  appName: "Masjid Protocol",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "dev",
  chains: [sepolia, hardhat],
  ssr: true,
});