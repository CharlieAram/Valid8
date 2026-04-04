import type { MarketResearchOutput, TaskStatus } from "@valid8/shared";

interface Props {
  research: MarketResearchOutput | null;
  status: TaskStatus;
}

export default function MarketResearchPanel({ research, status }: Props) {
  return (
    <div className="border border-gray-200 rounded-lg flex flex-col overflow-hidden h-full">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-900">Market Research</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {status === "completed" && research ? (
          <ResearchContent research={research} />
        ) : status === "running" ? (
          <div className="text-sm text-gray-400 animate-pulse py-8 text-center">
            Researching market...
          </div>
        ) : status === "failed" ? (
          <div className="text-sm text-red-500 py-8 text-center">Research failed</div>
        ) : (
          <div className="text-sm text-gray-300 py-8 text-center">Waiting to start...</div>
        )}
      </div>
    </div>
  );
}

function ResearchContent({ research }: { research: MarketResearchOutput }) {
  return (
    <div className="space-y-3 text-xs">
      <p className="text-gray-700 text-sm leading-relaxed">{research.overview}</p>
      <div className="text-gray-500 font-medium">{research.marketSize}</div>

      {research.competitors.length > 0 && (
        <div>
          <div className="font-medium text-gray-500 mb-1">Competitors</div>
          <div className="space-y-1">
            {research.competitors.map((c, i) => (
              <div key={i} className="flex gap-1.5">
                <span className="font-medium text-gray-800">{c.name}</span>
                <span className="text-gray-300">&mdash;</span>
                <span className="text-gray-500">{c.strengths}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {research.opportunities.length > 0 && (
        <div>
          <div className="font-medium text-gray-500 mb-1">Opportunities</div>
          <ul className="text-gray-600 space-y-0.5 list-disc pl-3">
            {research.opportunities.map((o, i) => (
              <li key={i}>{o}</li>
            ))}
          </ul>
        </div>
      )}

      {research.risks.length > 0 && (
        <div>
          <div className="font-medium text-gray-500 mb-1">Risks</div>
          <ul className="text-gray-600 space-y-0.5 list-disc pl-3">
            {research.risks.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
