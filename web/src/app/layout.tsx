import type { Metadata } from "next";
import { headers } from "next/headers";
import { Orbitron, Rajdhani } from "next/font/google";
import { cookieToInitialState } from "wagmi";
import { Providers } from "@/components/providers";
import { wagmiConfig } from "@/lib/wagmi/config";
import "./globals.css";

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
  display: "swap",
});

const rajdhani = Rajdhani({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-rajdhani",
  display: "swap",
});

const defaultSiteUrl = "https://physics-bridge-builder.vercel.app";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? defaultSiteUrl;

/** Base dashboard → App → domain verification (`<meta name="base:app_id" />`) */
const baseAppId =
  process.env.NEXT_PUBLIC_BASE_APP_ID ?? "69e47d6786272d70f28d7427";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Physics Bridge Builder",
  description:
    "Build neon girders, run the sim, clear the gap — daily check-in on Base.",
  icons: {
    icon: "/app-icon.jpg",
    apple: "/app-icon.jpg",
  },
  other: {
    "base:app_id": baseAppId,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const cookie = headersList.get("cookie");
  const initialState = cookieToInitialState(wagmiConfig, cookie ?? undefined);

  return (
    <html
      lang="en"
      className={`${orbitron.variable} ${rajdhani.variable} h-full antialiased`}
    >
      <head>
        <meta name="base:app_id" content={baseAppId} />
      </head>
      <body className="min-h-full bg-[#05050d] text-zinc-100">
        <Providers initialState={initialState}>{children}</Providers>
      </body>
    </html>
  );
}
