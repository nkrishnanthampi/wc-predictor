import type { Metadata } from "next";
import { Noto_Sans } from "next/font/google";
import "./globals.css";
import { NavBar } from "@/components/ui/NavBar";
import { createClient } from "@/lib/supabase/server";

const notoSans = Noto_Sans({
  variable: "--font-noto-sans",
  subsets: ["latin"],
  weight: ["400", "600", "700", "900"],
});

export const metadata: Metadata = {
  title: "World Cup Predictor 2026",
  description: "Predict World Cup 2026 match results and compete with friends",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <html lang="en" className={`${notoSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#F5F5F5]">
        {user && <NavBar user={user} />}
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
