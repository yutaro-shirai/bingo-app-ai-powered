import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "ビンゴゲーム - オンラインビンゴアプリ",
    template: "%s | ビンゴゲーム"
  },
  description: "無料で楽しめるオンラインビンゴゲーム。友達や家族とリアルタイムでビンゴを楽しもう！ルーム作成も参加も簡単。",
  keywords: ["ビンゴ", "ビンゴゲーム", "オンラインゲーム", "パーティーゲーム", "無料ゲーム"],
  authors: [{ name: "Bingo App Team" }],
  creator: "Bingo App Team",
  publisher: "Bingo App Team",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  openGraph: {
    title: "ビンゴゲーム - オンラインビンゴアプリ",
    description: "無料で楽しめるオンラインビンゴゲーム。友達や家族とリアルタイムでビンゴを楽しもう！",
    url: "/",
    siteName: "ビンゴゲーム",
    images: [
      {
        url: "/ogp-image.png",
        width: 1200,
        height: 630,
        alt: "ビンゴゲーム OGP画像",
      },
    ],
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ビンゴゲーム - オンラインビンゴアプリ",
    description: "無料で楽しめるオンラインビンゴゲーム。友達や家族とリアルタイムでビンゴを楽しもう！",
    images: ["/ogp-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    // Google Search Consoleの検証コードをここに追加できます
    // google: 'verification-code',
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
