import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Areeb Khalid — Building useful intelligence",
  description: "Software engineering, AI experiments, interactive products and creative technology by Areeb Khalid.",
  applicationName: "Areeb Khalid — Portfolio",
  openGraph: {
    images: [{ url: "/og.svg", width: 1200, height: 630, alt: "Areeb Khalid — Software Engineering × AI × Creative Technology" }],
    title: "Areeb Khalid — Building useful intelligence",
    description: "A living portfolio of software, AI, competitive agents and creative engineering.",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "Areeb Khalid — Portfolio", description: "Software engineering × AI × creative technology.", images: ["/og.svg"] },
  icons: { icon: "/dot-mark.svg" },
  robots: { index: true, follow: true }
};

export const viewport: Viewport = { themeColor: "#f5f36a", colorScheme: "light" };

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
