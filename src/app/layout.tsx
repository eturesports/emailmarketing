import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Eture Mailer",
    template: "%s · Eture Mailer",
  },
  description:
    "Plataforma de email marketing de Eture Esports: campañas personalizadas enviadas desde Gmail (Google Workspace).",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#070b12",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
