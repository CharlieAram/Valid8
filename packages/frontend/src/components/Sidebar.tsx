import { Link, useParams, useNavigate } from "react-router-dom";
import type { WorkflowView } from "@valid8/shared";
import { deleteWorkflow } from "../api.ts";

const STATUS: Record<string, { color: string; label: string }> = {
  completed: { color: "bg-emerald-500", label: "Done" },
  failed: { color: "bg-red-500", label: "Failed" },
  waiting_for_input: { color: "bg-amber-400", label: "Waiting" },
  running: { color: "bg-blue-500", label: "Running" },
};

export default function Sidebar({ workflows }: { workflows: WorkflowView[] }) {
  const { id } = useParams();
  const navigate = useNavigate();

  async function handleDelete(e: React.MouseEvent, workflowId: string) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this workflow?")) return;
    try {
      await deleteWorkflow(workflowId);
      if (id === workflowId) navigate("/new");
    } catch {
      alert("Failed to delete workflow");
    }
  }

  return (
    <aside className="w-64 shrink-0 bg-neutral-950 flex flex-col h-screen">
      <div className="px-5 py-5 flex items-center justify-between">
        <Link to="/" className="text-[15px] font-semibold text-white tracking-tight">
          Valid<span className="text-emerald-400">8</span>
        </Link>
        <Link
          to="/new"
          className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/10 text-white/70 text-sm hover:bg-white/20 hover:text-white transition-all"
        >
          +
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3">
        <div className="text-[10px] font-medium text-neutral-500 uppercase tracking-widest mb-2 px-2">
          Workflows
        </div>
        <div className="space-y-px">
          {workflows.map((w) => {
            const active = w.id === id;
            const s = STATUS[w.status];
            return (
              <Link
                key={w.id}
                to={`/workflow/${w.id}`}
                className={`block px-3 py-2.5 rounded-lg text-[13px] transition-all group relative ${
                  active
                    ? "bg-white/10 text-white"
                    : "text-neutral-400 hover:bg-white/5 hover:text-neutral-200"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${s?.color ?? "bg-neutral-600"}`}
                    title={s?.label ?? w.status}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="truncate leading-snug">{w.ideaText.slice(0, 60)}</div>
                    <div className="text-[10px] text-neutral-600 mt-0.5">
                      {w.progress.completed}/{w.progress.total} tasks
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, w.id)}
                    className="text-neutral-700 hover:text-red-400 opacity-0 group-hover:opacity-100 text-xs shrink-0 mt-0.5 transition-all"
                  >
                    &times;
                  </button>
                </div>
              </Link>
            );
          })}
          {workflows.length === 0 && (
            <div className="text-[11px] text-neutral-600 px-3 py-8 text-center leading-relaxed">
              No workflows yet.<br />Create one to get started.
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
