"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { type Address, keccak256, toHex } from "viem";
import { simulateContract, waitForTransactionReceipt } from "@wagmi/core";
import {
  useAccount,
  useConfig,
  useReadContract,
  useWriteContract,
} from "wagmi";
import { ERC20_ABI, MASJID_INSTANCE_ABI } from "@/lib/contracts";
import { mapContractError } from "@/lib/contractErrors";
import {
  fetchIpfsMetadata,
  fetchMasjidCashouts,
  fetchMasjidDetail,
  fetchMasjidDonations,
  fetchMasjidMembers,
} from "./api";

export function useMasjidDetail(masjidId: string) {
  return useQuery({
    queryKey: ["masjid", masjidId],
    queryFn: () => fetchMasjidDetail(masjidId),
  });
}

export function useMasjidDonations(masjidId: string) {
  return useQuery({
    queryKey: ["masjid", masjidId, "donations"],
    queryFn: () => fetchMasjidDonations(masjidId),
  });
}

export function useMasjidMembers(masjidId: string) {
  return useQuery({
    queryKey: ["masjid", masjidId, "members"],
    queryFn: () => fetchMasjidMembers(masjidId),
  });
}

export function useMasjidCashouts(masjidId: string) {
  return useQuery({
    queryKey: ["masjid", masjidId, "cashouts"],
    queryFn: () => fetchMasjidCashouts(masjidId),
  });
}

export function useMasjidMetadata(uri: string | undefined) {
  return useQuery({
    queryKey: ["ipfs", uri],
    queryFn: () => fetchIpfsMetadata(uri!),
    enabled: !!uri,
  });
}

export function useTokenInfo(stablecoin: Address, spender: Address, userAddr: Address | undefined) {
  const { data: decimals } = useReadContract({
    address: stablecoin,
    abi: ERC20_ABI,
    functionName: "decimals",
  });

  const { data: balance } = useReadContract({
    address: stablecoin,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: userAddr ? [userAddr] : undefined,
    query: { enabled: !!userAddr },
  });

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: stablecoin,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: userAddr ? [userAddr, spender] : undefined,
    query: { enabled: !!userAddr },
  });

  return {
    dec: (decimals as number | undefined) ?? 2,
    balance: (balance as bigint | undefined) ?? BigInt(0),
    allowance: (allowance as bigint | undefined) ?? BigInt(0),
    refetchAllowance,
  };
}

export type ApproveArgs = {
  stablecoin: Address;
  spender: Address;
  amount: bigint;
};

export function useApproveToken() {
  const config = useConfig();
  const { writeContractAsync } = useWriteContract();

  const mutation = useMutation({
    mutationFn: async ({ stablecoin, spender, amount }: ApproveArgs) => {
      try {
        const { request } = await simulateContract(config, {
          address: stablecoin,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [spender, amount],
        });
        const hash = await writeContractAsync(request);
        await waitForTransactionReceipt(config, { hash });
        return hash;
      } catch (err) {
        throw new Error(mapContractError(err));
      }
    },
  });

  return mutation;
}

export type CashInArgs = {
  instanceAddr: Address;
  amount: bigint;
  note: string;
};

export function useCashIn() {
  const config = useConfig();
  const { writeContractAsync } = useWriteContract();

  const mutation = useMutation({
    mutationFn: async ({ instanceAddr, amount, note }: CashInArgs) => {
      const noteHash: `0x${string}` = note.trim()
        ? keccak256(toHex(note.trim()))
        : "0x0000000000000000000000000000000000000000000000000000000000000000";
      try {
        const { request } = await simulateContract(config, {
          address: instanceAddr,
          abi: MASJID_INSTANCE_ABI,
          functionName: "cashIn",
          args: [amount, noteHash],
        });
        const hash = await writeContractAsync(request);
        await waitForTransactionReceipt(config, { hash });
        return hash;
      } catch (err) {
        throw new Error(mapContractError(err));
      }
    },
  });

  return mutation;
}

