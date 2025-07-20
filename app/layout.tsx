// app/layout.tsx
'use client';
import "../styles/globals.css";
import { Playfair_Display, Work_Sans } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "../contexts/AuthContext";
import { SWRProvider } from "../contexts/SWRProvider";
import Script from "next/script";
import AuthenticatedNavWrapper from "../components/AuthenticatedNavWrapper";
import IdleTimeoutManager from "../components/IdleTimeoutManager";
import { usePathname } from 'next/navigation';

const playfair = Playfair_Display({ 
  subsets: ["latin"],
  variable: "--font-playfair",
  display: 'swap'
});

const workSans = Work_Sans({ 
  subsets: ["latin"],
  variable: "--font-work-sans",
  display: 'swap'
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideNav = pathname === '/login' || pathname === '/signup';
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
          <SWRProvider>
            {!hideNav && <AuthenticatedNavWrapper />}
            <IdleTimeoutManager />
            <Toaster
              position="bottom-center"
              reverseOrder={false}
              gutter={4}
              containerClassName="toast-container-bottom-center"
              toastOptions={{
                duration: 4000,
                style: {
                  backgroundColor: '#332B42',
                  color: '#F3F2F0',
                  borderRadius: '5px',
                  border: '1px solid #A85C36',
                  padding: '10px 15px',
                  fontSize: '14px',
                  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
                  margin: '4px 0',
                },
                success: { iconTheme: { primary: '#A85C36', secondary: '#F3F2F0' } },
                error: { iconTheme: { primary: '#A85C36', secondary: '#F3F2F0' } },
              }}
            />
            {children}
          </SWRProvider>
        </AuthProvider>
      </body>
    </html>
  );
}