import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CaseFlow — Litigation Workflow for Advocates",
  description: "Convert client stories into structured legal cases. Built for advocates.",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: "#0a0a0a",
              color: "#f8f5ef",
              border: "1px solid #b08a3c",
              borderRadius: "10px",
              fontSize: "14px",
            },
          }}
        />
        {children}
      </body>
    </html>
  );
}
