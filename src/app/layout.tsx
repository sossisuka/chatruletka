import type { Metadata, Viewport } from "next";
import { PT_Sans } from "next/font/google";
import "./globals.css";

const font = PT_Sans({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "700"],
  variable: "--font-pt-sans",
  display: "swap",
});
export const metadata: Metadata = {
  title: "Chatruletka — встречайте новых людей",
  description:
    "Случайные знакомства, живые разговоры. Бесплатный видеочат с подбором собеседников в реальном времени.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f9fc" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0b0b" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body className={font.variable}>{children}</body>
    </html>
  );
}
