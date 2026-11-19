import type { Metadata, Viewport } from "next";
import "@fontsource-variable/space-grotesk";
import "@fontsource-variable/inter";
import "./globals.css";
import SmoothScroll from "@/components/SmoothScroll";
import Loader from "@/components/Loader";
import Cursor from "@/components/Cursor";
import Nav from "@/components/Nav";


export const metadata: Metadata = {
  title: "GLACY — Creating what I love",
  description: "GLACY is an independent video creator, vlogger and editor. Edits, vlogs, football and everything in between.",
  openGraph: {
    title: "GLACY — Creating what I love",
    description: "Independent video creator, vlogger and editor.",
    type: "website",
  },
};

export const viewport: Viewport = { themeColor: "#050506" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="bg-bg text-ink antialiased">
        <SmoothScroll />
        <Loader />
        <Cursor />
        <Nav />
        {children}
        <div className="grain" aria-hidden />
      </body>
    </html>
  );
}
