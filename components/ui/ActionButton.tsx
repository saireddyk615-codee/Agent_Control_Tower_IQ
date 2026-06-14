"use client";

import { useRef } from "react";

export function ActionButton({
  label,
  loadingLabel = "Working...",
  isLoading = false,
  disabled = false,
  onClick,
  variant = "primary",
}: {
  label: string;
  loadingLabel?: string;
  isLoading?: boolean;
  disabled?: boolean;
  onClick?: () => void | Promise<void>;
  variant?: "primary" | "secondary" | "danger";
}) {
  const clickActive = useRef(false);
  const styles = {
    primary: "border-blue-600 bg-blue-600 text-white shadow-sm hover:bg-blue-500",
    secondary: "border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50",
    danger: "border-red-600 bg-red-600 text-white shadow-sm hover:bg-red-500",
  };

  return (
    <button
      aria-busy={isLoading}
      className={`inline-flex h-10 min-w-32 items-center justify-center rounded-lg border px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${styles[variant]}`}
      disabled={disabled || isLoading}
      onClick={async () => {
        if (clickActive.current || disabled || isLoading || !onClick) return;
        clickActive.current = true;
        try {
          await onClick();
        } finally {
          clickActive.current = false;
        }
      }}
      type="button"
    >
      {isLoading ? loadingLabel : label}
    </button>
  );
}
