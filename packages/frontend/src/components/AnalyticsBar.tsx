export interface Analytics {
  emailsSent: number;
  replies: number;
  replyRate: number;
  pageVisits: number;
  paid: number;
  paidRate: number;
  confidence: number;
  conclusion: string;
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`px-4 py-2.5 ${accent ? "bg-green-50/50" : ""}`}>
      <div
        className={`text-lg font-bold tabular-nums ${accent ? "text-green-700" : "text-gray-900"}`}
      >
        {value}
      </div>
      <div className="text-[11px] text-gray-400">{label}</div>
    </div>
  );
}

export default function AnalyticsBar({ analytics }: { analytics: Analytics }) {
  return (
    <div className="border border-gray-200 rounded-lg bg-white shrink-0">
      <div className="px-4 py-2 border-b border-gray-200 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-900">Analytics</h3>
      </div>
      <div className="flex items-stretch divide-x divide-gray-100">
        <Stat label="Paid" value={`${analytics.paidRate}%`} accent />
        <Stat label="Reply Rate" value={`${analytics.replyRate}%`} />
        <Stat label="Confidence" value={`${analytics.confidence}%`} accent={analytics.confidence > 70} />
        <Stat label="Page Visits" value={String(analytics.pageVisits)} />
        <Stat label="Emails Sent" value={String(analytics.emailsSent)} />
        <div className="flex-1 px-4 py-2.5 min-w-0">
          <div className="text-[11px] text-gray-400 mb-0.5">Conclusion</div>
          <div className="text-xs text-gray-600 leading-relaxed line-clamp-2">
            {analytics.conclusion}
          </div>
        </div>
      </div>
    </div>
  );
}
