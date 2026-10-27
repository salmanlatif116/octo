import type { Metadata, Viewport } from "next";
import "./globals.css";
import ClientErrorReporter from "@/components/ClientErrorReporter";

export const metadata: Metadata = {
  title: "OCTO",
  description: "Pay your Octo bill online",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ClientErrorReporter />
        {children}
      </body>
    </html>
  );
}
