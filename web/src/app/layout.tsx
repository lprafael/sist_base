import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "MiCancha — Reserva canchas deportivas en Paraguay",
  description: "Encontrá las mejores canchas de fútbol, pádel y tenis cerca tuyo. Reservá online en segundos. Paraguay.",
  keywords: "canchas deportivas, fútbol, pádel, tenis, reservas, Asunción, Paraguay",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-YCLM0M9H0B"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-YCLM0M9H0B');
          `}
        </Script>
      </head>
      <body className={inter.variable}>{children}</body>
    </html>
  );
}
