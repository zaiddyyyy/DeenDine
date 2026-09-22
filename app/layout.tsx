import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Halaly — Find halal food with confidence",
  description:
    "Discover halal and Zabiha restaurants across Chicago and its suburbs, with a live map, your location, and clear certification and menu-level details.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
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
