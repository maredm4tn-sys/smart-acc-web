import type { Metadata } from "next";
// import { Readex_Pro } from "next/font/google";
import "./globals.css";

// const readex = Readex_Pro({
//   subsets: ["arabic", "latin"],
//   variable: "--font-readex",
//   display: "swap",
// });

const readex = { className: "font-sans" }; // Fallback to system font

import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: "المحاسب الذكي - Smart Acc",
  description: "نظام محاسبي سحابي متطور",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  manifest: "/manifest.json",
};

import { getLocale, getDictionary } from "@/lib/i18n-server";
import { I18nProvider } from "@/components/providers/i18n-provider";
import { SWRProvider } from "@/components/providers/swr-provider";
import { LicenseGuard } from "@/components/license-guard";
import { Toaster } from "@/components/ui/sonner";

import { GlobalErrorHandler } from "@/components/global-error-handler";
import { PWARegister } from "@/components/pwa-register";
import { EnvBanner } from "@/components/env-banner";

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
        <GlobalErrorHandler>
          <EnvBanner />
          <PWARegister />
          <I18nProvider lang={lang} dict={dict}>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <SWRProvider>
                <LicenseGuard>
                  {children}
                  <Toaster />
                </LicenseGuard>
              </SWRProvider>
            </ThemeProvider>
          </I18nProvider>
        </GlobalErrorHandler>
      </body>
    </html>
  );
}
