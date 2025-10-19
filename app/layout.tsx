import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "カテゴリ類似検索",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-white text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
