import type { TaskStatus } from "@valid8/shared";
import type { ContactPipeline } from "../mock.ts";

const STAGE_STYLE: Record<TaskStatus, string> = {
  completed: "bg-green-500",
  running: "bg-blue-500 animate-pulse",
  ready: "bg-gray-300",
  pending: "bg-gray-300",
  waiting_for_input: "bg-amber-500",
  failed: "bg-red-500",
};

const STAGE_TEXT: Record<TaskStatus, string> = {
  completed: "text-gray-700",
  running: "text-blue-600",
  ready: "text-gray-400",
  pending: "text-gray-400",
  waiting_for_input: "text-amber-600",
  failed: "text-red-600",
};

function Stage({ status, label }: { status: TaskStatus; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-2 h-2 rounded-full shrink-0 ${STAGE_STYLE[status]}`} />
      <span className={`text-xs whitespace-nowrap ${STAGE_TEXT[status]}`}>{label}</span>
    </div>
  );
}

function Initials({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);
  return (
    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600 shrink-0">
      {initials}
    </div>
  );
}

export default function OutreachPanel({ contacts }: { contacts: ContactPipeline[] }) {
  return (
    <div className="border border-gray-200 rounded-lg flex flex-col overflow-hidden h-full">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Outreach</h3>
        <span className="text-xs text-gray-400">{contacts.length} contacts</span>
      </div>
      <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
        {contacts.map((c) => (
          <div key={c.contact.id} className="px-4 py-3 flex items-center gap-3">
            <Initials name={c.contact.name} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">{c.contact.name}</div>
              <div className="text-xs text-gray-400 truncate">
                {c.contact.role}, {c.contact.company}
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Stage status={c.email} label="Email" />
              <span className="text-gray-300 text-[10px]">&rarr;</span>
              <Stage status={c.phone} label="Phone" />
              <span className="text-gray-300 text-[10px]">&rarr;</span>
              {c.paid ? (
                <span className="text-xs font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                  Paid!
                </span>
              ) : (
                <Stage status="pending" label="Paid" />
              )}
            </div>
          </div>
        ))}
        {contacts.length === 0 && (
          <div className="px-4 py-12 text-center text-xs text-gray-400">
            Discovering contacts...
          </div>
        )}
      </div>
    </div>
  );
}
