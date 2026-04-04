import { useState } from "react";
import type { ContactOutput, TaskStatus } from "@valid8/shared";
import type { ContactPipeline, CallInsight } from "../mock.ts";
import ContactGraph from "./ContactGraph.tsx";

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

function Initials({ name }: { name: string }) {
  const s = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);
  return (
    <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-[11px] font-medium text-neutral-500 shrink-0">
      {s}
    </div>
  );
}

function ListIcon({ active }: { active: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className={active ? "text-neutral-900" : "text-neutral-400"}>
      <rect x="1" y="2" width="12" height="1.5" rx="0.5" fill="currentColor" />
      <rect x="1" y="6.25" width="12" height="1.5" rx="0.5" fill="currentColor" />
      <rect x="1" y="10.5" width="12" height="1.5" rx="0.5" fill="currentColor" />
    </svg>
  );
}

function GraphIcon({ active }: { active: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className={active ? "text-neutral-900" : "text-neutral-400"}>
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
    <div className="border border-neutral-200 flex flex-col overflow-hidden h-full bg-white">
      <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between">
        <h3 className="text-[13px] font-semibold text-neutral-900">Outreach</h3>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-neutral-400">{contacts.length} contacts</span>
          <div className="flex border border-neutral-200 overflow-hidden">
            <button
              type="button"
              onClick={() => setView("list")}
              className={`px-1.5 py-1 cursor-pointer ${view === "list" ? "bg-white" : "bg-neutral-50 hover:bg-neutral-100"}`}
              title="List view"
            >
              <ListIcon active={view === "list"} />
            </button>
            <button
              type="button"
              onClick={() => setView("graph")}
              className={`px-1.5 py-1 cursor-pointer border-l border-neutral-200 ${view === "graph" ? "bg-white" : "bg-neutral-50 hover:bg-neutral-100"}`}
              title="Graph view"
            >
              <GraphIcon active={view === "graph"} />
            </button>
          </div>
        </div>
      </div>

      {view === "list" ? (
        <div className="flex-1 overflow-y-auto divide-y divide-neutral-100">
          {contacts.map((c) => (
            <div key={c.contact.id} className="px-4 py-3 flex items-center gap-3">
              <Initials name={c.contact.name} />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-neutral-900 truncate">{c.contact.name}</div>
                <div className="text-[11px] text-neutral-500 truncate">
                  {c.contact.role}
                  <span className="text-neutral-400"> · {c.contact.company}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <LinkedInLink contact={c.contact} />
                  <a
                    href={`/call/${c.contact.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-neutral-500 hover:text-neutral-800 underline"
                  >
                    AI interview
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <StatusDot status={c.email} label="Email" />
                <span className="text-neutral-300 text-[10px]">&rarr;</span>
                <StatusDot status={c.phone} label="Phone" />
                <span className="text-neutral-300 text-[10px]">&rarr;</span>
                {c.paid ? (
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5">
                    Paid
                  </span>
                ) : (
                  <StatusDot status="pending" label="Paid" />
                )}
              </div>
            </div>
          ))}
          {contacts.length === 0 && (
            <div className="px-4 py-12 text-center text-[11px] text-neutral-400">Discovering contacts...</div>
          )}
        </div>
      ) : (
        <div className="flex-1 min-h-0 p-1">
          {contacts.length > 0 ? (
            <ContactGraph contacts={contacts} callInsights={callInsights} />
          ) : (
            <div className="flex items-center justify-center h-full text-[11px] text-neutral-400">Discovering contacts...</div>
          )}
        </div>
      )}
    </div>
  );
}
