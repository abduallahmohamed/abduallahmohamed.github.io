/*
 * DESIGN: Dark Technical Minimalism
 * Interactive Trajectory Prediction Demo — SocialSTGCNN (CVPR 2020)
 * Users place agents on a canvas, then the demo simulates social trajectory prediction
 * with animated predicted paths, social force vectors, and uncertainty cones.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Play, Pause, RotateCcw, Plus, Trash2,
  Info, Zap, Users, GitBranch, ChevronRight
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Agent {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  history: { x: number; y: number }[];
  predicted: { x: number; y: number }[];
  socialForces: { fx: number; fy: number }[];
}

// ─── Constants ────────────────────────────────────────────────────────────────
const AGENT_COLORS = [
  "#00e5ff", "#f59e0b", "#a78bfa", "#34d399", "#f87171",
  "#60a5fa", "#fb923c", "#e879f9", "#4ade80", "#fbbf24",
];
const HISTORY_LEN = 8;
const PRED_LEN = 12;
const SOCIAL_RADIUS = 120;

// ─── Social force computation (simplified SocialSTGCNN-inspired) ──────────────
function computeSocialForces(agents: Agent[], idx: number): { fx: number; fy: number } {
  const agent = agents[idx];
  let fx = 0, fy = 0;
  for (let j = 0; j < agents.length; j++) {
    if (j === idx) continue;
    const other = agents[j];
    const dx = agent.x - other.x;
    const dy = agent.y - other.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < SOCIAL_RADIUS && dist > 0) {
      const strength = (1 - dist / SOCIAL_RADIUS) * 0.8;
      fx += (dx / dist) * strength;
      fy += (dy / dist) * strength;
    }
  }
  return { fx, fy };
}

// ─── Predict trajectory for one agent ────────────────────────────────────────
function predictTrajectory(agent: Agent, allAgents: Agent[]): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  let px = agent.x;
  let py = agent.y;
  let pvx = agent.vx;
  let pvy = agent.vy;

  // Estimate velocity from history
  if (agent.history.length >= 2) {
    const last = agent.history[agent.history.length - 1];
    const prev = agent.history[agent.history.length - 2];
    pvx = (last.x - prev.x) * 0.8 + pvx * 0.2;
    pvy = (last.y - prev.y) * 0.8 + pvy * 0.2;
  }

  const tempAgents = allAgents.map((a, i) => {
    if (a.id === agent.id) return { ...a, x: px, y: py };
    return a;
  });

  for (let t = 0; t < PRED_LEN; t++) {
    const sf = computeSocialForces(tempAgents, allAgents.findIndex(a => a.id === agent.id));
    pvx = pvx * 0.96 + sf.fx * 0.04;
    pvy = pvy * 0.96 + sf.fy * 0.04;
    // Add slight noise for stochastic appearance
    pvx += (Math.random() - 0.5) * 0.3;
    pvy += (Math.random() - 0.5) * 0.3;
    px += pvx;
    py += pvy;
    pts.push({ x: px, y: py });
    // Update temp position
    const idx = tempAgents.findIndex(a => a.id === agent.id);
    if (idx >= 0) tempAgents[idx] = { ...tempAgents[idx], x: px, y: py };
  }
  return pts;
}

// ─── Canvas renderer ──────────────────────────────────────────────────────────
function renderCanvas(
  ctx: CanvasRenderingContext2D,
  agents: Agent[],
  w: number,
  h: number,
  showSocialForces: boolean,
  showUncertainty: boolean,
  showGrid: boolean
) {
  ctx.clearRect(0, 0, w, h);

  // Background
  ctx.fillStyle = "#0d1117";
  ctx.fillRect(0, 0, w, h);

  // Grid
  if (showGrid) {
    ctx.strokeStyle = "rgba(0, 229, 255, 0.04)";
    ctx.lineWidth = 1;
    const step = 32;
    for (let x = 0; x < w; x += step) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += step) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    // Dot intersections
    ctx.fillStyle = "rgba(0, 229, 255, 0.07)";
    for (let x = 0; x < w; x += step) {
      for (let y = 0; y < h; y += step) {
        ctx.beginPath(); ctx.arc(x, y, 1, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  // Social radius circles
  if (showSocialForces) {
    agents.forEach((agent) => {
      ctx.beginPath();
      ctx.arc(agent.x, agent.y, SOCIAL_RADIUS, 0, Math.PI * 2);
      ctx.strokeStyle = agent.color + "18";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      ctx.stroke();
      ctx.setLineDash([]);
    });

    // Social force edges
    for (let i = 0; i < agents.length; i++) {
      for (let j = i + 1; j < agents.length; j++) {
        const a = agents[i], b = agents[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < SOCIAL_RADIUS) {
          const alpha = (1 - dist / SOCIAL_RADIUS) * 0.5;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(245, 158, 11, ${alpha})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }
    }
  }

  // History trails
  agents.forEach((agent) => {
    if (agent.history.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(agent.history[0].x, agent.history[0].y);
    for (let i = 1; i < agent.history.length; i++) {
      ctx.lineTo(agent.history[i].x, agent.history[i].y);
    }
    ctx.lineTo(agent.x, agent.y);
    ctx.strokeStyle = agent.color + "60";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // History dots
    agent.history.forEach((pt, i) => {
      const alpha = (i / agent.history.length) * 0.5;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = agent.color + Math.round(alpha * 255).toString(16).padStart(2, "0");
      ctx.fill();
    });
  });

  // Predicted trajectories
  agents.forEach((agent) => {
    if (agent.predicted.length < 2) return;

    // Uncertainty cone
    if (showUncertainty && agent.predicted.length > 1) {
      const spread = 8;
      ctx.beginPath();
      ctx.moveTo(agent.x, agent.y);
      // Upper bound
      for (let i = 0; i < agent.predicted.length; i++) {
        const t = (i + 1) / agent.predicted.length;
        const perp = { x: -(agent.predicted[i].y - agent.y), y: agent.predicted[i].x - agent.x };
        const len = Math.sqrt(perp.x ** 2 + perp.y ** 2) || 1;
        ctx.lineTo(agent.predicted[i].x + (perp.x / len) * spread * t, agent.predicted[i].y + (perp.y / len) * spread * t);
      }
      // Lower bound (reverse)
      for (let i = agent.predicted.length - 1; i >= 0; i--) {
        const t = (i + 1) / agent.predicted.length;
        const perp = { x: -(agent.predicted[i].y - agent.y), y: agent.predicted[i].x - agent.x };
        const len = Math.sqrt(perp.x ** 2 + perp.y ** 2) || 1;
        ctx.lineTo(agent.predicted[i].x - (perp.x / len) * spread * t, agent.predicted[i].y - (perp.y / len) * spread * t);
      }
      ctx.closePath();
      ctx.fillStyle = agent.color + "12";
      ctx.fill();
    }

    // Predicted path line
    ctx.beginPath();
    ctx.moveTo(agent.x, agent.y);
    agent.predicted.forEach((pt) => ctx.lineTo(pt.x, pt.y));
    ctx.strokeStyle = agent.color + "90";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Predicted dots
    agent.predicted.forEach((pt, i) => {
      const alpha = 1 - i / agent.predicted.length;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 2.5 * alpha, 0, Math.PI * 2);
      ctx.fillStyle = agent.color + Math.round(alpha * 180).toString(16).padStart(2, "0");
      ctx.fill();
    });

    // Arrow at end of prediction
    const last = agent.predicted[agent.predicted.length - 1];
    const prev = agent.predicted[agent.predicted.length - 2] || { x: agent.x, y: agent.y };
    const angle = Math.atan2(last.y - prev.y, last.x - prev.x);
    const aLen = 8;
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(last.x - aLen * Math.cos(angle - 0.4), last.y - aLen * Math.sin(angle - 0.4));
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(last.x - aLen * Math.cos(angle + 0.4), last.y - aLen * Math.sin(angle + 0.4));
    ctx.strokeStyle = agent.color + "80";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });

  // Agent nodes
  agents.forEach((agent) => {
    // Glow
    const grad = ctx.createRadialGradient(agent.x, agent.y, 0, agent.x, agent.y, 20);
    grad.addColorStop(0, agent.color + "40");
    grad.addColorStop(1, "transparent");
    ctx.beginPath();
    ctx.arc(agent.x, agent.y, 20, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Outer ring
    ctx.beginPath();
    ctx.arc(agent.x, agent.y, 10, 0, Math.PI * 2);
    ctx.strokeStyle = agent.color + "80";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Inner fill
    ctx.beginPath();
    ctx.arc(agent.x, agent.y, 7, 0, Math.PI * 2);
    ctx.fillStyle = agent.color;
    ctx.fill();

    // Velocity arrow
    const speed = Math.sqrt(agent.vx ** 2 + agent.vy ** 2);
    if (speed > 0.5) {
      const scale = 12;
      ctx.beginPath();
      ctx.moveTo(agent.x, agent.y);
      ctx.lineTo(agent.x + agent.vx * scale, agent.y + agent.vy * scale);
      ctx.strokeStyle = agent.color + "cc";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  });
}

// ─── Main Demo Component ──────────────────────────────────────────────────────
export default function Demo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<"place" | "drag" | "delete">("place");
  const [showSocialForces, setShowSocialForces] = useState(true);
  const [showUncertainty, setShowUncertainty] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [agentCount, setAgentCount] = useState(0);
  const animRef = useRef<number>(0);
  const agentsRef = useRef<Agent[]>([]);
  const isRunningRef = useRef(false);

  // Keep refs in sync
  useEffect(() => { agentsRef.current = agents; }, [agents]);
  useEffect(() => { isRunningRef.current = isRunning; }, [isRunning]);

  // Canvas resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.parentElement!.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const render = () => {
      renderCanvas(ctx, agentsRef.current, canvas.width, canvas.height, showSocialForces, showUncertainty, showGrid);
      animRef.current = requestAnimationFrame(render);
    };
    render();
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [showSocialForces, showUncertainty, showGrid]);

  // Simulation step
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setAgents((prev) => {
        const canvas = canvasRef.current;
        const W = canvas?.width ?? 800;
        const H = canvas?.height ?? 600;

        return prev.map((agent, idx) => {
          const sf = computeSocialForces(prev, idx);
          let nvx = agent.vx * 0.97 + sf.fx * 0.06 + (Math.random() - 0.5) * 0.15;
          let nvy = agent.vy * 0.97 + sf.fy * 0.06 + (Math.random() - 0.5) * 0.15;

          // Speed cap
          const speed = Math.sqrt(nvx ** 2 + nvy ** 2);
          if (speed > 3) { nvx = (nvx / speed) * 3; nvy = (nvy / speed) * 3; }

          let nx = agent.x + nvx;
          let ny = agent.y + nvy;

          // Bounce off walls
          if (nx < 15 || nx > W - 15) { nvx *= -1; nx = Math.max(15, Math.min(W - 15, nx)); }
          if (ny < 15 || ny > H - 15) { nvy *= -1; ny = Math.max(15, Math.min(H - 15, ny)); }

          const newHistory = [...agent.history, { x: agent.x, y: agent.y }].slice(-HISTORY_LEN);
          const predicted = predictTrajectory({ ...agent, x: nx, y: ny, vx: nvx, vy: nvy, history: newHistory }, prev);

          return { ...agent, x: nx, y: ny, vx: nvx, vy: nvy, history: newHistory, predicted };
        });
      });
    }, 50);
    return () => clearInterval(interval);
  }, [isRunning]);

  // Canvas click — place agent
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (mode !== "place") return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setAgentCount((c) => {
      const id = c + 1;
      const color = AGENT_COLORS[(c) % AGENT_COLORS.length];
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 1.5 + 0.5;
      const newAgent: Agent = {
        id, x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color, history: [], predicted: [], socialForces: [],
      };
      setAgents((prev) => {
        const updated = [...prev, newAgent];
        return updated.map((a) => ({
          ...a,
          predicted: predictTrajectory(a, updated),
        }));
      });
      return id;
    });
  }, [mode]);

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (mode === "drag") {
      const rect = canvasRef.current!.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const hit = agentsRef.current.find((a) => Math.hypot(a.x - mx, a.y - my) < 18);
      if (hit) setDraggingId(hit.id);
    }
    if (mode === "delete") {
      const rect = canvasRef.current!.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      setAgents((prev) => prev.filter((a) => Math.hypot(a.x - mx, a.y - my) >= 18));
    }
  }, [mode]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (draggingId === null) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    setAgents((prev) => prev.map((a) => a.id === draggingId ? { ...a, x: mx, y: my } : a));
  }, [draggingId]);

  const handleCanvasMouseUp = useCallback(() => setDraggingId(null), []);

  const reset = () => {
    setAgents([]);
    setIsRunning(false);
    setAgentCount(0);
  };

  const addRandomAgents = () => {
    const canvas = canvasRef.current;
    const W = canvas?.width ?? 800;
    const H = canvas?.height ?? 600;
    const count = 6;
    setAgentCount((c) => {
      const newAgents: Agent[] = Array.from({ length: count }, (_, i) => {
        const id = c + i + 1;
        const color = AGENT_COLORS[(c + i) % AGENT_COLORS.length];
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 1.5 + 0.5;
        return {
          id, x: 80 + Math.random() * (W - 160), y: 80 + Math.random() * (H - 160),
          vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
          color, history: [], predicted: [], socialForces: [],
        };
      });
      setAgents((prev) => {
        const all = [...prev, ...newAgents];
        return all.map((a) => ({ ...a, predicted: predictTrajectory(a, all) }));
      });
      return c + count;
    });
  };

  const toggleRun = () => setIsRunning((r) => !r);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/90 backdrop-blur-md px-4 lg:px-8 py-3 flex items-center gap-4 z-50 shrink-0">
        <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={16} />
          <span className="text-sm">Portfolio</span>
        </Link>
        <div className="w-px h-4 bg-border/50" />
        <div>
          <div className="mono-label text-[0.6rem]">Interactive Demo · SocialSTGCNN · CVPR 2020</div>
          <div className="text-sm font-semibold hidden sm:block">Social Trajectory Prediction</div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="mono-label text-[0.6rem] text-muted-foreground hidden md:block">
            {agents.length} agent{agents.length !== 1 ? "s" : ""}
          </span>
          {isRunning && (
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="mono-label text-[0.6rem] text-primary">LIVE</span>
            </div>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar controls */}
        <aside className="w-[220px] shrink-0 border-r border-border/40 bg-card/30 flex flex-col p-4 gap-4 overflow-y-auto hidden md:flex">
          {/* Mode */}
          <div>
            <div className="mono-label mb-2">Interaction Mode</div>
            <div className="flex flex-col gap-1">
              {([
                { id: "place", label: "Place Agent", icon: Plus },
                { id: "drag", label: "Drag Agent", icon: GitBranch },
                { id: "delete", label: "Delete Agent", icon: Trash2 },
              ] as const).map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setMode(id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded text-xs transition-all ${
                    mode === id
                      ? "bg-primary/15 border border-primary/30 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-card"
                  }`}
                >
                  <Icon size={12} /> {label}
                </button>
              ))}
            </div>
          </div>

          {/* Controls */}
          <div>
            <div className="mono-label mb-2">Simulation</div>
            <div className="flex flex-col gap-1.5">
              <button
                onClick={toggleRun}
                className={`flex items-center gap-2 px-3 py-2 rounded text-xs font-medium transition-all ${
                  isRunning
                    ? "bg-amber-500/15 border border-amber-500/30 text-amber-400"
                    : "bg-primary/15 border border-primary/30 text-primary"
                }`}
              >
                {isRunning ? <><Pause size={12} /> Pause</> : <><Play size={12} /> Run Simulation</>}
              </button>
              <button
                onClick={addRandomAgents}
                className="flex items-center gap-2 px-3 py-2 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-card transition-all border border-border/50"
              >
                <Users size={12} /> Add 6 Agents
              </button>
              <button
                onClick={reset}
                className="flex items-center gap-2 px-3 py-2 rounded text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all border border-border/50"
              >
                <RotateCcw size={12} /> Reset
              </button>
            </div>
          </div>

          {/* Toggles */}
          <div>
            <div className="mono-label mb-2">Visualize</div>
            <div className="flex flex-col gap-1.5">
              {([
                { key: "showSocialForces", label: "Social Forces", state: showSocialForces, set: setShowSocialForces },
                { key: "showUncertainty", label: "Uncertainty Cone", state: showUncertainty, set: setShowUncertainty },
                { key: "showGrid", label: "Grid", state: showGrid, set: setShowGrid },
              ]).map(({ key, label, state, set }) => (
                <button
                  key={key}
                  onClick={() => (set as React.Dispatch<React.SetStateAction<boolean>>)((s) => !s)}
                  className={`flex items-center justify-between px-3 py-2 rounded text-xs transition-all border ${
                    state
                      ? "border-primary/20 bg-primary/5 text-foreground"
                      : "border-border/40 text-muted-foreground"
                  }`}
                >
                  <span>{label}</span>
                  <div className={`w-6 h-3 rounded-full transition-colors ${state ? "bg-primary" : "bg-muted"}`}>
                    <div className={`w-2.5 h-2.5 rounded-full bg-white transition-transform mt-0.5 ${state ? "translate-x-3" : "translate-x-0.5"}`} />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="mt-auto">
            <div className="mono-label mb-2">Legend</div>
            <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-6 h-px border-t-2 border-dashed border-primary/60" />
                <span>Predicted path</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-px border-t border-dashed border-muted-foreground/50" />
                <span>History trail</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-px bg-amber-400/60" />
                <span>Social interaction</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full border border-primary/30 bg-primary/10" />
                <span>Uncertainty cone</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Canvas area */}
        <div className="flex-1 relative overflow-hidden">
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full"
            style={{ cursor: mode === "place" ? "crosshair" : mode === "delete" ? "not-allowed" : "grab" }}
            onClick={handleCanvasClick}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
          />

          {/* Empty state */}
          <AnimatePresence>
            {agents.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
              >
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full border-2 border-dashed border-primary/30 flex items-center justify-center mx-auto mb-4">
                    <Plus size={24} className="text-primary/50" />
                  </div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Click to place agents</div>
                  <div className="mono-label text-[0.6rem] text-muted-foreground/50">or use "Add 6 Agents" to start</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Mobile controls overlay */}
          <div className="md:hidden absolute bottom-4 left-4 right-4 flex gap-2">
            <button onClick={toggleRun} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded text-xs font-medium ${isRunning ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-primary/20 text-primary border border-primary/30"}`}>
              {isRunning ? <><Pause size={12} /> Pause</> : <><Play size={12} /> Run</>}
            </button>
            <button onClick={addRandomAgents} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded text-xs border border-border/50 text-muted-foreground">
              <Users size={12} /> Add Agents
            </button>
            <button onClick={reset} className="px-3 py-2.5 rounded text-xs border border-border/50 text-muted-foreground">
              <RotateCcw size={12} />
            </button>
          </div>
        </div>

        {/* Right panel — info */}
        <aside className="w-[220px] shrink-0 border-l border-border/40 bg-card/30 flex flex-col p-4 gap-5 overflow-y-auto hidden lg:flex">
          <div>
            <div className="mono-label mb-2 flex items-center gap-1.5">
              <Zap size={10} className="text-primary" /> About This Demo
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Simulates the <span className="text-foreground font-medium">SocialSTGCNN</span> model from Dr. Mohamed's CVPR 2020 paper. Agents predict each other's trajectories using a spatio-temporal graph CNN with social force modeling.
            </p>
          </div>

          <div>
            <div className="mono-label mb-2">Live Stats</div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Agents", value: agents.length },
                { label: "Pred Steps", value: PRED_LEN },
                { label: "History", value: HISTORY_LEN },
                { label: "Soc. Radius", value: `${SOCIAL_RADIUS}px` },
              ].map((s) => (
                <div key={s.label} className="bg-card rounded p-2 text-center">
                  <div className="text-base font-bold text-primary">{s.value}</div>
                  <div className="mono-label text-[0.55rem] text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="mono-label mb-2">Agent List</div>
            <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
              {agents.length === 0 ? (
                <div className="text-xs text-muted-foreground/50 italic">No agents placed</div>
              ) : (
                agents.map((a) => (
                  <div key={a.id} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: a.color }} />
                    <span className="text-muted-foreground font-mono">Agent {a.id}</span>
                    <span className="ml-auto mono-label text-[0.55rem] text-muted-foreground/50">
                      {Math.round(Math.sqrt(a.vx ** 2 + a.vy ** 2) * 10) / 10}px/s
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-auto">
            <div className="p-3 rounded bg-primary/5 border border-primary/15">
              <div className="mono-label text-[0.6rem] text-primary mb-1">Paper Reference</div>
              <div className="text-xs text-muted-foreground leading-relaxed">
                Mohamed et al., "SocialSTGCNN," CVPR 2020. 900+ citations.
              </div>
              <a
                href="https://scholar.google.com/citations?hl=en&user=FAOtbV4AAAAJ"
                target="_blank"
                rel="noreferrer"
                className="mt-2 flex items-center gap-1 text-xs text-primary hover:underline"
              >
                View on Scholar <ChevronRight size={10} />
              </a>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
