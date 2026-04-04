import type { TaskStatus } from "@valid8/shared";

interface Props {
  url: string | null;
  html: string | null;
  status: TaskStatus;
}

function isHostedUrl(url: string | null): boolean {
  return !!url && url.startsWith("http") && !url.includes("placeholder");
}

function openHtmlInNewTab(html: string): void {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const blobUrl = URL.createObjectURL(blob);
  window.open(blobUrl, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
}

export default function WebsitePreview({ url, html, status }: Props) {
  const hosted = isHostedUrl(url);
  const hasPreview = hosted || !!html;

  function handlePopout() {
    if (hosted && url) {
      window.open(url, "_blank", "noopener,noreferrer");
    } else if (html) {
      openHtmlInNewTab(html);
    }
  }

  return (
    <div className="border border-gray-200 rounded-lg flex flex-col overflow-hidden h-full">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between gap-3 shrink-0">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-gray-900">Website Generated</h3>
          <p className="text-[11px] text-gray-500 mt-0.5 truncate">
            {hosted
              ? "Hosted on InsForge (public URL)"
              : hasPreview
                ? "Preview only — set INSFORGE_URL + INSFORGE_API_KEY to deploy"
                : status === "running"
                  ? "Generating…"
                  : ""}
          </p>
        </div>
        {hasPreview && (
          <button
            type="button"
            onClick={handlePopout}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            title="Open landing page in a new browser tab"
          >
            <span aria-hidden>↗</span>
            Open in new tab
          </button>
        )}
      </div>
      <div className="flex-1 bg-gray-50 flex items-center justify-center min-h-0">
        {hosted ? (
          <iframe
            src={url!}
            title="Landing page"
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin"
          />
        ) : html ? (
          <iframe
            srcDoc={html}
            title="Landing page preview"
            className="w-full h-full border-0"
            sandbox="allow-scripts"
          />
        ) : status === "running" ? (
          <div className="text-sm text-gray-400 animate-pulse">Generating landing page...</div>
        ) : status === "failed" ? (
          <div className="text-sm text-red-500">Generation failed</div>
        ) : (
          <div className="text-sm text-gray-300">Waiting to start...</div>
        )}
      </div>
    </div>
  );
}
