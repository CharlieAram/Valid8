import type { TaskStatus } from "@valid8/shared";

interface Props {
  url: string | null;
  status: TaskStatus;
}

export default function WebsitePreview({ url, status }: Props) {
  const isPlaceholder = url?.includes("placeholder");

  return (
    <div className="border border-gray-200 rounded-lg flex flex-col overflow-hidden h-full">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Website Generated</h3>
        {url && !isPlaceholder && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            Open &nearr;
          </a>
        )}
      </div>
      <div className="flex-1 bg-gray-50 flex items-center justify-center">
        {status === "completed" && url && !isPlaceholder ? (
          <iframe
            src={url}
            title="Landing page preview"
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin"
          />
        ) : status === "completed" || isPlaceholder ? (
          <PlaceholderPage url={url} />
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

function PlaceholderPage({ url }: { url: string | null }) {
  return (
    <div className="p-6 text-center w-full">
      <div className="max-w-xs mx-auto border border-dashed border-gray-300 rounded-lg p-8 bg-white">
        <div className="text-base font-bold text-gray-800 mb-2">Your Landing Page</div>
        <div className="text-xs text-gray-400 mb-4">
          Preview appears here when Insforge is integrated
        </div>
        <div className="space-y-2">
          <div className="h-2 bg-gray-200 rounded w-3/4 mx-auto" />
          <div className="h-2 bg-gray-200 rounded w-1/2 mx-auto" />
          <div className="h-2 bg-gray-200 rounded w-2/3 mx-auto" />
          <div className="h-8 bg-gray-900 rounded w-1/2 mx-auto mt-4" />
        </div>
      </div>
      {url && <div className="text-[10px] text-gray-300 mt-3 break-all">{url}</div>}
    </div>
  );
}
