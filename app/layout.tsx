import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LIWEN CHEN | A Little Creative World",
  description:
    "A personal journal and creative playground by Liwen Chen — everyday wonders, little experiments, and inspiration.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
