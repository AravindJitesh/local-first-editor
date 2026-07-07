import type { Metadata } from "next";
import "./globals.css";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Local-First Collaborative Document Editor",
  description: "A secure, real-time, offline-first collaborative document editor built with Next.js, Yjs CRDTs, and Supabase.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">
        <main className="flex-1">
          {children}
        </main>

        <Footer />
      </body>
    </html>
  );
}
