import type { Metadata, Viewport } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Web DMG",
  description: "A Game Boy emulator written in C++, running in the browser via WebAssembly.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

// Runs before first paint (inline + synchronous, ahead of any React code) so
// a saved light-theme preference applies immediately - otherwise the page
// would flash the dark theme first and then switch.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    if (localStorage.getItem("theme") === "light") {
      document.documentElement.setAttribute("data-theme", "light");
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-svh bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
