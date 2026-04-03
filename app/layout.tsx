import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/convex-provider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Career Steer — Figure out your next best career move",
  description:
    "AI-powered career decision and execution platform. Get a personalised roadmap to switch careers, get promoted, or land your next role faster.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
