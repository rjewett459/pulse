import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VoiceMate Pulse Generator",
  description: "A demo app from OpenAI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`antialiased`}>{children}</body>
    </html>
  );
}
