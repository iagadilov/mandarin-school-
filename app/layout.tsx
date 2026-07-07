import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Mandarin - онлайн-тренажёр",
  description:
    "Первый этап Mandarin: базовый онлайн-тренажёр ментальной арифметики с показом чисел по одному, настройками рядов, количества примеров и скорости.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${manrope.variable} h-full`}>
      <body className="min-h-full bg-bg text-ink">{children}</body>
    </html>
  );
}
