import type { Metadata, Viewport } from "next";
import "@fontsource-variable/onest";
import "./globals.css";

export const metadata: Metadata = {
  title: "VisioPro Assina",
  description: "Contratos online com assinatura eletrônica.",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = { themeColor: "#0a1628", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
