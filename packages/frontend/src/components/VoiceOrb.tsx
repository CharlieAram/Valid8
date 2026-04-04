import { useRef, useEffect } from "react";

interface VoiceOrbProps {
  state: "idle" | "speaking" | "listening";
  analyserNode: AnalyserNode | null;
}

interface Particle {
  a: number;
  d: number;
  speed: number;
  size: number;
  opacity: number;
}

interface Ring {
  r: number;
  o: number;
  v: number;
}

const SIZE = 400;
const CX = SIZE / 2;
const CY = SIZE / 2;
const BASE_R = 75;

const COLORS = {
  speaking: { core: "129, 140, 248", mid: "139, 92, 246", edge: "168, 85, 247", glow: "rgba(139, 92, 246, 0.5)" },
  listening: { core: "34, 211, 238", mid: "6, 182, 212", edge: "8, 145, 178", glow: "rgba(34, 211, 238, 0.5)" },
  idle: { core: "129, 140, 248", mid: "99, 102, 241", edge: "79, 70, 229", glow: "rgba(99, 102, 241, 0.3)" },
};

export default function VoiceOrb({ state, analyserNode }: VoiceOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef(state);
  const analyserRef = useRef(analyserNode);
  stateRef.current = state;
  analyserRef.current = analyserNode;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = SIZE * dpr;
    canvas.height = SIZE * dpr;
    ctx.scale(dpr, dpr);

    const particles: Particle[] = Array.from({ length: 40 }, () => ({
      a: Math.random() * Math.PI * 2,
      d: BASE_R + 30 + Math.random() * 90,
      speed: 0.15 + Math.random() * 0.4,
      size: 1 + Math.random() * 2.5,
      opacity: 0.15 + Math.random() * 0.45,
    }));

    const rings: Ring[] = [];
    let ringTimer = 0;
    let time = 0;
    let animId = 0;
    let lastNow = performance.now();
    let freqData = new Uint8Array(128);

    function getAudioLevel(): number {
      const s = stateRef.current;
      const node = analyserRef.current;

      if (s === "speaking") {
        if (node) {
          if (freqData.length !== node.frequencyBinCount)
            freqData = new Uint8Array(node.frequencyBinCount);
          node.getByteFrequencyData(freqData);
          let sum = 0;
          for (let i = 0; i < freqData.length; i++) sum += freqData[i];
          const lvl = sum / (freqData.length * 255);
          if (lvl > 0.01) return lvl;
        }
        return (
          0.35 +
          Math.sin(time * 8) * 0.12 +
          Math.sin(time * 13) * 0.08 +
          Math.random() * 0.04
        );
      }
      if (s === "listening") return 0.15 + Math.sin(time * 3) * 0.08;
      return 0.05 + Math.sin(time * 1.5) * 0.03;
    }

    function drawBlob(t: number, al: number) {
      const s = stateRef.current;
      const c = COLORS[s];
      const dist = s === "idle" ? 0.25 : 0.5 + al * 0.5;
      const extra = al * 18;
      const pts = 180;

      ctx.beginPath();
      for (let i = 0; i <= pts; i++) {
        const angle = (i / pts) * Math.PI * 2;
        const n =
          Math.sin(angle * 3 + t * 1.8) * 10 * dist +
          Math.sin(angle * 5 + t * 2.5) * 6 * dist +
          Math.sin(angle * 7 + t * 1.2) * 4 * (0.3 + al * 0.7) +
          Math.sin(angle * 11 + t * 3.5) * 2.5 * al;
        const r = BASE_R + n + extra;
        const x = CX + Math.cos(angle) * r;
        const y = CY + Math.sin(angle) * r;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.closePath();

      const alphaCore = s === "idle" ? 0.5 : 0.9;
      const alphaMid = s === "idle" ? 0.35 : 0.65;
      const alphaEdge = s === "idle" ? 0.15 : 0.25;

      const grad = ctx.createRadialGradient(CX, CY, 0, CX, CY, BASE_R + 50);
      grad.addColorStop(0, `rgba(${c.core}, ${alphaCore})`);
      grad.addColorStop(0.5, `rgba(${c.mid}, ${alphaMid})`);
      grad.addColorStop(1, `rgba(${c.edge}, ${alphaEdge})`);

      ctx.fillStyle = grad;
      ctx.shadowColor = c.glow;
      ctx.shadowBlur = 40 + al * 70;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.shadowColor = "transparent";

      const hl = ctx.createRadialGradient(
        CX - BASE_R * 0.3,
        CY - BASE_R * 0.3,
        0,
        CX,
        CY,
        BASE_R * 0.8,
      );
      hl.addColorStop(0, "rgba(255, 255, 255, 0.18)");
      hl.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = hl;
      ctx.fill();
    }

    function drawFreqBars(_t: number, al: number) {
      if (stateRef.current !== "speaking" || al < 0.05) return;
      const count = 48;
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const idx = Math.floor((i / count) * freqData.length);
        const val = (freqData[idx] ?? 0) / 255;
        const len = val * 50;
        if (len < 2) continue;

        const x1 = CX + Math.cos(angle) * (BASE_R + 22);
        const y1 = CY + Math.sin(angle) * (BASE_R + 22);
        const x2 = CX + Math.cos(angle) * (BASE_R + 22 + len);
        const y2 = CY + Math.sin(angle) * (BASE_R + 22 + len);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = `rgba(167, 139, 250, ${0.2 + val * 0.5})`;
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.stroke();
      }
    }

    function drawRings(dt: number, al: number) {
      const s = stateRef.current;
      ringTimer += dt;
      const rate = s === "speaking" ? 0.25 : s === "listening" ? 0.5 : 1.2;
      if (ringTimer > rate) {
        ringTimer = 0;
        rings.push({
          r: BASE_R + 10,
          o: s === "idle" ? 0.08 : 0.2 + al * 0.15,
          v: 35 + al * 25,
        });
      }

      for (let i = rings.length - 1; i >= 0; i--) {
        const ring = rings[i];
        ring.r += ring.v * dt;
        ring.o -= 0.18 * dt;
        if (ring.o <= 0) {
          rings.splice(i, 1);
          continue;
        }

        const col =
          s === "listening" ? "34, 211, 238" : "139, 92, 246";
        ctx.beginPath();
        ctx.arc(CX, CY, ring.r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${col}, ${ring.o})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    function drawParticles(t: number, al: number) {
      const s = stateRef.current;
      const col =
        s === "listening"
          ? "34, 211, 238"
          : s === "speaking"
            ? "167, 139, 250"
            : "148, 163, 184";

      for (const p of particles) {
        p.a += p.speed * 0.008 * (1 + al * 2);
        const wobble = Math.sin(t * 2 + p.a * 3) * 6;
        const d = p.d + wobble + al * 15;
        const x = CX + Math.cos(p.a) * d;
        const y = CY + Math.sin(p.a) * d;

        ctx.beginPath();
        ctx.arc(x, y, p.size * (0.7 + al * 0.6), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${col}, ${p.opacity * (0.4 + al * 0.6)})`;
        ctx.fill();
      }
    }

    function frame(now: number) {
      const dt = Math.min((now - lastNow) / 1000, 0.1);
      lastNow = now;
      time += dt;

      const al = getAudioLevel();
      ctx.clearRect(0, 0, SIZE, SIZE);

      drawRings(dt, al);
      drawFreqBars(time, al);
      drawBlob(time, al);
      drawParticles(time, al);

      animId = requestAnimationFrame(frame);
    }

    animId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(animId);
  }, []);

  return <canvas ref={canvasRef} style={{ width: SIZE, height: SIZE }} />;
}
