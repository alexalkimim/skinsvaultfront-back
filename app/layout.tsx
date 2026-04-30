import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import Navbar from "../components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SKINVAULT | Dashboard de Skins",
  description: "Gestão profissional de inventário para colecionadores de alto nível.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-br" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#050505] text-zinc-200 min-h-screen selection:bg-purple-500/30`}
      >
        <Providers>
          {/* Background Dinâmico - Efeito Mesh Gradient Suave */}
          <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/10 blur-[120px] rounded-full animate-pulse" />
            <div className="absolute bottom-[-5%] right-[-5%] w-[30%] h-[30%] bg-blue-900/5 blur-[100px] rounded-full" />
            <div className="absolute top-[20%] right-[10%] w-[25%] h-[25%] bg-purple-800/5 blur-[120px] rounded-full" />
          </div>

          <Navbar />
          <div className="pt-20">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
