import { useState } from "react";
import type { ContactOutput, TaskStatus } from "@valid8/shared";
import type { ContactPipeline, CallInsight } from "../mock.ts";
import ContactGraph from "./ContactGraph.tsx";

function LinkedInLine({ contact }: { contact: ContactOutput["contacts"][number] }) {
  const url = contact.linkedinUrl ?? contact.discovery?.linkedinUrl;
  if (!url) {
    return (
      <div className="mt-0.5 text-[10px] text-gray-400">No LinkedIn profile found</div>
    );
  }
  return (
    <div className="mt-0.5">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
      >
        LinkedIn
      </a>
    </div>
  );
}

const STAGE_STYLE: Record<TaskStatus, string> = {
  completed: "bg-green-500",
  running: "bg-blue-500 animate-pulse",
  ready: "bg-gray-300",
  pending: "bg-gray-300",
  waiting_for_input: "bg-amber-500",
  failed: "bg-red-500",
  skipped: "bg-gray-400",
};

const STAGE_TEXT: Record<TaskStatus, string> = {
  completed: "text-gray-700",
  running: "text-blue-600",
  ready: "text-gray-400",
  pending: "text-gray-400",
  waiting_for_input: "text-amber-600",
  failed: "text-red-600",
  skipped: "text-gray-400",
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

function ListIcon({ active }: { active: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className={active ? "text-gray-900" : "text-gray-400"}>
      <rect x="1" y="2" width="12" height="1.5" rx="0.5" fill="currentColor" />
      <rect x="1" y="6.25" width="12" height="1.5" rx="0.5" fill="currentColor" />
      <rect x="1" y="10.5" width="12" height="1.5" rx="0.5" fill="currentColor" />
    </svg>
  );
}

function GraphIcon({ active }: { active: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className={active ? "text-gray-900" : "text-gray-400"}>
      <circle cx="3" cy="10" r="1.5" fill="currentColor" />
      <circle cx="5.5" cy="5" r="1.5" fill="currentColor" />
      <circle cx="9" cy="8" r="1.5" fill="currentColor" />
      <circle cx="11" cy="3" r="1.5" fill="currentColor" />
    </svg>
  );
}

export default function OutreachPanel({
  contacts,
  callInsights = [],
}: {
  contacts: ContactPipeline[];
  callInsights?: CallInsight[];
}) {
  const [view, setView] = useState<"list" | "graph">("list");

  return (
    <div className="border border-gray-200 rounded-lg flex flex-col overflow-hidden h-full">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Outreach</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{contacts.length} contacts</span>
          <div className="flex border border-gray-200 rounded-md overflow-hidden">
            <button
              type="button"
              onClick={() => setView("list")}
              className={`px-1.5 py-1 cursor-pointer ${view === "list" ? "bg-white" : "bg-gray-50 hover:bg-gray-100"}`}
              title="List view"
            >
              <ListIcon active={view === "list"} />
            </button>
            <button
              type="button"
              onClick={() => setView("graph")}
              className={`px-1.5 py-1 cursor-pointer border-l border-gray-200 ${view === "graph" ? "bg-white" : "bg-gray-50 hover:bg-gray-100"}`}
              title="Graph view"
            >
              <GraphIcon active={view === "graph"} />
            </button>
          </div>
        </div>
      </div>

      {view === "list" ? (
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {contacts.map((c) => (
            <div key={c.contact.id} className="px-4 py-3 flex items-center gap-3">
              <Initials name={c.contact.name} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">{c.contact.name}</div>
                <div className="text-xs text-gray-500 truncate">
                  {c.contact.role}
                  <span className="text-gray-400"> · {c.contact.company}</span>
                </div>
              <LinkedInLine contact={c.contact} />
              <a
                href={`/call/${c.contact.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-0.5 text-xs text-indigo-500 hover:text-indigo-400 hover:underline"
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                </svg>
                AI interview
              </a>
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
      ) : (
        <div className="flex-1 min-h-0 p-1">
          {contacts.length > 0 ? (
            <ContactGraph contacts={contacts} callInsights={callInsights} />
          ) : (
            <div className="flex items-center justify-center h-full text-xs text-gray-400">
              Discovering contacts...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
