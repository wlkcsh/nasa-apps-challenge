import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AGRIVERTO | NASA Space Apps 2026",
  description:
    "Agriverto: Earth Observation Crop Rotation and Salinity Decision Engine for the Aral Sea Basin",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased selection:bg-harvest-500 selection:text-white bg-paper-100 text-espresso-900 min-h-screen w-full relative">
        {children}
      </body>
    </html>
  );
}
