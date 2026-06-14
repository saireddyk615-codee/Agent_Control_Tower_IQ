import { ScanWorkspace } from "@/components/ScanWorkspace";
import { SafetyBanner } from "@/components/SafetyBanner";

export default function ScanPage() {
  return (
    <>
      <SafetyBanner />
      <ScanWorkspace />
    </>
  );
}
