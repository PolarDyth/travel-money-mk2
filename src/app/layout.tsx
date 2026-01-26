import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { createClient } from "@/utils/supabase/server";
import { SiteHeader } from "@/components/layout/site-header";
import { Toaster } from "@/components/ui/sonner";
import type { UserWithBranch } from "@/lib/hooks/use-user";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Travel Money POS",
  description: "Retail Point of Sale System",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let userWithBranch: UserWithBranch | null = null;

  if (user) {
    const { data } = await supabase
      .from("staff_profiles")
      .select(`*, branch:branches(*)`)
      .eq("id", user.id)
      .eq("is_active", true)
      .single();
    
    if (data) {
        userWithBranch = data as unknown as UserWithBranch;
    }
  }

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col bg-background`}
      >
        <SiteHeader user={userWithBranch} />
        <main className="flex-1 flex flex-col max-w-7xl mx-auto w-full px-4 py-8">
            {children}
        </main>
        <Toaster />
      </body>
    </html>
  );
}
