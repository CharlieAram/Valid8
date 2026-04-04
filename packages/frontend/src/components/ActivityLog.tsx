/** Scrollable activity lines for async operations (user-visible + pairs with console.info). */
export default function ActivityLog({ lines, title = "Activity" }: { lines: string[]; title?: string }) {
  if (lines.length === 0) return null;
  return (
    <div className="w-full max-w-md rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-left">
      <div className="text-[10px] font-medium uppercase tracking-wider text-gray-400 mb-2">{title}</div>
      <ul className="font-mono text-xs text-gray-600 space-y-1 max-h-48 overflow-y-auto">
        {lines.map((line, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-gray-300 shrink-0 select-none">{i + 1}.</span>
            <span className="break-words">{line}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
