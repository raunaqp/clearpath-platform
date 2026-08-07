import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { RoleProvider } from "@/lib/role/RoleContext";
import { HospitalProvider } from "@/lib/hospital/HospitalContext";
import { AppShell } from "@/components/AppShell";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ClearPath — Pre-deployment evaluation, placement & deployment for clinical AI",
  description:
    "ClearPath is the pre-deployment evaluation, placement, and deployment layer for clinical-AI and digital-health tools. Vendors submit for a readiness assessment; hospitals review, run their own intake audit, and run the pilot end-to-end.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,300;0,8..60,400;0,8..60,600;1,8..60,300;1,8..60,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans bg-bg text-ink">
        <RoleProvider>
          <HospitalProvider>
            <AppShell>{children}</AppShell>
          </HospitalProvider>
        </RoleProvider>
      </body>
    </html>
  );
}
