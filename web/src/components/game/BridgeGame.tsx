"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type * as Matter from "matter-js";
import type { LevelDef } from "@/lib/levels/types";

type Phase = "build" | "sim" | "won" | "lost";

type BridgeGameProps = {
  level: LevelDef;
  onWin: () => void;
  onBack: () => void;
};

const ANCHOR_R = 14;
const PICK_R = 28;
const BEAM_THICK = 16;

export function BridgeGame({ level, onWin, onBack }: BridgeGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const matterRef = useRef<typeof import("matter-js") | null>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const runnerRef = useRef<Matter.Runner | null>(null);
  const afterUpdateRef = useRef<(() => void) | null>(null);
  const carRef = useRef<Matter.Body | null>(null);
  const anchorBodiesRef = useRef<Map<string, Matter.Body>>(new Map());
  const beamCountRef = useRef(0);
  const pairsUsedRef = useRef<Set<string>>(new Set());

  const [phase, setPhase] = useState<Phase>("build");
  const [beamCount, setBeamCount] = useState(0);
  const [status, setStatus] = useState<string>("Drag between glowing nodes to place girders.");
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{
    mode: "pan" | "beam" | null;
    anchorId?: string;
    startX?: number;
    startY?: number;
    panStart?: { x: number; y: number };
  }>({ mode: null });

  const wonEmittedRef = useRef(false);
  const previewRef = useRef<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  } | null>(null);

  /** World → screen (logical px, matches ctx after setTransform(dpr)) */
  const scaleRef = useRef(1);
  const dprRef = useRef(1);

  const worldToScreen = useCallback(
    (wx: number, wy: number) => {
      const s = scaleRef.current;
      const { x: px, y: py } = pan;
      return { x: wx * s + px, y: wy * s + py };
    },
    [pan],
  );

  const screenToWorld = useCallback(
    (logicalX: number, logicalY: number) => {
      const s = scaleRef.current;
      const { x: px, y: py } = pan;
      return { x: (logicalX - px) / s, y: (logicalY - py) / s };
    },
    [pan],
  );

  const teardownPhysics = useCallback(() => {
    const Matter = matterRef.current;
    const engine = engineRef.current;
    const runner = runnerRef.current;
    if (Matter && engine && afterUpdateRef.current) {
      Matter.Events.off(engine, "afterUpdate", afterUpdateRef.current);
    }
    afterUpdateRef.current = null;
    if (runner) {
      Matter?.Runner.stop(runner);
      runnerRef.current = null;
    }
    if (engine && Matter) {
      Matter.Composite.clear(engine.world, false);
      Matter.Engine.clear(engine);
      engineRef.current = null;
    }
    carRef.current = null;
    anchorBodiesRef.current.clear();
    beamCountRef.current = 0;
    pairsUsedRef.current.clear();
  }, []);

  const setupLevel = useCallback(async () => {
    teardownPhysics();
    const Matter = await import("matter-js");
    matterRef.current = Matter;

    const engine = Matter.Engine.create({
      gravity: { x: 0, y: 1.15, scale: 0.001 },
    });
    engine.world.gravity.scale = 0.001;
    engine.world.gravity.y = 1.2;
    engineRef.current = engine;

    for (const c of level.cliffs) {
      const ground = Matter.Bodies.rectangle(c.cx, c.cy, c.w, c.h, {
        isStatic: true,
        friction: 0.9,
        frictionStatic: 1,
        label: "cliff",
        render: { visible: false },
      });
      Matter.Composite.add(engine.world, ground);
    }

    for (const a of level.anchors) {
      const node = Matter.Bodies.circle(a.x, a.y, ANCHOR_R, {
        isStatic: true,
        friction: 0.8,
        label: `anchor:${a.id}`,
        render: { visible: false },
      });
      anchorBodiesRef.current.set(a.id, node);
      Matter.Composite.add(engine.world, node);
    }

    const runner = Matter.Runner.create();
    runnerRef.current = runner;
    setPhase("build");
    setBeamCount(0);
    setStatus("Swipe empty space to pan. Drag from one node to another to build.");
  }, [level, teardownPhysics]);

  useEffect(() => {
    // Matter.js world must mount on the client; setupLevel updates React state for HUD.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Matter init requires effect + async import
    void setupLevel();
    return () => {
      teardownPhysics();
    };
  }, [setupLevel, teardownPhysics]);

  const resizeAndFit = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) {
      return;
    }
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    dprRef.current = dpr;
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const sx = w / level.worldWidth;
    const sy = h / level.worldHeight;
    const scaleLogical = Math.min(sx, sy) * 0.92;
    scaleRef.current = scaleLogical;
    setPan({
      x: (w - level.worldWidth * scaleLogical) / 2,
      y: (h - level.worldHeight * scaleLogical) / 2,
    });
  }, [level.worldHeight, level.worldWidth]);

  useEffect(() => {
    resizeAndFit();
    const ro = new ResizeObserver(() => resizeAndFit());
    if (wrapRef.current) {
      ro.observe(wrapRef.current);
    }
    window.addEventListener("orientationchange", resizeAndFit);
    return () => {
      ro.disconnect();
      window.removeEventListener("orientationchange", resizeAndFit);
    };
  }, [resizeAndFit]);

  const findAnchorAt = (wx: number, wy: number): string | undefined => {
    for (const a of level.anchors) {
      const dx = wx - a.x;
      const dy = wy - a.y;
      if (dx * dx + dy * dy <= PICK_R * PICK_R) {
        return a.id;
      }
    }
    return undefined;
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const Matter = matterRef.current;
    const engine = engineRef.current;
    if (!canvas || !Matter || !engine) {
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    const dpr = dprRef.current;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    ctx.clearRect(0, 0, w, h);

    // Cyber grid background
    ctx.save();
    ctx.fillStyle = "#070714";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(34, 211, 238, 0.08)";
    ctx.lineWidth = 1;
    const grid = 48;
    for (let x = 0; x < w + grid; x += grid) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 40, h);
      ctx.stroke();
    }
    for (let y = 0; y < h + grid; y += grid) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y + 40);
      ctx.stroke();
    }
    ctx.restore();

    const bodies = Matter.Composite.allBodies(engine.world);
    for (const body of bodies) {
      if (body.label?.startsWith("anchor:")) {
        const { x, y } = body.position;
        const scr = worldToScreen(x, y);
        const grd = ctx.createRadialGradient(
          scr.x,
          scr.y,
          2,
          scr.x,
          scr.y,
          22,
        );
        grd.addColorStop(0, "#f0abfc");
        grd.addColorStop(0.5, "#22d3ee");
        grd.addColorStop(1, "rgba(34,211,238,0)");
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(scr.x, scr.y, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(240,171,252,0.9)";
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (!body.isStatic && body.label === "car") {
        const verts = body.vertices;
        ctx.beginPath();
        const p0 = worldToScreen(verts[0].x, verts[0].y);
        ctx.moveTo(p0.x, p0.y);
        for (let i = 1; i < verts.length; i++) {
          const p = worldToScreen(verts[i].x, verts[i].y);
          ctx.lineTo(p.x, p.y);
        }
        ctx.closePath();
        ctx.fillStyle = "rgba(163,230,53,0.35)";
        ctx.fill();
        ctx.strokeStyle = "#bef264";
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (!body.isStatic && body.label === "beam") {
        const verts = body.vertices;
        ctx.beginPath();
        const p0 = worldToScreen(verts[0].x, verts[0].y);
        ctx.moveTo(p0.x, p0.y);
        for (let i = 1; i < verts.length; i++) {
          const p = worldToScreen(verts[i].x, verts[i].y);
          ctx.lineTo(p.x, p.y);
        }
        ctx.closePath();
        ctx.fillStyle = "rgba(34,211,238,0.25)";
        ctx.fill();
        ctx.strokeStyle = "rgba(34,211,238,0.85)";
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (body.isStatic && body.label === "cliff") {
        const verts = body.vertices;
        ctx.beginPath();
        const p0 = worldToScreen(verts[0].x, verts[0].y);
        ctx.moveTo(p0.x, p0.y);
        for (let i = 1; i < verts.length; i++) {
          const p = worldToScreen(verts[i].x, verts[i].y);
          ctx.lineTo(p.x, p.y);
        }
        ctx.closePath();
        ctx.fillStyle = "rgba(39,39,42,0.95)";
        ctx.fill();
        ctx.strokeStyle = "rgba(113,113,122,0.5)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    const constraints = Matter.Composite.allConstraints(engine.world);
    for (const c of constraints) {
      const a = c.pointA;
      const b = c.pointB;
      if (!c.bodyA || !c.bodyB) {
        continue;
      }
      const p1 = Matter.Vector.add(c.bodyA.position, Matter.Vector.rotate(a, c.bodyA.angle));
      const p2 = Matter.Vector.add(c.bodyB.position, Matter.Vector.rotate(b, c.bodyB.angle));
      const s1 = worldToScreen(p1.x, p1.y);
      const s2 = worldToScreen(p2.x, p2.y);
      ctx.beginPath();
      ctx.moveTo(s1.x, s1.y);
      ctx.lineTo(s2.x, s2.y);
      ctx.strokeStyle = "rgba(34,211,238,0.35)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    const pv = previewRef.current;
    if (pv && phase === "build") {
      const s1 = worldToScreen(pv.x1, pv.y1);
      const s2 = worldToScreen(pv.x2, pv.y2);
      ctx.beginPath();
      ctx.moveTo(s1.x, s1.y);
      ctx.lineTo(s2.x, s2.y);
      ctx.strokeStyle = "rgba(244,114,182,0.7)";
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 8]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

  }, [phase, worldToScreen]);

  useEffect(() => {
    let id: number;
    const loop = () => {
      draw();
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [draw]);


  const startSimulation = () => {
    const Matter = matterRef.current;
    const engine = engineRef.current;
    if (!Matter || !engine || phase !== "build") {
      return;
    }
    if (beamCountRef.current < 1) {
      setStatus("Place at least one girder before running the sim.");
      return;
    }

    const car = Matter.Bodies.rectangle(
      level.spawn.x,
      level.spawn.y,
      52,
      32,
      {
        friction: 0.45,
        frictionAir: 0.01,
        density: 0.005,
        label: "car",
        restitution: 0.05,
      },
    );
    carRef.current = car;
    Matter.Composite.add(engine.world, car);

    const runner = runnerRef.current;
    if (runner) {
      Matter.Runner.run(runner, engine);
    }

    wonEmittedRef.current = false;
    const onAfter = () => {
      const body = carRef.current;
      if (!body) {
        return;
      }
      if (body.position.x >= level.goalX) {
        Matter.Runner.stop(runner!);
        setPhase("won");
        setStatus("Sector cleared — bridge holds.");
        if (!wonEmittedRef.current) {
          wonEmittedRef.current = true;
          onWin();
        }
        return;
      }
      if (body.position.y > level.abyssY) {
        Matter.Runner.stop(runner!);
        setPhase("lost");
        setStatus("Payload lost to the void. Reset and reinforce.");
      }
    };
    afterUpdateRef.current = onAfter;
    Matter.Events.on(engine, "afterUpdate", onAfter);
    setPhase("sim");
    setStatus("Simulation running…");
  };

  const resetBuild = async () => {
    await setupLevel();
    setStatus("Swipe empty space to pan. Drag node to node to build.");
  };

  /** Logical coordinates (same space as worldToScreen output) */
  const getCanvasLogicalCoords = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return { lx: 0, ly: 0 };
    }
    const rect = canvas.getBoundingClientRect();
    return {
      lx: clientX - rect.left,
      ly: clientY - rect.top,
    };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (phase !== "build") {
      return;
    }
    const { lx, ly } = getCanvasLogicalCoords(e.clientX, e.clientY);
    const wx = screenToWorld(lx, ly).x;
    const wy = screenToWorld(lx, ly).y;
    const hit = findAnchorAt(wx, wy);
    if (hit) {
      const a = level.anchors.find((n) => n.id === hit)!;
      dragRef.current = {
        mode: "beam",
        anchorId: hit,
        startX: a.x,
        startY: a.y,
      };
      previewRef.current = { x1: a.x, y1: a.y, x2: a.x, y2: a.y };
    } else {
      dragRef.current = {
        mode: "pan",
        panStart: { ...pan },
        startX: lx,
        startY: ly,
      };
    }
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (d.mode === "beam" && d.startX !== undefined && d.anchorId) {
      const { lx, ly } = getCanvasLogicalCoords(e.clientX, e.clientY);
      const wx = screenToWorld(lx, ly).x;
      const wy = screenToWorld(lx, ly).y;
      const ax = d.startX;
      const ay = d.startY!;
      previewRef.current = { x1: ax, y1: ay, x2: wx, y2: wy };
    } else if (d.mode === "pan" && d.panStart && d.startX !== undefined) {
      const { lx, ly } = getCanvasLogicalCoords(e.clientX, e.clientY);
      const dx = lx - d.startX;
      const dy = ly - d.startY!;
      setPan({ x: d.panStart.x + dx, y: d.panStart.y + dy });
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const Matter = matterRef.current;
    const engine = engineRef.current;
    const d = dragRef.current;
    previewRef.current = null;
    dragRef.current = { mode: null };

    if (!Matter || !engine || phase !== "build") {
      return;
    }

    if (d.mode === "beam" && d.anchorId) {
      const { lx, ly } = getCanvasLogicalCoords(e.clientX, e.clientY);
      const wx = screenToWorld(lx, ly).x;
      const wy = screenToWorld(lx, ly).y;
      const bId = findAnchorAt(wx, wy);
      if (!bId || bId === d.anchorId) {
        return;
      }
      const pairKey = [d.anchorId, bId].sort().join("|");
      if (pairsUsedRef.current.has(pairKey)) {
        setStatus("That link already exists.");
        return;
      }
      if (beamCountRef.current >= level.maxBeams) {
        setStatus("Girder budget exhausted.");
        return;
      }

      const a1 = level.anchors.find((n) => n.id === d.anchorId)!;
      const a2 = level.anchors.find((n) => n.id === bId)!;
      const dx = a2.x - a1.x;
      const dy = a2.y - a1.y;
      const len = Math.hypot(dx, dy);
      const midX = (a1.x + a2.x) / 2;
      const midY = (a1.y + a2.y) / 2;
      const angle = Math.atan2(dy, dx);

      const beam = Matter.Bodies.rectangle(midX, midY, len, BEAM_THICK, {
        angle,
        friction: 0.55,
        frictionStatic: 0.9,
        density: 0.004,
        label: "beam",
        chamfer: { radius: 4 },
      });

      const bodyA = anchorBodiesRef.current.get(d.anchorId)!;
      const bodyB = anchorBodiesRef.current.get(bId)!;

      const c1 = Matter.Constraint.create({
        bodyA,
        bodyB: beam,
        pointA: { x: 0, y: 0 },
        pointB: { x: -len / 2, y: 0 },
        stiffness: 0.92,
        damping: 0.08,
      });
      const c2 = Matter.Constraint.create({
        bodyA: bodyB,
        bodyB: beam,
        pointA: { x: 0, y: 0 },
        pointB: { x: len / 2, y: 0 },
        stiffness: 0.92,
        damping: 0.08,
      });

      Matter.Composite.add(engine.world, [beam, c1, c2]);
      pairsUsedRef.current.add(pairKey);
      beamCountRef.current += 1;
      setBeamCount(beamCountRef.current);
      setStatus(`Girders: ${beamCountRef.current} / ${level.maxBeams}`);
    }
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-zinc-600 px-3 py-1.5 text-zinc-200 hover:bg-white/5"
        >
          Levels
        </button>
        <span className="font-[family-name:var(--font-orbitron)] text-cyan-200/90">
          {level.name}
        </span>
        <span className="text-fuchsia-300/90">
          Girders {beamCount}/{level.maxBeams}
        </span>
      </div>
      <div
        ref={wrapRef}
        className="relative min-h-[min(420px,55vh)] flex-1 overflow-hidden rounded-2xl border border-cyan-500/20 bg-black/40 shadow-[inset_0_0_60px_rgba(168,85,247,0.08)]"
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 touch-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)",
          }}
        />
      </div>
      <p className="text-center text-xs text-zinc-500">{status}</p>
      <div className="flex flex-wrap gap-2">
        {phase === "build" ? (
          <button
            type="button"
            onClick={startSimulation}
            className="flex-1 rounded-xl border border-lime-400/50 bg-lime-500/20 py-3 text-sm font-semibold text-lime-100 shadow-[0_0_24px_rgba(163,230,53,0.2)]"
          >
            Run simulation
          </button>
        ) : null}
        {phase === "sim" || phase === "won" || phase === "lost" ? (
          <button
            type="button"
            onClick={() => void resetBuild()}
            className="flex-1 rounded-xl border border-cyan-500/40 bg-cyan-950/40 py-3 text-sm font-semibold text-cyan-100"
          >
            Rebuild
          </button>
        ) : null}
        {phase === "won" ? (
          <div className="w-full rounded-xl border border-lime-400/40 bg-lime-950/30 px-3 py-2 text-center text-sm text-lime-200">
            Level complete — return to level select for the next sector.
          </div>
        ) : null}
      </div>
    </div>
  );
}
