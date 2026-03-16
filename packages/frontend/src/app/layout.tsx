import type { Metadata } from "next";
import { Open_Sans } from "next/font/google";
import { Geist_Mono } from "next/font/google";
import "./globals.css";

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "エスペランサ ビンゴ大会",
    template: "%s | エスペランサ ビンゴ大会"
  },
  description: "NPO法人CPサッカー&ライフエスペランサの懇親会ビンゴゲーム。みんなで楽しもう！",
  keywords: ["ビンゴ", "エスペランサ", "CPサッカー", "懇親会", "ビンゴゲーム"],
  authors: [{ name: "NPO法人CPサッカー&ライフエスペランサ" }],
  creator: "NPO法人CPサッカー&ライフエスペランサ",
  publisher: "NPO法人CPサッカー&ライフエスペランサ",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  openGraph: {
    title: "エスペランサ ビンゴ大会",
    description: "NPO法人CPサッカー&ライフエスペランサの懇親会ビンゴゲーム。みんなで楽しもう！",
    url: "/",
    siteName: "エスペランサ ビンゴ大会",
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "エスペランサ ビンゴ大会",
    description: "NPO法人CPサッカー&ライフエスペランサの懇親会ビンゴゲーム。みんなで楽しもう！",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${openSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
