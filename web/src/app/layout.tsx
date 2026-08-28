import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "GB Web Emulator",
  description: "A Game Boy emulator running in the browser via WebAssembly.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-neutral-950 text-neutral-100">
        {children}
      </body>
    </html>
  );
}
