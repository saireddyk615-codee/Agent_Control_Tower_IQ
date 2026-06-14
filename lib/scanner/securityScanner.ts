import { scanMarketLanguageCode } from "@/lib/scanner/marketLanguageScanner";

export function scanCode(code: string) {
  return scanMarketLanguageCode({ code });
}
