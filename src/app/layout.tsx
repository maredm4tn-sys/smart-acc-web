import type { Metadata } from "next";
import { Readex_Pro } from "next/font/google";
import "./globals.css";

const readex = Readex_Pro({
  subsets: ["arabic", "latin"],
  variable: "--font-readex",
  display: "swap",
});

import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: "المحاسب الذكي - Smart Acc",
  description: "نظام محاسبي سحابي متطور",
  icons: {
    icon: "/logo.jpg",
  },
};

import { getLocale, getDictionary } from "@/lib/i18n-server";
import { I18nProvider } from "@/components/providers/i18n-provider";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const lang = await getLocale();
  const dict = await getDictionary();
  const dir = lang === "ar" ? "rtl" : "ltr";

  return (
    <html lang={lang} dir={dir} suppressHydrationWarning>
      <body className={`${readex.className} bg-gray-50 dark:bg-gray-950 antialiased`}>
        <I18nProvider lang={lang} dict={dict}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
