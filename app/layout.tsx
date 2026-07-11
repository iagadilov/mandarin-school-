import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://mandarineducenter.kz"),
  title: {
    default: "Mandarin - онлайн-тренажёр ментальной арифметики",
    template: "%s | Mandarin",
  },
  description:
    "Онлайн-тренажёр Mandarin для ментальной арифметики: показ чисел по одному, настройка скорости, количества чисел и примеров, ввод ответа и автоматическая проверка.",
  applicationName: "Mandarin Edu Center Trainer",
  keywords: [
    "Mandarin",
    "Mandarin Edu Center",
    "ментальная арифметика",
    "онлайн тренажёр",
    "абакус",
    "соробан",
    "тренажёр сложения",
    "тренажёр вычитания",
  ],
  authors: [{ name: "Mandarin Edu Center" }],
  creator: "Mandarin Edu Center",
  publisher: "Mandarin Edu Center",
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    locale: "ru_KZ",
    url: "https://mandarineducenter.kz",
    siteName: "Mandarin Edu Center",
    title: "Mandarin - онлайн-тренажёр ментальной арифметики",
    description:
      "Тренажёр Mandarin: числа показываются по одному без предпросмотра, ученик вводит ответ, система проверяет результат автоматически.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Mandarin - онлайн-тренажёр ментальной арифметики",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mandarin - онлайн-тренажёр ментальной арифметики",
    description:
      "Показ чисел по одному, настройка скорости и автоматическая проверка ответа.",
    images: ["/og-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
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
