import type { WorkflowView as WorkflowViewType } from "@valid8/shared";
import { friendlyTaskLine } from "../utils/friendlyMessages.ts";

/**
 * One plain-language line about what the backend is doing right now.
 */
export default function WorkflowLiveActivity({ workflow }: { workflow: WorkflowViewType }) {
  const failed = workflow.tasks.find((t) => t.status === "failed");
  const running = workflow.tasks.filter((t) => t.status === "running" || t.status === "ready");

  if (failed) {
    return (
      <div className="rounded-lg border border-red-100 bg-red-50/80 px-3 py-2 text-[13px] text-red-800 leading-snug">
        <span className="font-medium">We hit a snag</span>
        {" — "}
        the step “{friendlyTaskLine(failed.type)}” didn’t finish. Technical details are in your browser’s
        developer console if you need them.
      </div>
    );
  }

  if (running.length === 0) {
    return null;
  }

  const primary = running[0]!;
  const extra = running.length - 1;

  return (
    <div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-2 text-[13px] text-neutral-800 leading-snug">
      <span
        className="mt-1.5 h-2 w-2 shrink-0 animate-pulse rounded-full bg-blue-500"
        aria-hidden
      />
      <p>
        <span className="font-medium text-neutral-900">In progress: </span>
        {friendlyTaskLine(primary.type)}
        {extra > 0 ? (
          <span className="text-neutral-500"> — plus {extra} other task{extra > 1 ? "s" : ""} at the same time</span>
        ) : null}
      </p>
    </div>
  );
}
