"use client";

import { ActionButton } from "@/components/ui/ActionButton";

export function DownloadButton({
  filename,
  content,
  label = "Download",
}: {
  filename: string;
  content: string;
  label?: string;
}) {
  return (
    <ActionButton
      disabled={!content}
      label={label}
      onClick={() => {
        if (!content) return;
        const url = URL.createObjectURL(new Blob([content], { type: "text/plain;charset=utf-8" }));
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 0);
      }}
      variant="secondary"
    />
  );
}
