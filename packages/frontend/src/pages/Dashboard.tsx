import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listWorkflows } from "../api.ts";
import type { WorkflowView } from "@valid8/shared";
import { STATUS_LABEL } from "../constants.ts";

export default function Dashboard() {
  const [workflows, setWorkflows] = useState<WorkflowView[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listWorkflows()
      .then(setWorkflows)
      .finally(() => setLoading(false));
    const id = setInterval(() => listWorkflows().then(setWorkflows), 5000);
    return () => clearInterval(id);
  }, []);

  if (loading) return <div className="text-sm text-gray-400 py-12">Loading...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-base font-semibold">Workflows</h1>
        <Link
          to="/new"
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          New workflow
        </Link>
      </div>

      {workflows.length === 0 ? (
        <div className="text-sm text-gray-500 py-16 text-center">
          No workflows yet.{" "}
          <Link to="/new" className="text-blue-600 hover:text-blue-800">
            Create one
          </Link>
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500 text-xs">
              <th className="pb-2 font-medium">Idea</th>
              <th className="pb-2 font-medium w-24">Status</th>
              <th className="pb-2 font-medium w-24 text-right">Progress</th>
              <th className="pb-2 font-medium w-28 text-right">Created</th>
            </tr>
          </thead>
          <tbody>
            {workflows.map((w) => (
              <tr key={w.id} className="border-b border-gray-100">
                <td className="py-2.5 pr-4">
                  <Link
                    to={`/workflow/${w.id}`}
                    className="text-gray-900 hover:text-blue-600 line-clamp-1"
                  >
                    {w.ideaText}
                  </Link>
                </td>
                <td className="py-2.5 text-gray-500">
                  {STATUS_LABEL[w.status] ?? w.status}
                </td>
                <td className="py-2.5 text-right text-gray-400 tabular-nums">
                  {w.progress.completed}/{w.progress.total}
                </td>
                <td className="py-2.5 text-right text-gray-400">
                  {new Date(w.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
