import type { Metadata } from "next";
import { Inter, DM_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ptBR } from "@clerk/localizations";
import { MaintenancePage } from "./components/maintenance-page";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  weight: ["400", "500"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Luppa",
  description: "Personal finance SaaS",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider localization={ptBR}>
      <html lang="pt-BR">
        <body
          className={`${inter.variable} ${dmMono.variable} antialiased`}
        >
          {process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'true' ? (
            <MaintenancePage />
          ) : (
            children
          )}
        </body>
      </html>
    </ClerkProvider>
  );
}
