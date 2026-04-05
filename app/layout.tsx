import type { Metadata } from "next";
import { Figtree, EB_Garamond } from "next/font/google";
import { Providers } from "@/components/convex-provider";
import "./globals.css";
import "./fonts.css";

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const ebGaramond = EB_Garamond({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
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
      <body className={`${figtree.variable} ${ebGaramond.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
