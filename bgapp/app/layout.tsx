import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import NavigationGuard from "@/components/NavigationGuard";
import { ToastProvider } from "@/components/Toast";

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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-screen flex flex-col">
        <ToastProvider>
          <NavigationGuard />
          <main className="flex-1 max-w-screen-2xl mx-auto w-full px-4 py-6">
            {children}
          </main>
        </ToastProvider>
      </body>
    </html>
  );
}
