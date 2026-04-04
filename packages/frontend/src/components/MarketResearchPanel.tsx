import { useState } from "react";
import type { MarketResearchOutput, TaskStatus } from "@valid8/shared";

interface Props {
  research: MarketResearchOutput | null;
  status: TaskStatus;
}

export default function MarketResearchPanel({ research, status }: Props) {
  return (
    <div className="rounded-xl border border-neutral-200 flex flex-col overflow-hidden h-full bg-white">
      <div className="px-4 py-3 border-b border-neutral-100">
        <h3 className="text-[13px] font-semibold text-neutral-900">Market research</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {status === "completed" && research ? (
          <ResearchContent research={research} />
        ) : status === "running" ? (
          <Loading>Researching market...</Loading>
        ) : status === "failed" ? (
          <Empty className="text-red-500">Research failed</Empty>
        ) : (
          <Loading>Waiting to start...</Loading>
        )}
      </div>
    </div>
  );
}

function Loading({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-[13px] text-neutral-400 animate-pulse">{children}</div>
    </div>
  );
}

function Empty({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex items-center justify-center h-full text-[13px] ${className ?? "text-neutral-300"}`}>
      {children}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 w-full text-left mb-1.5 group"
      >
        <span className="text-[10px] text-neutral-400 group-hover:text-neutral-600 transition-colors">
          {open ? "\u25BE" : "\u25B8"}
        </span>
        <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
          {title}
        </span>
      </button>
      {open && children}
    </div>
  );
}

function ResearchContent({ research }: { research: MarketResearchOutput }) {
  return (
    <div className="space-y-4">
      <p className="text-[13px] text-neutral-700 leading-relaxed">{research.overview}</p>

      <div className="inline-block bg-neutral-50 rounded-lg px-3 py-1.5 text-[12px] font-medium text-neutral-600">
        {research.marketSize}
      </div>

      {research.competitors.length > 0 && (
        <Section title="Competitors">
          <div className="space-y-2">
            {research.competitors.map((c, i) => (
              <div key={i} className="text-[12px]">
                <span className="font-medium text-neutral-800">{c.name}</span>
                <span className="text-neutral-400 mx-1.5">/</span>
                <span className="text-neutral-500">{c.description}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {research.opportunities.length > 0 && (
        <Section title="Opportunities">
          <ul className="space-y-1">
            {research.opportunities.map((o, i) => (
              <li key={i} className="text-[12px] text-neutral-600 leading-relaxed pl-3 relative before:content-[''] before:absolute before:left-0 before:top-[7px] before:w-1 before:h-1 before:rounded-full before:bg-emerald-400">
                {o}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {research.risks.length > 0 && (
        <Section title="Risks">
          <ul className="space-y-1">
            {research.risks.map((r, i) => (
              <li key={i} className="text-[12px] text-neutral-600 leading-relaxed pl-3 relative before:content-[''] before:absolute before:left-0 before:top-[7px] before:w-1 before:h-1 before:rounded-full before:bg-red-400">
                {r}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
