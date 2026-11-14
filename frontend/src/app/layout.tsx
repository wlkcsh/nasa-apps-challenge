import "./globals.css";
import type { Metadata } from "next";
import { Cormorant_Garamond, Inter, JetBrains_Mono } from "next/font/google";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-display",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ui",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FIELD SHIFT UZBEKISTAN | NASA Space Apps 2026",
  description:
    "Earth Observation Crop Rotation and Salinity Decision Engine for the Aral Sea Basin",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body className="antialiased selection:bg-harvest-500 selection:text-white bg-paper-100 text-espresso-900 min-h-screen w-full relative">
        {children}
      </body>
    </html>
  );
}
