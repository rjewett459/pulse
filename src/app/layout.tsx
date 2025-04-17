import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VoiceMate Pulse Generator",
  description: "A demo app from ChatSites™.",
  icons: [
    { rel: "icon", url: "/vm_favicon.ico" },
    { rel: "icon", type: "image/svg+xml", url: "/voicemate.svg" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}

