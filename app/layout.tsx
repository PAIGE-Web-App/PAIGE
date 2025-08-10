// app/layout.tsx
'use client';
import "../styles/globals.css";
import { Playfair_Display, Work_Sans } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "../contexts/AuthContext";
import { SWRProvider } from "../contexts/SWRProvider";
import Script from "next/script";
import AuthenticatedNavWrapper from "../components/AuthenticatedNavWrapper";
import VerticalNavWrapper from "../components/VerticalNavWrapper";
import IdleTimeoutManager from "../components/IdleTimeoutManager";
import PerformanceDashboard from "../components/PerformanceDashboard";
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
          strategy="lazyOnload"
        />
        <Script
          src="/scripts/test-performance.js"
          strategy="afterInteractive"
          onError={(e) => console.warn('Performance script failed to load:', e)}
        />
      </head>
      <body className="min-h-screen flex flex-col font-sans text-base text-[#364257] bg-linen">
        <AuthProvider>
          <SWRProvider>

            
            {/* New Vertical Navigation */}
            {!hideNav && <VerticalNavWrapper>{children}</VerticalNavWrapper>}
            {hideNav && children}
            
            <IdleTimeoutManager />
            <PerformanceDashboard />
            <Toaster
              position="bottom-center"
              reverseOrder={false}
              gutter={8}
              toastOptions={{
                duration: 4000,
                style: {
                  backgroundColor: '#332B42',
                  color: '#F3F2F0',
                  borderRadius: '5px',
                  border: '1px solid #A85C36',
                  padding: '12px 16px',
                  fontSize: '14px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  margin: '0',
                  maxWidth: '400px',
                  wordBreak: 'break-word',
                },
                success: { iconTheme: { primary: '#A85C36', secondary: '#F3F2F0' } },
                error: { iconTheme: { primary: '#A85C36', secondary: '#F3F2F0' } },
              }}
            />
          </SWRProvider>
        </AuthProvider>
      </body>
    </html>
  );
}