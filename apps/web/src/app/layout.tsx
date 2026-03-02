import type { Metadata } from "next";
import ThemeRegistry from "./theme-registry";

export const metadata: Metadata = {
  title: "WMS",
  description: "Lean WMS",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body>
        <ThemeRegistry>{children}</ThemeRegistry>
      </body>
    </html>
  );
}