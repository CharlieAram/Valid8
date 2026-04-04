import type { TaskStatus } from "@valid8/shared";

interface Props {
  url: string | null;
  html: string | null;
  status: TaskStatus;
}

function normalizePageUrl(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith("/http://") || url.startsWith("/https://")) return url.slice(1);
  return url;
}

function isHostedUrl(url: string | null): boolean {
  const u = normalizePageUrl(url);
  return !!u && u.startsWith("http") && !u.includes("placeholder");
}

function openHtmlInNewTab(html: string): void {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const blobUrl = URL.createObjectURL(blob);
  window.open(blobUrl, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
}

export default function WebsitePreview({ url, html, status }: Props) {
  const pageUrl = normalizePageUrl(url);
  const hosted = isHostedUrl(url);
  const hasPreview = hosted || !!html;

  function handlePopout() {
    if (hosted && pageUrl) {
      window.open(pageUrl, "_blank", "noopener,noreferrer");
    } else if (html) {
      openHtmlInNewTab(html);
    }
  }

  return (
    <div className="rounded-xl border border-neutral-200 flex flex-col overflow-hidden h-full bg-white">
      <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between">
        <div className="min-w-0">
          <h3 className="text-[13px] font-semibold text-neutral-900">Landing page</h3>
          {hasPreview && (
            <p className="text-[10px] text-neutral-400 mt-0.5">
              {hosted ? "Hosted on InsForge" : "Local preview"}
            </p>
          )}
        </div>
        {hasPreview && (
          <button
            type="button"
            onClick={handlePopout}
            className="text-[11px] text-neutral-500 hover:text-neutral-800 transition-colors"
          >
            Open &nearr;
          </button>
        )}
      </div>
      <div className="flex-1 bg-neutral-50 flex items-center justify-center min-h-0">
        {hosted ? (
          <iframe
            src={pageUrl!}
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
          <div className="text-[13px] text-neutral-400 animate-pulse">Generating page...</div>
        ) : status === "failed" ? (
          <div className="text-[13px] text-red-500">Generation failed</div>
        ) : (
          <div className="text-[13px] text-neutral-300">Waiting to start...</div>
        )}
      </div>
    </div>
  );
}
