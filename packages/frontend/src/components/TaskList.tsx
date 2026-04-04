import { useState } from "react";
import type { TaskView, TaskType } from "@valid8/shared";
import TaskOutput from "./TaskOutput.tsx";

const LABELS: Record<TaskType, string> = {
  idea_confirmation: "Idea confirmation",
  market_research: "Market research",
  base_landing_page: "Landing page",
  assumption_generation: "Assumptions",
  persona_identification: "Personas",
  contact_discovery: "Contact discovery",
  personalize_page: "Personalize page",
  send_email: "Email",
  voice_call: "Voice call",
  schedule_human_call: "Schedule call",
  results_summary: "Results",
  pivot_proposals: "Pivots",
};

const STATUS_DOT: Record<string, string> = {
  completed: "bg-green-500",
  running: "bg-blue-500",
  failed: "bg-red-500",
  waiting_for_input: "bg-yellow-500",
  pending: "bg-gray-300",
  ready: "bg-gray-300",
};

export default function TaskList({ tasks }: { tasks: TaskView[] }) {
  const global = tasks.filter((t) => !t.scope && t.type !== "idea_confirmation");
  const scoped = tasks.filter((t) => t.scope);

  // Group scoped by contact
  const byContact = new Map<string, TaskView[]>();
  for (const t of scoped) {
    const key = t.scope?.contactId ?? "?";
    const list = byContact.get(key) ?? [];
    list.push(t);
    byContact.set(key, list);
  }

  return (
    <div className="mb-6">
      <div className="text-xs font-medium text-gray-500 mb-2">Tasks</div>

      <div className="border border-gray-200 rounded divide-y divide-gray-100">
        {global.map((t) => (
          <TaskRow key={t.id} task={t} />
        ))}

        {byContact.size > 0 && (
          <div className="px-3 py-2">
            <div className="text-xs text-gray-400 mb-2">
              Outreach ({byContact.size} contacts)
            </div>
            {Array.from(byContact.entries()).map(([contactId, contactTasks]) => (
              <ContactRow key={contactId} contactId={contactId} tasks={contactTasks} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TaskRow({ task }: { task: TaskView }) {
  const [open, setOpen] = useState(false);
  const hasOutput = task.output != null;

  return (
    <>
      <button
        onClick={() => hasOutput && setOpen(!open)}
        disabled={!hasOutput}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-gray-50 disabled:hover:bg-transparent"
      >
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[task.status] ?? "bg-gray-300"}`} />
        <span className="flex-1 text-gray-800">{LABELS[task.type] ?? task.type}</span>
        <span className="text-xs text-gray-400">{task.status === "completed" ? "" : task.status}</span>
        {hasOutput && (
          <span className="text-xs text-gray-400">{open ? "\u2212" : "+"}</span>
        )}
      </button>
      {open && task.output != null && (
        <div className="px-3 pb-3 pt-0">
          <TaskOutput type={task.type} output={task.output} />
        </div>
      )}
    </>
  );
}

function ContactRow({ contactId, tasks }: { contactId: string; tasks: TaskView[] }) {
  const order: TaskType[] = ["personalize_page", "send_email", "voice_call", "schedule_human_call"];
  const sorted = [...tasks].sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type));

  return (
    <div className="flex items-center gap-2 py-1 text-xs">
      <span className="text-gray-400 font-mono w-16 shrink-0">{contactId.slice(0, 8)}</span>
      <div className="flex gap-1">
        {sorted.map((t) => (
          <span
            key={t.id}
            className={`w-2 h-2 rounded-full ${STATUS_DOT[t.status] ?? "bg-gray-300"}`}
            title={`${LABELS[t.type]}: ${t.status}`}
          />
        ))}
      </div>
    </div>
  );
}
