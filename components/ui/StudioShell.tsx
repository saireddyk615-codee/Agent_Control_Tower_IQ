import type { ReactNode } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StudioWorkspace } from "@/components/ui/StudioWorkspace";

export function StudioShell({
  eyebrow,
  title,
  description,
  steps,
  currentStep,
  left,
  right,
}: {
  eyebrow: string;
  title: string;
  description: string;
  steps: string[];
  currentStep: number;
  left: ReactNode;
  right: ReactNode;
}) {
  return (
    <div className="w-full min-w-0 overflow-x-hidden">
      <PageHeader description={description} eyebrow={eyebrow} title={title} />
      <ol className="mb-6 flex flex-wrap gap-2" aria-label="Workflow status">
        {steps.map((step, index) => (
          <li
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
              index < currentStep
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : index === currentStep
                  ? "border-blue-200 bg-blue-50 text-blue-700"
                  : "border-slate-200 bg-white text-slate-500"
            }`}
            key={step}
          >
            {index < currentStep ? "✓ " : `${index + 1}. `}
            {step}
          </li>
        ))}
      </ol>
      <StudioWorkspace left={left} right={right} />
    </div>
  );
}
