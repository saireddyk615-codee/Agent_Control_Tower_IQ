"use client";

import { useEffect, useState } from "react";
import { ActionButton } from "@/components/ui/ActionButton";

export function CopyButton({ value }: { value: string }) {
  const [status, setStatus] = useState<"Copy" | "Copied" | "Copy failed">("Copy");

  useEffect(() => {
    if (status === "Copy") return;
    const timer = window.setTimeout(() => setStatus("Copy"), 1500);
    return () => window.clearTimeout(timer);
  }, [status]);

  return (
    <ActionButton
      disabled={!value}
      label={status}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setStatus("Copied");
        } catch (error) {
          console.error("Copy failed:", error);
          setStatus("Copy failed");
        }
      }}
      variant="secondary"
    />
  );
}
