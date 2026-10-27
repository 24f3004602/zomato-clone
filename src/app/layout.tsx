import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TableTrail | Food, made personal",
  description: "An independent food discovery and delivery marketplace.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
