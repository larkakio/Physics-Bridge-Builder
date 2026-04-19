"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { CheckInPanel } from "@/components/CheckInPanel";
import { WalletBar } from "@/components/WalletBar";
import {
  completeLevel,
  isLevelUnlocked,
  loadProgress,
  type ProgressState,
} from "@/lib/game/progress";
import { LEVELS, getLevel } from "@/lib/levels/levels";

const BridgeGame = dynamic(
  () =>
    import("@/components/game/BridgeGame").then((m) => m.BridgeGame),
  { ssr: false, loading: () => <p className="p-8 text-center text-zinc-500">Loading engine…</p> },
);

type Screen = "levels" | "play";

export default function Home() {
  const [screen, setScreen] = useState<Screen>("levels");
  const [activeLevelId, setActiveLevelId] = useState(1);
  const [progress, setProgress] = useState<ProgressState>(() => loadProgress());

  const onWin = useCallback(() => {
    setProgress(completeLevel(activeLevelId));
  }, [activeLevelId]);

  const level = getLevel(activeLevelId);

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden">
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.35]"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(168,85,247,0.25), transparent), radial-gradient(ellipse 60% 40% at 100% 50%, rgba(34,211,238,0.12), transparent)",
        }}
      />
      <header className="relative z-10 border-b border-cyan-500/15 bg-zinc-950/80 px-4 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="font-[family-name:var(--font-orbitron)] text-lg font-bold tracking-[0.15em] text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-lime-300 drop-shadow-[0_0_12px_rgba(34,211,238,0.35)]">
                PHYSICS BRIDGE
              </h1>
              <p className="mt-1 font-[family-name:var(--font-rajdhani)] text-xs uppercase tracking-[0.25em] text-zinc-500">
                Builder // Base
              </p>
            </div>
          </div>
          <WalletBar />
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-6">
        {screen === "levels" ? (
          <div className="flex flex-1 flex-col gap-6">
            <p className="text-center font-[family-name:var(--font-rajdhani)] text-sm leading-relaxed text-zinc-400">
              Pan empty space. Drag between hex nodes to place girders. Run the
              simulation and get the payload across the gap.
            </p>
            <ul className="flex flex-col gap-3">
              {LEVELS.map((lv) => {
                const unlocked = isLevelUnlocked(lv.id, progress);
                return (
                  <li key={lv.id}>
                    <button
                      type="button"
                      disabled={!unlocked}
                      onClick={() => {
                        setActiveLevelId(lv.id);
                        setScreen("play");
                      }}
                      className="flex w-full items-center justify-between rounded-2xl border border-cyan-500/25 bg-zinc-900/60 px-4 py-4 text-left transition enabled:hover:border-cyan-400/50 enabled:hover:bg-zinc-800/80 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <span className="font-[family-name:var(--font-orbitron)] text-sm text-cyan-100">
                        Sector {lv.id}
                      </span>
                      <span className="font-[family-name:var(--font-rajdhani)] text-sm text-zinc-400">
                        {lv.name}
                      </span>
                      {!unlocked ? (
                        <span className="text-xs text-fuchsia-400/80">Locked</span>
                      ) : (
                        <span className="text-xs text-lime-400/90">Open</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
            <CheckInPanel />
          </div>
        ) : level ? (
          <BridgeGame
            level={level}
            onWin={onWin}
            onBack={() => setScreen("levels")}
          />
        ) : null}
      </main>
    </div>
  );
}
