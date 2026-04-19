"use client";

import { useState } from "react";
import { formatEther } from "viem";
import { base } from "wagmi/chains";
import {
  useAccount,
  useBalance,
  useConnect,
  useDisconnect,
  useSwitchChain,
} from "wagmi";

export function WalletBar() {
  const { address, chainId, isConnected, status } = useAccount();
  const { disconnect } = useDisconnect();
  const { connect, connectors, isPending: isConnectPending } = useConnect();
  const { switchChain, isPending: isSwitchPending } = useSwitchChain();
  const { data: balance } = useBalance({ address });
  const [sheetOpen, setSheetOpen] = useState(false);

  const wrongNetwork = isConnected && chainId !== base.id;

  return (
    <div className="flex flex-col gap-2">
      {wrongNetwork ? (
        <div
          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-400/50 bg-amber-500/10 px-3 py-2 text-sm text-amber-100"
          role="status"
        >
          <span>Wrong network — switch to Base to check in.</span>
          <button
            type="button"
            className="rounded-lg bg-amber-500/30 px-3 py-1.5 font-medium text-white transition hover:bg-amber-500/50"
            onClick={() => switchChain({ chainId: base.id })}
            disabled={isSwitchPending}
          >
            {isSwitchPending ? "Switching…" : "Switch to Base"}
          </button>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        {isConnected && address ? (
          <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-xs text-zinc-300">
            <span className="truncate font-mono text-[11px] text-cyan-200/90">
              {address.slice(0, 6)}…{address.slice(-4)}
            </span>
            {balance ? (
              <span className="text-zinc-400">
                {Number(formatEther(balance.value)).toFixed(4)} {balance.symbol}
              </span>
            ) : null}
          </div>
        ) : (
          <span className="text-xs text-zinc-500">
            Connect a wallet for daily check-in on Base.
          </span>
        )}

        <div className="flex shrink-0 gap-2">
          {isConnected ? (
            <button
              type="button"
              onClick={() => disconnect()}
              className="rounded-lg border border-fuchsia-500/40 bg-fuchsia-950/40 px-3 py-2 text-xs font-medium text-fuchsia-100 transition hover:bg-fuchsia-900/50"
            >
              Disconnect
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              disabled={status === "connecting" || isConnectPending}
              className="rounded-lg border border-cyan-400/60 bg-cyan-500/15 px-4 py-2 text-sm font-semibold text-cyan-100 shadow-[0_0_20px_rgba(34,211,238,0.25)] transition hover:bg-cyan-500/25"
            >
              {isConnectPending ? "Connecting…" : "Connect wallet"}
            </button>
          )}
        </div>
      </div>

      {sheetOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSheetOpen(false);
            }
          }}
        >
          <div
            className="flex w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-cyan-500/30 bg-zinc-950/98 shadow-[0_0_40px_rgba(168,85,247,0.15)] backdrop-blur-md sm:max-h-[min(90dvh,720px)] sm:rounded-2xl"
            role="dialog"
            aria-modal="true"
            aria-label="Choose wallet"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-zinc-800/80 px-4 py-3">
              <h2 className="font-[family-name:var(--font-orbitron)] text-sm font-semibold tracking-wide text-cyan-200">
                Connect wallet
              </h2>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="rounded-lg px-2 py-1 text-zinc-400 hover:bg-white/5 hover:text-white"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <ul
              className="max-h-[calc(92dvh-4.25rem)] overflow-y-auto overscroll-contain px-4 py-3 [-webkit-overflow-scrolling:touch] pb-[max(1rem,env(safe-area-inset-bottom))] sm:max-h-[min(60dvh,28rem)]"
            >
              {connectors.map((connector) => (
                <li key={connector.uid} className="mb-2 last:mb-0">
                  <button
                    type="button"
                    className="w-full rounded-xl border border-zinc-700/80 bg-zinc-900/80 px-4 py-3 text-left text-sm text-zinc-100 transition hover:border-cyan-500/50 hover:bg-zinc-800"
                    onClick={() =>
                      connect(
                        { connector, chainId: base.id },
                        {
                          onSuccess: () => setSheetOpen(false),
                        },
                      )
                    }
                  >
                    {connector.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}
