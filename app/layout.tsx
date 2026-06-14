import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { PortalSessionProvider } from "@/components/providers/PortalSessionProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agent Control Tower IQ",
  description: "Safety operating system for AI agents",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html data-scroll-behavior="smooth" lang="en">
      <body>
        <PortalSessionProvider>
          <AppShell>{children}</AppShell>
        </PortalSessionProvider>
      </body>
    </html>
  );
}
