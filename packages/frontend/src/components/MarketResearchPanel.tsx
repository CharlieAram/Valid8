import type { MarketResearchOutput, TaskStatus } from "@valid8/shared";

interface Props {
  research: MarketResearchOutput | null;
  status: TaskStatus;
}

export default function MarketResearchPanel({ research, status }: Props) {
  return (
    <div className="border border-neutral-200 flex flex-col overflow-hidden h-full bg-white">
      <div className="px-3 py-2 border-b border-neutral-200">
        <h3 className="text-xs font-semibold text-neutral-900 uppercase tracking-wide">Market research</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {status === "completed" && research ? (
          <ResearchContent research={research} />
        ) : status === "running" ? (
          <div className="flex items-center justify-center h-full text-xs text-neutral-400 animate-pulse">
            Researching...
          </div>
        ) : status === "failed" ? (
          <div className="flex items-center justify-center h-full text-xs text-red-500">Failed</div>
        ) : (
          <div className="flex items-center justify-center h-full text-xs text-neutral-300">Waiting...</div>
        )}
      </div>
    </div>
  );
}

function ResearchContent({ research }: { research: MarketResearchOutput }) {
  return (
    <div className="space-y-3 text-[11px]">
      <p className="text-neutral-700 text-xs leading-relaxed">{research.overview}</p>
      <p className="text-neutral-500 font-medium text-[11px]">{research.marketSize}</p>

      {research.competitors.length > 0 && (
        <div>
          <h4 className="font-semibold text-neutral-500 mb-1 text-[10px] uppercase tracking-wide">Competitors</h4>
          <div className="space-y-1">
            {research.competitors.map((c, i) => (
              <div key={i}>
                <span className="font-medium text-neutral-800">{c.name}</span>
                <span className="text-neutral-300 mx-1">/</span>
                <span className="text-neutral-500">{c.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {research.opportunities.length > 0 && (
        <div>
          <h4 className="font-semibold text-neutral-500 mb-1 text-[10px] uppercase tracking-wide">Opportunities</h4>
          <ul className="space-y-0.5 text-neutral-600">
            {research.opportunities.map((o, i) => <li key={i}>&bull; {o}</li>)}
          </ul>
        </div>
      )}

      {research.risks.length > 0 && (
        <div>
          <h4 className="font-semibold text-neutral-500 mb-1 text-[10px] uppercase tracking-wide">Risks</h4>
          <ul className="space-y-0.5 text-neutral-600">
            {research.risks.map((r, i) => <li key={i}>&bull; {r}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
