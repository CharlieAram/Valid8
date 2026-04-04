import type { ContactOutput, TaskStatus } from "@valid8/shared";
import type { ContactPipeline } from "../mock.ts";

const DOT: Record<TaskStatus, string> = {
  completed: "bg-emerald-500",
  running: "bg-blue-500 animate-pulse",
  ready: "bg-neutral-300",
  pending: "bg-neutral-300",
  waiting_for_input: "bg-amber-400",
  failed: "bg-red-500",
  skipped: "bg-neutral-300",
};

function StatusDot({ status, label }: { status: TaskStatus; label: string }) {
  return (
    <div className="flex items-center gap-1" title={`${label}: ${status}`}>
      <div className={`w-1.5 h-1.5 rounded-full ${DOT[status]}`} />
      <span className="text-[11px] text-neutral-500">{label}</span>
    </div>
  );
}

function LinkedInLink({ contact }: { contact: ContactOutput["contacts"][number] }) {
  const url = contact.linkedinUrl ?? contact.discovery?.linkedinUrl;
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[11px] text-blue-600 hover:text-blue-800 hover:underline"
    >
      LinkedIn
    </a>
  );
}

export default function OutreachPanel({ contacts }: { contacts: ContactPipeline[] }) {
  return (
    <div className="border border-neutral-200 flex flex-col overflow-hidden h-full bg-white">
      <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between">
        <h3 className="text-[13px] font-semibold text-neutral-900">Outreach pipeline</h3>
        <span className="text-[11px] text-neutral-400 tabular-nums">{contacts.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {contacts.map((c, i) => (
          <div
            key={c.contact.id}
            className={`px-4 py-3 flex items-center gap-3 ${
              i > 0 ? "border-t border-neutral-50" : ""
            }`}
          >
            <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-[11px] font-medium text-neutral-500 shrink-0">
              {c.contact.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium text-neutral-900 truncate">
                {c.contact.name}
              </div>
              <div className="text-[11px] text-neutral-500 truncate">
                {c.contact.role} at {c.contact.company}
              </div>
              <LinkedInLink contact={c.contact} />
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <StatusDot status={c.email} label="Email" />
              <StatusDot status={c.phone} label="Call" />
              {c.paid && (
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5">
                  Paid
                </span>
              )}
            </div>
          </div>
        ))}
        {contacts.length === 0 && (
          <div className="px-4 py-16 text-center">
            <div className="text-sm text-neutral-400">Discovering contacts...</div>
            <div className="text-[11px] text-neutral-300 mt-1">Searching for real people matching your target personas</div>
          </div>
        )}
      </div>
    </div>
  );
}
