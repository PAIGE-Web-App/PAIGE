// app/layout.tsx
import "../styles/globals.css";
import { Playfair_Display, Work_Sans } from "next/font/google";

const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });
const workSans = Work_Sans({ subsets: ["latin"], variable: "--font-work-sans" });

export const metadata = {
  title: "PAIGE",
  description: "AI Wedding Planner Dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${playfair.variable} ${workSans.variable}`}>
      <body className="min-h-screen flex flex-col font-sans text-base text-[#364257] bg-linen">
        {children}
      </body>
    </html>
  );
}