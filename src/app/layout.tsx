//********** START: Root Layout **********
//********** Global layout applying themes, syncing, and PWA metadata.
//********** END: Root Layout **********

import type { Metadata, Viewport } from "next";
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

import { SyncProvider } from "@/providers/SyncProvider";
import { ToastProvider } from "@/components/ToastProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { TransactionFormProvider } from "@/providers/TransactionFormProvider";
import { TimeFilterProvider } from "@/providers/TimeFilterProvider";

//********** PWA Metadata **********
export const viewport: Viewport = {
  themeColor: "#6366f1",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Moneta Finance",
  description: "Aplikasi pencatat keuangan",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Moneta Finance",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/icons/icon-192x192.png",
    apple: "/icons/icon-192x192.png",
  },
};

//********** COMPONENT **********
/**
 * Root application layout establishing global providers and HTML structure.
 * @param children - Child components
 * @returns Root HTML structure
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* //********** PWA meta tags ********** */}
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased transition-colors duration-200 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100`}
      >
        <ThemeProvider>
          <SyncProvider>
            <TransactionFormProvider>
              <TimeFilterProvider>
                {children}
                <ToastProvider />
              </TimeFilterProvider>
            </TransactionFormProvider>
          </SyncProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
