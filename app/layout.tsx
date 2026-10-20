import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import localFont from "next/font/local";
import { ServiceWorkerRegistration } from "@/components/pwa/ServiceWorkerRegistration";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-jakarta",
});

const tungsten = localFont({
  src: [
    { path: "../fonts/Tungsten-Medium.woff2", weight: "500" },
    { path: "../fonts/Tungsten-Semibold.woff2", weight: "600" },
    { path: "../fonts/Tungsten-Bold.woff2", weight: "700" },
    { path: "../fonts/Tungsten-Black.woff2", weight: "800" },
  ],
  display: "swap",
  variable: "--font-tungsten",
});

export const metadata: Metadata = {
  title: "Catalyst Academy",
  description: "Learn prediction markets by making your first practice trade.",
  applicationName: "Catalyst Academy",
  appleWebApp: { capable: true, title: "Catalyst", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#010304",
  colorScheme: "dark",
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${jakarta.variable} ${tungsten.variable}`}>
      <body>
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
