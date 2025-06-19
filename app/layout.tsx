// app/layout.tsx
import "../styles/globals.css";
import { Playfair_Display, Work_Sans } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "../contexts/AuthContext";
import Script from "next/script";
import AuthenticatedNavWrapper from "../components/AuthenticatedNavWrapper";

const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });
const workSans = Work_Sans({ subsets: ["latin"], variable: "--font-work-sans" });

export const metadata = {
  title: "PAIGE",
  description: "AI Wedding Planner Dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${playfair.variable} ${workSans.variable}`}>
      <head>
        <Script
          src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
          strategy="beforeInteractive"
        />
      </head>
      <body className="min-h-screen flex flex-col font-sans text-base text-[#364257] bg-linen">
        <AuthProvider>
          <AuthenticatedNavWrapper />
          {/* Toaster component for custom toast notifications */}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                backgroundColor: '#332B42',
                color: '#F3F2F0',
                borderRadius: '5px',
                border: '1px solid #A85C36',
                padding: '10px 15px',
                fontSize: '14px',
                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
              },
              success: { iconTheme: { primary: '#A85C36', secondary: '#F3F2F0' } },
              error: { iconTheme: { primary: '#A85C36', secondary: '#F3F2F0' } },
            }}
          />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}