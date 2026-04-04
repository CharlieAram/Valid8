import type { ReactNode } from "react";

export type ActivityItem = {
  /** Short line shown to everyone */
  text: string;
  /** Visual emphasis */
  tone?: "default" | "success" | "error" | "muted";
};

type Props = {
  items: ActivityItem[];
  /** e.g. "What's happening" */
  title?: string;
  /** Optional footer (e.g. spinner hint) */
  footer?: ReactNode;
  /** Dark background pages (e.g. voice interview) */
  variant?: "light" | "dark";
};

const toneStylesLight: Record<NonNullable<ActivityItem["tone"]>, string> = {
  default: "text-neutral-700",
  success: "text-emerald-700",
  error: "text-red-600",
  muted: "text-neutral-400",
};

const toneStylesDark: Record<NonNullable<ActivityItem["tone"]>, string> = {
  default: "text-white/90",
  success: "text-emerald-400",
  error: "text-red-300",
  muted: "text-white/45",
};

/**
 * Human-readable progress list for async work (not raw HTTP or logs).
 */
export default function ActivityFeed({ items, title = "What's happening", footer, variant = "light" }: Props) {
  if (items.length === 0) return null;

  const isDark = variant === "dark";
  const toneStyles = isDark ? toneStylesDark : toneStylesLight;

  return (
    <div
      className={`w-full max-w-md rounded-xl px-4 py-3.5 text-left shadow-sm ${
        isDark
          ? "border border-white/10 bg-white/[0.06] backdrop-blur-sm"
          : "border border-neutral-200 bg-white"
      }`}
      role="status"
      aria-live="polite"
    >
      <div
        className={`text-[11px] font-semibold uppercase tracking-wide mb-3 ${
          isDark ? "text-white/40" : "text-neutral-400"
        }`}
      >
        {title}
      </div>
      <ul className="space-y-2.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-3 text-sm leading-snug">
            <span
              className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${isDark ? "bg-white/25" : "bg-neutral-300"}`}
              aria-hidden
            />
            <span className={toneStyles[item.tone ?? "default"]}>{item.text}</span>
          </li>
        ))}
      </ul>
      {footer && (
        <div
          className={`mt-3 pt-3 border-t text-xs ${isDark ? "border-white/10 text-white/45" : "border-neutral-100 text-neutral-500"}`}
        >
          {footer}
        </div>
      )}
    </div>
  );
}
