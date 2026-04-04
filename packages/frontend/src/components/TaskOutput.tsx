import type { TaskType, MarketResearchOutput, AssumptionOutput, PersonaOutput, ContactOutput } from "@valid8/shared";

export default function TaskOutput({ type, output }: { type: TaskType; output: unknown }) {
  switch (type) {
    case "market_research":
      return <MarketResearch data={output as MarketResearchOutput} />;
    case "assumption_generation":
      return <Assumptions data={output as AssumptionOutput} />;
    case "persona_identification":
      return <Personas data={output as PersonaOutput} />;
    case "contact_discovery":
      return <Contacts data={output as ContactOutput} />;
    case "base_landing_page": {
      const d = output as { url: string };
      return (
        <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:text-blue-800 break-all">
          {d.url}
        </a>
      );
    }
    default:
      return (
        <pre className="text-xs text-gray-500 overflow-x-auto whitespace-pre-wrap">
          {JSON.stringify(output, null, 2)}
        </pre>
      );
  }
}

function MarketResearch({ data }: { data: MarketResearchOutput }) {
  return (
    <div className="text-sm space-y-3">
      <p className="text-gray-700">{data.overview}</p>
      <div className="text-xs text-gray-500">Market size: {data.marketSize}</div>

      {data.competitors.length > 0 && (
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-gray-400">
              <th className="pb-1 font-medium">Competitor</th>
              <th className="pb-1 font-medium">Strengths</th>
              <th className="pb-1 font-medium">Weaknesses</th>
            </tr>
          </thead>
          <tbody>
            {data.competitors.map((c, i) => (
              <tr key={i} className="border-t border-gray-100 text-gray-600 align-top">
                <td className="py-1 pr-3 font-medium text-gray-800">{c.name}</td>
                <td className="py-1 pr-3">{c.strengths}</td>
                <td className="py-1">{c.weaknesses}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {data.opportunities.length > 0 && (
        <div>
          <div className="text-xs text-gray-400 mb-1">Opportunities</div>
          <ul className="text-xs text-gray-600 list-disc pl-4 space-y-0.5">
            {data.opportunities.map((o, i) => <li key={i}>{o}</li>)}
          </ul>
        </div>
      )}

      {data.risks.length > 0 && (
        <div>
          <div className="text-xs text-gray-400 mb-1">Risks</div>
          <ul className="text-xs text-gray-600 list-disc pl-4 space-y-0.5">
            {data.risks.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

function Assumptions({ data }: { data: AssumptionOutput }) {
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="text-left text-gray-400">
          <th className="pb-1 font-medium">Assumption</th>
          <th className="pb-1 font-medium w-20">Category</th>
          <th className="pb-1 font-medium w-16">Risk</th>
        </tr>
      </thead>
      <tbody>
        {data.assumptions.map((a) => (
          <tr key={a.id} className="border-t border-gray-100 text-gray-600 align-top">
            <td className="py-1 pr-3">{a.statement}</td>
            <td className="py-1 pr-3">{a.category}</td>
            <td className="py-1">{a.criticality}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Personas({ data }: { data: PersonaOutput }) {
  return (
    <div className="space-y-2">
      {data.personas.map((p) => (
        <div key={p.id} className="text-xs">
          <div className="font-medium text-gray-800">{p.title}</div>
          <div className="text-gray-500 mt-0.5">{p.description}</div>
          {p.jobsToBeDone.length > 0 && (
            <div className="text-gray-400 mt-0.5">
              Jobs: {p.jobsToBeDone.join("; ")}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function Contacts({ data }: { data: ContactOutput }) {
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="text-left text-gray-400">
          <th className="pb-1 font-medium">Name</th>
          <th className="pb-1 font-medium">Role</th>
          <th className="pb-1 font-medium">Company</th>
        </tr>
      </thead>
      <tbody>
        {data.contacts.map((c) => (
          <tr key={c.id} className="border-t border-gray-100 text-gray-600">
            <td className="py-1 pr-3">{c.name}</td>
            <td className="py-1 pr-3">{c.role}</td>
            <td className="py-1">{c.company}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
