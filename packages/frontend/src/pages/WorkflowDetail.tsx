import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { getWorkflow, confirmIdea } from "../api.ts";
import type { WorkflowView, IdeaConfirmationOutput } from "@valid8/shared";
import { STATUS_LABEL } from "../constants.ts";
import IdeaConfirmation from "../components/IdeaConfirmation.tsx";
import TaskList from "../components/TaskList.tsx";
import ResultsView from "../components/ResultsView.tsx";

export default function WorkflowDetail() {
  const { id } = useParams<{ id: string }>();
  const [workflow, setWorkflow] = useState<WorkflowView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(null);

  function refresh() {
    if (!id) return;
    getWorkflow(id).then(setWorkflow).catch((e) => setError(e.message));
  }

  useEffect(() => {
    if (!id) return;
    getWorkflow(id)
      .then(setWorkflow)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    intervalRef.current = setInterval(() => getWorkflow(id).then(setWorkflow), 3000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [id]);

  // Stop polling on terminal states
  useEffect(() => {
    if (workflow && (workflow.status === "completed" || workflow.status === "failed")) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [workflow?.status]);

  if (loading) return <div className="text-sm text-gray-400 py-12">Loading...</div>;
  if (error || !workflow) {
    return (
      <div className="text-sm py-12">
        <span className="text-red-600">{error ?? "Not found"}</span>
        {" \u2014 "}
        <Link to="/" className="text-blue-600">back</Link>
      </div>
    );
  }

  const confirmTask = workflow.tasks.find((t) => t.type === "idea_confirmation");
  const resultsTask = workflow.tasks.find(
    (t) => t.type === "results_summary" && t.status === "completed"
  );
  const needsConfirmation = confirmTask?.status === "waiting_for_input";

  return (
    <div>
      <Link to="/" className="text-sm text-gray-400 hover:text-gray-600">
        &larr; Workflows
      </Link>

      <div className="mt-3 mb-6">
        <p className="text-sm text-gray-900 leading-relaxed">{workflow.ideaText}</p>
        <div className="mt-1 text-xs text-gray-400">
          {STATUS_LABEL[workflow.status] ?? workflow.status}
          {" \u00b7 "}
          {workflow.progress.completed}/{workflow.progress.total} tasks
          {" \u00b7 "}
          {new Date(workflow.createdAt).toLocaleString()}
        </div>
      </div>

      {needsConfirmation && confirmTask?.output != null && (
        <IdeaConfirmation
          confirmation={confirmTask.output as IdeaConfirmationOutput}
          onConfirm={async () => { if (id) { await confirmIdea(id, true); refresh(); } }}
          onRevise={async (r) => { if (id) { await confirmIdea(id, false, r); refresh(); } }}
        />
      )}

      {!needsConfirmation && (
        <>
          <TaskList tasks={workflow.tasks} />
          {resultsTask?.output != null && (
            <ResultsView output={resultsTask.output} />
          )}
        </>
      )}
    </div>
  );
}
