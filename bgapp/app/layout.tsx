import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import NavigationGuard from "@/components/NavigationGuard";
import AutoSync from "@/components/AutoSync";
import { ToastProvider } from "@/components/Toast";
import { StatusProvider } from "@/components/StatusProvider";
import { LanguageProvider } from "@/components/i18n/LanguageProvider";
import { getLang } from "@/lib/i18nServer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BG Manager — Collezione Giochi da Tavolo",
  description: "Gestisci la tua collezione di giochi da tavolo",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "BG Manager",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f1929",
  // Required by the black-translucent status bar: without cover the web app
  // still renders under the Dynamic Island but env(safe-area-inset-*) is 0,
  // so there is no way to pad the chrome back out from under it.
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const lang = await getLang();
  return (
    <html lang={lang} className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-screen flex flex-col">
        <LanguageProvider initialLang={lang}>
          <ToastProvider>
            <StatusProvider>
              <NavigationGuard />
              <AutoSync />
              <main className="safe-bottom flex-1 max-w-screen-2xl mx-auto w-full px-4 py-6">
                {children}
              </main>
            </StatusProvider>
          </ToastProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
