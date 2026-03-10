import type { Metadata } from "next";
import { Nunito, Geist } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin", "cyrillic"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Capullo — Цаг захиалга",
  description: "Capullo гоо сайхны газрын цаг захиалгын систем",
};

import { ClerkProvider } from '@clerk/nextjs'
import Providers from "@/components/Providers";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="mn" suppressHydrationWarning className={cn("font-sans", geist.variable)}>
        <body
          className={`${nunito.variable} antialiased`}
        >
          <Providers>
            {children}
            <Toaster position="top-center" richColors />
          </Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}
