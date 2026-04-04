import { useState, useMemo, useRef, useCallback, useLayoutEffect } from "react";
import type { ContactPipeline, CallInsight } from "../mock.ts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PipelineStage = "discovered" | "emailed" | "called" | "converted";

interface GraphNode {
  id: string;
  name: string;
  company: string;
  role: string;
  opportunitySize: number;
  solutionFit: number;
  stage: PipelineStage;
}

const STAGE_CONFIG: Record<PipelineStage, { color: string; glow: string; label: string }> = {
  discovered: { color: "#6b7280", glow: "rgba(107,114,128,0.5)", label: "Discovered" },
  emailed:    { color: "#3b82f6", glow: "rgba(59,130,246,0.5)",  label: "Email Sent" },
  called:     { color: "#f59e0b", glow: "rgba(245,158,11,0.5)",  label: "Called" },
  converted:  { color: "#10b981", glow: "rgba(16,185,129,0.5)",  label: "Converted" },
};

const STAGES: PipelineStage[] = ["discovered", "emailed", "called", "converted"];

// ---------------------------------------------------------------------------
// Data helpers
// ---------------------------------------------------------------------------

function getStage(c: ContactPipeline): PipelineStage {
  if (c.paid) return "converted";
  if (c.phone === "completed" || c.phone === "running") return "called";
  if (c.email === "completed" || c.email === "running") return "emailed";
  return "discovered";
}

function hashCode(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function buildGraphNodes(
  contacts: ContactPipeline[],
  callInsights: CallInsight[],
): GraphNode[] {
  const insightMap = new Map<string, CallInsight>();
  for (const insight of callInsights) {
    insightMap.set(insight.contactName, insight);
  }

  return contacts.map((c) => {
    const insight = insightMap.get(c.contact.name);
    let opportunitySize: number;
    let solutionFit: number;

    if (insight) {
      opportunitySize = insight.problemValueUsd
        ? Math.min(100, (insight.problemValueUsd / 250_000) * 100)
        : 20;
      solutionFit =
        (insight.hasProblem ? 40 : 0) +
        (insight.solutionReaction.positive ? 40 : 0) +
        (insight.willingToTalk ? 20 : 0);
    } else {
      const hash = hashCode(c.contact.id);
      opportunitySize = 20 + (hash % 55);
      solutionFit = 15 + ((hash >> 8) % 60);
    }

    return {
      id: c.contact.id,
      name: c.contact.name,
      company: c.contact.company,
      role: c.contact.role,
      opportunitySize,
      solutionFit,
      stage: getStage(c),
    };
  });
}

// ---------------------------------------------------------------------------
// Graph constants
// ---------------------------------------------------------------------------

const PAD = { top: 28, right: 24, bottom: 44, left: 56 };
const NODE_R = 7;
/** Minimum px between pointer and tooltip box so the cursor stays visible and clear of the panel */
const CURSOR_GAP = 22;
/** Approximate tooltip size for flip/flip (avoid covering the pointer) */
const TOOLTIP_W = 188;
const TOOLTIP_H = 118;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface Props {
  contacts: ContactPipeline[];
  callInsights: CallInsight[];
}

export default function ContactGraph({ contacts, callInsights }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [boxPx, setBoxPx] = useState({ w: 0, h: 0 });

  const nodes = useMemo(() => buildGraphNodes(contacts, callInsights), [contacts, callInsights]);

  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const measure = () => {
      const r = svg.getBoundingClientRect();
      setBoxPx({ w: r.width, h: r.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(svg);
    return () => ro.disconnect();
  }, []);

  const handleMouseEnter = useCallback(
    (node: GraphNode, e: React.MouseEvent<SVGCircleElement>) => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      setHovered(node.id);
      setTooltipPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    },
    [],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGCircleElement>) => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      setTooltipPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    },
    [],
  );

  const hoveredNode = nodes.find((n) => n.id === hovered);

  return (
    <div className="relative w-full h-full min-h-[200px] rounded-lg">
      {/* Inner clips the dark fill; outer stays overflow-visible so tooltips and cursor aren’t clipped */}
      <div className="absolute inset-0 rounded-lg overflow-hidden bg-[#0d1117]">
      <svg
        ref={svgRef}
        viewBox="0 0 500 400"
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full"
      >
        <defs>
          {STAGES.map((s) => (
            <filter key={s} id={`glow-${s}`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feFlood floodColor={STAGE_CONFIG[s].glow} result="color" />
              <feComposite in="color" in2="blur" operator="in" result="shadow" />
              <feMerge>
                <feMergeNode in="shadow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          ))}
        </defs>

        {/* Grid */}
        <GridLines />

        {/* Axis labels */}
        <text
          x={PAD.left + (500 - PAD.left - PAD.right) / 2}
          y={400 - 6}
          textAnchor="middle"
          fill="rgba(255,255,255,0.35)"
          fontSize="10"
          fontFamily="system-ui, sans-serif"
        >
          Solution Fit →
        </text>
        <text
          x={14}
          y={PAD.top + (400 - PAD.top - PAD.bottom) / 2}
          textAnchor="middle"
          fill="rgba(255,255,255,0.35)"
          fontSize="10"
          fontFamily="system-ui, sans-serif"
          transform={`rotate(-90, 14, ${PAD.top + (400 - PAD.top - PAD.bottom) / 2})`}
        >
          Opportunity Size →
        </text>

        {/* Nodes */}
        {nodes.map((node) => {
          const cx = PAD.left + (node.solutionFit / 100) * (500 - PAD.left - PAD.right);
          const cy = 400 - PAD.bottom - (node.opportunitySize / 100) * (400 - PAD.top - PAD.bottom);
          const cfg = STAGE_CONFIG[node.stage];
          const isHovered = hovered === node.id;

          return (
            <g key={node.id}>
              <circle
                cx={cx}
                cy={cy}
                r={isHovered ? NODE_R + 3 : NODE_R}
                fill={cfg.color}
                filter={`url(#glow-${node.stage})`}
                opacity={hovered && !isHovered ? 0.3 : 1}
                className="transition-all duration-150 cursor-pointer"
                onMouseEnter={(e) => handleMouseEnter(node, e)}
                onMouseMove={handleMouseMove}
                onMouseLeave={() => setHovered(null)}
              />
              {isHovered && (
                <text
                  x={cx}
                  y={cy - NODE_R - 6}
                  textAnchor="middle"
                  fill="white"
                  fontSize="9"
                  fontFamily="system-ui, sans-serif"
                  fontWeight="500"
                  pointerEvents="none"
                >
                  {node.name}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      </div>

      {/* Legend */}
      <div className="absolute top-2.5 right-3 flex flex-col gap-1.5 bg-[#161b22]/90 backdrop-blur-sm rounded-md px-2.5 py-2 border border-white/5">
        {STAGES.map((s) => (
          <div key={s} className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: STAGE_CONFIG[s].color, boxShadow: `0 0 4px ${STAGE_CONFIG[s].glow}` }}
            />
            <span className="text-[10px] text-gray-400 whitespace-nowrap">{STAGE_CONFIG[s].label}</span>
          </div>
        ))}
      </div>

      {/* Tooltip */}
      {hoveredNode && (
        <Tooltip node={hoveredNode} x={tooltipPos.x} y={tooltipPos.y} boxW={boxPx.w} boxH={boxPx.h} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Grid
// ---------------------------------------------------------------------------

function GridLines() {
  const w = 500 - PAD.left - PAD.right;
  const h = 400 - PAD.top - PAD.bottom;
  const ticks = [0, 25, 50, 75, 100];

  return (
    <g>
      {ticks.map((pct) => {
        const x = PAD.left + (pct / 100) * w;
        const y = 400 - PAD.bottom - (pct / 100) * h;
        return (
          <g key={pct}>
            {/* Vertical */}
            <line
              x1={x} y1={PAD.top} x2={x} y2={400 - PAD.bottom}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="1"
            />
            {/* Horizontal */}
            <line
              x1={PAD.left} y1={y} x2={500 - PAD.right} y2={y}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="1"
            />
            {/* X tick label */}
            <text
              x={x}
              y={400 - PAD.bottom + 14}
              textAnchor="middle"
              fill="rgba(255,255,255,0.2)"
              fontSize="8"
              fontFamily="system-ui, sans-serif"
            >
              {pct}
            </text>
            {/* Y tick label */}
            <text
              x={PAD.left - 8}
              y={y + 3}
              textAnchor="end"
              fill="rgba(255,255,255,0.2)"
              fontSize="8"
              fontFamily="system-ui, sans-serif"
            >
              {pct}
            </text>
          </g>
        );
      })}
      {/* Axis lines */}
      <line
        x1={PAD.left} y1={400 - PAD.bottom} x2={500 - PAD.right} y2={400 - PAD.bottom}
        stroke="rgba(255,255,255,0.12)"
        strokeWidth="1"
      />
      <line
        x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={400 - PAD.bottom}
        stroke="rgba(255,255,255,0.12)"
        strokeWidth="1"
      />
    </g>
  );
}

// ---------------------------------------------------------------------------
// Tooltip
// ---------------------------------------------------------------------------

function Tooltip({
  node,
  x,
  y,
  boxW,
  boxH,
}: {
  node: GraphNode;
  x: number;
  y: number;
  boxW: number;
  boxH: number;
}) {
  const cfg = STAGE_CONFIG[node.stage];
  const w = boxW > 0 ? boxW : 500;
  const h = boxH > 0 ? boxH : 400;

  // Keep the tooltip fully to one side of the pointer with CURSOR_GAP so the cursor stays visible
  const placeRight = x + TOOLTIP_W + CURSOR_GAP < w;
  const placeBelow = y + TOOLTIP_H + CURSOR_GAP < h;

  let left: number;
  let top: number;
  if (placeRight) {
    left = x + CURSOR_GAP;
  } else {
    left = x - TOOLTIP_W - CURSOR_GAP;
  }
  if (placeBelow) {
    top = y + CURSOR_GAP;
  } else {
    top = y - TOOLTIP_H - CURSOR_GAP;
  }

  left = Math.max(8, Math.min(left, w - TOOLTIP_W - 8));
  top = Math.max(8, Math.min(top, h - TOOLTIP_H - 8));

  return (
    <div
      className="absolute pointer-events-none z-10 bg-[#161b22] border border-white/10 rounded-lg px-3 py-2.5 shadow-xl min-w-[160px] max-w-[188px]"
      style={{ left, top }}
    >
      <div className="text-xs font-semibold text-white mb-1">{node.name}</div>
      <div className="text-[10px] text-gray-400 mb-2">
        {node.role} · {node.company}
      </div>
      <div className="flex items-center gap-1.5 mb-1">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.color }} />
        <span className="text-[10px] font-medium" style={{ color: cfg.color }}>
          {cfg.label}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px]">
        <span className="text-gray-500">Opportunity</span>
        <span className="text-gray-300 text-right tabular-nums">{Math.round(node.opportunitySize)}</span>
        <span className="text-gray-500">Solution Fit</span>
        <span className="text-gray-300 text-right tabular-nums">{Math.round(node.solutionFit)}</span>
      </div>
    </div>
  );
}
