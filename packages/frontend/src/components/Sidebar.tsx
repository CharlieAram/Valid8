import { Link, useParams } from "react-router-dom";
import type { WorkflowView } from "@valid8/shared";

const STATUS_COLOR: Record<string, string> = {
  completed: "bg-green-500",
  failed: "bg-red-500",
  waiting_for_input: "bg-amber-500",
  running: "bg-blue-500",
};

export default function Sidebar({ workflows }: { workflows: WorkflowView[] }) {
  const { id } = useParams();

  return (
    <aside className="w-56 shrink-0 bg-gray-50 border-r border-gray-200 flex flex-col h-screen">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <Link to="/" className="text-sm font-bold text-gray-900 tracking-tight">
          Valid8
        </Link>
        <Link
          to="/new"
          className="w-7 h-7 flex items-center justify-center rounded-md bg-gray-900 text-white text-sm hover:bg-gray-700 transition-colors"
        >
          +
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-2 px-2">
          History
        </div>
        <div className="space-y-0.5">
          {workflows.map((w) => (
            <Link
              key={w.id}
              to={`/workflow/${w.id}`}
              className={`block px-3 py-2 rounded-md text-sm truncate transition-colors ${
                w.id === id
                  ? "bg-gray-200 text-gray-900 font-medium"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_COLOR[w.status] ?? "bg-gray-300"}`}
                />
                <span className="truncate">{w.ideaText.slice(0, 50)}</span>
              </div>
            </Link>
          ))}
          {workflows.length === 0 && (
            <div className="text-xs text-gray-400 px-3 py-6 text-center">No workflows yet</div>
          )}
        </div>
      </div>
    </aside>
  );
}
