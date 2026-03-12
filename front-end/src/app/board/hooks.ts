"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { type Address, formatUnits } from "viem";
import { simulateContract } from "@wagmi/core";
import {
  useReadContracts,
  useWaitForTransactionReceipt,
  useWriteContract,
  useConfig,
} from "wagmi";
import {
  type CashOutRequest,
  CONTRACT_ADDRESSES,
  ERC20_ABI,
  MASJID_INSTANCE_ABI,
  MASJID_PROTOCOL_ABI,
  InstanceVerificationStatus,
} from "@/lib/contracts";
import { mapContractError } from "@/lib/contractErrors";
import { formatIDRXCompact } from "@/lib/idrx";
import { fetchBoardDonations, fetchBoardMasjid, fetchBoardStats } from "./api";

export function useBoardMasjid() {
  return useQuery({
    queryKey: ["board", "masjid"],
    queryFn: fetchBoardMasjid,
  });
}

export function useBoardDonations(masjidId: string | undefined) {
  return useQuery({
    queryKey: ["board", "donations", masjidId],
    queryFn: () => fetchBoardDonations(masjidId),
    enabled: !!masjidId,
  });
}

export function useBoardStats(masjidId: string | undefined) {
  return useQuery({
    queryKey: ["board", "stats", masjidId],
    queryFn: () => fetchBoardStats(masjidId),
    enabled: !!masjidId,
    refetchInterval: 15000,
  });
}

export function useInstanceContracts(instanceAddress: Address | undefined) {
  const instanceContract = instanceAddress
    ? ({ address: instanceAddress, abi: MASJID_INSTANCE_ABI } as const)
    : null;

  const { data: instanceData, isLoading: loadingInstance } = useReadContracts({
    contracts: instanceContract
      ? [
          { ...instanceContract, functionName: "status" },
          { ...instanceContract, functionName: "cashOutThreshold" },
          { ...instanceContract, functionName: "boardMemberCount" },
          { ...instanceContract, functionName: "cashOutNonce" },
          { ...instanceContract, functionName: "STABLECOIN" },
          { ...instanceContract, functionName: "balance" },
        ]
      : [],
    query: { enabled: !!instanceAddress, refetchInterval: 8000 },
  });

  const instanceStatus = instanceData?.[0]?.result as number | undefined;
  const cashOutThreshold = instanceData?.[1]?.result as bigint | undefined;
  const boardMemberCount = instanceData?.[2]?.result as bigint | undefined;
  const cashOutNonce = instanceData?.[3]?.result as bigint | undefined;
  const stablecoinAddress = instanceData?.[4]?.result as Address | undefined;
  const rawBalance = instanceData?.[5]?.result as bigint | undefined;

  return {
    instanceStatus,
    cashOutThreshold,
    boardMemberCount,
    cashOutNonce,
    stablecoinAddress,
    rawBalance,
    loadingInstance,
  };
}

export function useTokenInfo(stablecoinAddress: Address | undefined) {
  const { data: tokenData } = useReadContracts({
    contracts: stablecoinAddress
      ? [
          { address: stablecoinAddress, abi: ERC20_ABI, functionName: "decimals" },
          { address: stablecoinAddress, abi: ERC20_ABI, functionName: "symbol" },
        ]
      : [],
    query: { enabled: !!stablecoinAddress },
  });

  const decimals = (tokenData?.[0]?.result as number | undefined) ?? 2;
  const symbol = (tokenData?.[1]?.result as string | undefined) ?? "IDRX";

  return { decimals, symbol };
}

export function useCashOutRequests(
  instanceAddress: Address | undefined,
  cashOutNonce: bigint | undefined
) {
  const requestIds =
    cashOutNonce !== undefined
      ? Array.from({ length: Number(cashOutNonce) }, (_, i) => BigInt(i + 1))
      : [];

  const { data: cashOutData } = useReadContracts({
    contracts:
      instanceAddress && requestIds.length > 0
        ? requestIds.map((id) => ({
            address: instanceAddress,
            abi: MASJID_INSTANCE_ABI,
            functionName: "cashOutById" as const,
            args: [id] as const,
          }))
        : [],
    query: {
      enabled: !!instanceAddress && requestIds.length > 0,
      refetchInterval: 8000,
    },
  });

  const requests: Array<{ requestId: bigint; req: CashOutRequest }> = [];
  if (cashOutData) {
    for (let idx = 0; idx < cashOutData.length; idx++) {
      const result = cashOutData[idx];
      if (!result?.result) continue;
      const r = result.result as readonly [
        Address,
        bigint,
        `0x${string}`,
        Address,
        bigint,
        bigint,
        number,
        boolean,
        boolean,
      ];
      requests.push({
        requestId: requestIds[idx],
        req: {
          to: r[0],
          amount: r[1],
          noteHash: r[2],
          proposer: r[3],
          createdAt: r[4],
          expiresAt: r[5],
          approvals: r[6],
          executed: r[7],
          canceled: r[8],
        },
      });
    }
  }

  return { requestIds, requests };
}

export function useBoardDashboard(selectedMasjidId?: string) {
  const { data: masjids, isLoading, error } = useBoardMasjid();

  const masjid = masjids
    ? (selectedMasjidId
        ? masjids.find((m) => m.masjid_id === selectedMasjidId)
        : masjids[0]) ?? null
    : null;

  const instanceAddress = masjid?.instance_addr as Address | undefined;

  const {
    instanceStatus,
    cashOutThreshold,
    boardMemberCount,
    cashOutNonce,
    stablecoinAddress,
    rawBalance,
    loadingInstance,
  } = useInstanceContracts(instanceAddress);

  const { decimals, symbol } = useTokenInfo(stablecoinAddress);

  const { requestIds, requests } = useCashOutRequests(
    instanceAddress,
    cashOutNonce
  );

  const formattedBalance =
    rawBalance !== undefined
      ? symbol === "IDRX"
        ? formatIDRXCompact(rawBalance)
        : `${parseFloat(formatUnits(rawBalance, decimals)).toLocaleString(
            "id-ID",
            { minimumFractionDigits: 2 }
          )} ${symbol}`
      : "—";

  const isVerified = instanceStatus === InstanceVerificationStatus.Verified;

  return {
    masjid,
    masjids: masjids ?? [],
    isLoading,
    apiError: error ? (error as Error).message : null,
    instanceAddress,
    loadingInstance,
    cashOutThreshold,
    boardMemberCount,
    formattedBalance,
    symbol,
    decimals,
    requestIds,
    requests,
    isVerified,
  };
}

export type ProposeCashOutArgs = {
  instanceAddress: Address;
  to: Address;
  amount: bigint;
  noteHash: `0x${string}`;
  ttl: bigint;
};

export function useProposeCashOut() {
  const config = useConfig();
  const { writeContractAsync } = useWriteContract();

  const mutation = useMutation({
    mutationFn: async (params: ProposeCashOutArgs) => {
      try {
        const { request } = await simulateContract(config, {
          address: params.instanceAddress,
          abi: MASJID_INSTANCE_ABI,
          functionName: "proposeCashOut",
          args: [params.to, params.amount, params.noteHash, params.ttl],
        });
        return await writeContractAsync(request);
      } catch (err) {
        throw new Error(mapContractError(err));
      }
    },
  });

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash: mutation.data });

  return { ...mutation, isConfirming, isConfirmed };
}

export function useExecuteCashOut() {
  const config = useConfig();
  const { writeContractAsync } = useWriteContract();

  const mutation = useMutation({
    mutationFn: async ({
      instanceAddress,
      requestId,
    }: {
      instanceAddress: Address;
      requestId: bigint;
    }) => {
      try {
        const { request } = await simulateContract(config, {
          address: instanceAddress,
          abi: MASJID_INSTANCE_ABI,
          functionName: "executeCashOut",
          args: [requestId],
        });
        return await writeContractAsync(request);
      } catch (err) {
        throw new Error(mapContractError(err));
      }
    },
  });

  const { isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: mutation.data,
    query: { enabled: !!mutation.data },
  });

  return { ...mutation, isConfirming };
}

export function useCancelCashOut() {
  const config = useConfig();
  const { writeContractAsync } = useWriteContract();

  const mutation = useMutation({
    mutationFn: async ({
      instanceAddress,
      requestId,
    }: {
      instanceAddress: Address;
      requestId: bigint;
    }) => {
      try {
        const { request } = await simulateContract(config, {
          address: instanceAddress,
          abi: MASJID_INSTANCE_ABI,
          functionName: "cancelCashOut",
          args: [requestId],
        });
        return await writeContractAsync(request);
      } catch (err) {
        throw new Error(mapContractError(err));
      }
    },
  });

  const { isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: mutation.data,
    query: { enabled: !!mutation.data },
  });

  return { ...mutation, isConfirming };
}

export type RegisterMasjidArgs = {
  name: string;
  metadataUri: string;
  stablecoin: Address;
  boardMembers: Address[];
};

export function useRegisterMasjid() {
  const config = useConfig();
  const { writeContractAsync } = useWriteContract();

  const mutation = useMutation({
    mutationFn: async (params: RegisterMasjidArgs) => {
      try {
        const { request } = await simulateContract(config, {
          address: CONTRACT_ADDRESSES.masjidProtocol,
          abi: MASJID_PROTOCOL_ABI,
          functionName: "register",
          args: [
            params.name,
            params.metadataUri,
            params.stablecoin,
            params.boardMembers,
          ],
        });
        return await writeContractAsync(request);
      } catch (err) {
        throw new Error(mapContractError(err));
      }
    },
  });

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash: mutation.data });

  return { ...mutation, isConfirming, isConfirmed };
}
