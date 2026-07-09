import { MarginExtractionViewer } from "@/components/margin/MarginExtractionViewer";
import { formatFileSize } from "@/lib/margin/format";
import type {
  MarginExtractionResult,
  MarginUploadDebug,
  MarginUploadFileInfo,
} from "@/types/margin";

type MarginUploadResultProps = {
  status: "error" | "success";
  message: string;
  file?: MarginUploadFileInfo;
  extraction?: MarginExtractionResult;
  debug?: MarginUploadDebug;
};

export function MarginUploadResult({
  status,
  message,
  file,
  extraction,
  debug,
}: MarginUploadResultProps) {
  if (status === "error") {
    return (
      <div
        className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        role="alert"
      >
        <p>{message}</p>
        {file ? (
          <p className="mt-1 text-xs text-red-600">
            {file.name} · {formatFileSize(file.size)}
          </p>
        ) : null}
        {process.env.NODE_ENV === "development" && debug?.stage ? (
          <p className="mt-2 rounded border border-red-200 bg-white/60 px-2 py-1 text-xs text-red-700">
            Debug seguro: {debug.stage} ({debug.status}) - {debug.detail}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-950">
        <p>{message}</p>
        {file ? (
          <p className="text-xs text-blue-900">
            {file.name} · {formatFileSize(file.size)}
          </p>
        ) : null}
      </div>

      {extraction ? <MarginExtractionViewer extraction={extraction} /> : null}
    </div>
  );
}
