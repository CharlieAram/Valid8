import { Link, useParams, useNavigate } from "react-router-dom";
import type { WorkflowView } from "@valid8/shared";
import { deleteWorkflow } from "../api.ts";

function statusLabel(s: string): string {
  if (s === "completed") return "Done";
  if (s === "failed") return "Failed";
  if (s === "waiting_for_input") return "Needs input";
  if (s === "running") return "Running";
  return s;
}

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
    <aside className="w-60 shrink-0 border-r border-neutral-200 flex flex-col h-screen bg-white">
      <div className="h-14 px-4 flex items-center justify-between border-b border-neutral-100">
        <Link to="/" className="text-sm font-bold text-neutral-900 tracking-tight">
          Valid8
        </Link>
        <Link
          to="/new"
          className="text-xs text-neutral-400 hover:text-neutral-900 transition-colors"
        >
          + New
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {workflows.map((w) => {
          const active = w.id === id;
          const done = w.status === "completed";
          const failed = w.status === "failed";
          return (
            <Link
              key={w.id}
              to={`/workflow/${w.id}`}
              className={`block mx-2 px-3 py-2 rounded-md transition-colors group ${
                active ? "bg-neutral-100" : "hover:bg-neutral-50"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className={`text-sm truncate ${active ? "font-medium text-neutral-900" : "text-neutral-700"}`}>
                    {w.ideaText.slice(0, 55)}
                  </div>
                  <div className={`text-[11px] mt-0.5 ${
                    done ? "text-emerald-600" : failed ? "text-red-500" : "text-neutral-400"
                  }`}>
                    {statusLabel(w.status)} &middot; {w.progress.completed}/{w.progress.total}
                  </div>
                </div>
                <button
                  onClick={(e) => handleDelete(e, w.id)}
                  className="text-neutral-300 hover:text-red-500 opacity-0 group-hover:opacity-100 text-xs mt-1 transition-opacity"
                >
                  &times;
                </button>
              </div>
            </Link>
          );
        })}
        {workflows.length === 0 && (
          <div className="px-5 py-12 text-center text-sm text-neutral-400">
            No workflows yet
          </div>
        )}
      </div>
    </aside>
  );
}
