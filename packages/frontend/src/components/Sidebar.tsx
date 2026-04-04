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

  async function handleDelete(e: React.MouseEvent, wid: string) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this workflow?")) return;
    try {
      await deleteWorkflow(wid);
      if (id === wid) navigate("/new");
    } catch {
      alert("Failed to delete workflow");
    }
  }

  return (
    <aside className="w-56 shrink-0 bg-neutral-950 flex flex-col h-screen select-none">
      <div className="h-12 px-4 flex items-center justify-between">
        <Link to="/" className="text-[13px] font-semibold text-white tracking-tight">
          Valid<span className="text-emerald-400">8</span>
        </Link>
        <Link
          to="/new"
          className="text-[11px] text-neutral-500 hover:text-white transition-colors"
        >
          + New
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {workflows.map((w) => {
          const active = w.id === id;
          const s = STATUS[w.status];
          return (
            <Link
              key={w.id}
              to={`/workflow/${w.id}`}
              className={`block px-2.5 py-2 text-[12px] transition-colors group ${
                active
                  ? "bg-white/10 text-white"
                  : "text-neutral-500 hover:bg-white/5 hover:text-neutral-300"
              }`}
            >
              <div className="flex items-start gap-2">
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 mt-[5px] ${s?.color ?? "bg-neutral-700"}`}
                />
                <div className="flex-1 min-w-0">
                  <div className="truncate leading-tight">{w.ideaText.slice(0, 55)}</div>
                  <div className="text-[10px] text-neutral-600 mt-px">
                    {w.progress.completed}/{w.progress.total}
                  </div>
                </div>
                <button
                  onClick={(e) => handleDelete(e, w.id)}
                  className="text-neutral-700 hover:text-red-400 opacity-0 group-hover:opacity-100 text-[10px] shrink-0 transition-opacity"
                >
                  &times;
                </button>
              </div>
            </Link>
          );
        })}
        {workflows.length === 0 && (
          <div className="text-[11px] text-neutral-600 px-3 py-8 text-center">
            No workflows yet
          </div>
        )}
      </div>
    </aside>
  );
}
