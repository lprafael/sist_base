import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "MiCancha — Gestión de Canchas y Torneos en Paraguay",
  description: "Encuentra y reserva al instante las mejores canchas de fútbol, pádel, tenis y más en Paraguay. Gestiona tus torneos, organiza partidos y disfruta del deporte.",
  keywords: "canchas deportivas, alquiler de canchas, reserva de canchas, fútbol, pádel, tenis, torneos, campeonatos, Asunción, Paraguay, micancha, deportes, sintético",
  authors: [{ name: "MiCancha" }],
  openGraph: {
    title: "MiCancha — Gestión de Canchas y Torneos en Paraguay",
    // description: "Encuentra las mejores canchas de Paraguay y resérvalas online en segundos.",
    description: "Encuentra las mejores canchas de Paraguay y resérvalas online en segundos. Gestión de turnos y torneos en un solo lugar.",
    url: "https://micancha.com.py",
    siteName: "MiCancha",
    locale: "es_PY",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MiCancha — Reserva de Canchas",
    description: "Reserva canchas de fútbol, pádel y más en Paraguay al instante.",
  },
  robots: {
    index: true,
    follow: true,
  }
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
