import type { Metadata } from "next";
import "./globals.css";
import { Poppins } from "next/font/google";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { QueryProvider } from "@/lib/providers/QueryProvider";
import { ThemeProvider } from "@/lib/providers/ThemeProvider";
import { ConvexProvider } from "@/lib/providers/ConvexProvider";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "KPI Dashboard",
  description: "Modern KPI dashboard for tracking key performance indicators.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${poppins.className} min-h-screen antialiased`}>
        <ConvexAuthNextjsServerProvider>
          <ConvexProvider>
            <ThemeProvider>
              <QueryProvider>{children}</QueryProvider>
            </ThemeProvider>
          </ConvexProvider>
        </ConvexAuthNextjsServerProvider>
      </body>
    </html>
  );
}
