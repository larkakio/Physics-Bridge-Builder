"use client";

import { useState } from "react";
import { base } from "wagmi/chains";
import {
  useAccount,
  useReadContract,
  useSwitchChain,
  useWriteContract,
} from "wagmi";
import { getBuilderDataSuffix } from "@/lib/builder";
import { checkInAbi, getCheckInAddress } from "@/lib/contracts/checkIn";

export function CheckInPanel() {
  const { address, isConnected, chainId } = useAccount();
  const contractAddress = getCheckInAddress();
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain();
  const { writeContractAsync, isPending: isWriting, error } = useWriteContract();
  const [localError, setLocalError] = useState<string | null>(null);

  const { data: lastDay, refetch } = useReadContract({
    address: contractAddress,
    abi: checkInAbi,
    functionName: "lastCheckInDay",
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(contractAddress && address && isConnected),
    },
  });

  const busy = isSwitching || isWriting;

  async function handleCheckIn() {
    setLocalError(null);
    if (!contractAddress) {
      setLocalError("Contract address not configured.");
      return;
    }
    if (!isConnected) {
      setLocalError("Connect your wallet first.");
      return;
    }
    const baseId = base.id;
    try {
      if (chainId !== baseId) {
        await switchChainAsync({ chainId: baseId });
      }
      const dataSuffix = getBuilderDataSuffix();
      await writeContractAsync({
        address: contractAddress,
        abi: checkInAbi,
        functionName: "checkIn",
        chainId: baseId,
        ...(dataSuffix ? { dataSuffix } : {}),
      });
      await refetch();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Transaction failed";
      setLocalError(msg);
    }
  }

  const displayError = localError ?? error?.message ?? null;

  return (
    <div className="rounded-xl border border-lime-400/25 bg-lime-950/20 p-4">
      <h3 className="mb-2 font-[family-name:var(--font-orbitron)] text-xs font-semibold uppercase tracking-[0.2em] text-lime-300/90">
        Daily check-in (Base)
      </h3>
      <p className="mb-3 text-xs leading-relaxed text-zinc-400">
        One check-in per UTC day. You only pay L2 gas — no fee to the contract.
      </p>
      {!contractAddress ? (
        <p className="text-xs text-amber-200/90">
          Set{" "}
          <code className="rounded bg-black/40 px-1">NEXT_PUBLIC_CHECK_IN_CONTRACT_ADDRESS</code>{" "}
          after deployment.
        </p>
      ) : (
        <p className="mb-3 font-mono text-[11px] text-zinc-500">
          Last day index:{" "}
          <span className="text-zinc-300">
            {lastDay !== undefined ? String(lastDay) : "—"}
          </span>
        </p>
      )}
      <button
        type="button"
        onClick={() => void handleCheckIn()}
        disabled={!isConnected || !contractAddress || busy}
        className="w-full rounded-lg border border-lime-400/50 bg-lime-500/20 py-3 text-sm font-semibold text-lime-100 transition enabled:hover:bg-lime-500/30 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy ? "Confirm in wallet…" : "Check in on-chain"}
      </button>
      {displayError ? (
        <p className="mt-2 text-xs text-red-300/90">{displayError}</p>
      ) : null}
    </div>
  );
}
