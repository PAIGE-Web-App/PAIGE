// app/layout.tsx
'use client';
import "../styles/globals.css";
import { Playfair_Display, Work_Sans } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "../contexts/AuthContext";
import { SWRProvider } from "../contexts/SWRProvider";
import { CreditProvider } from "../contexts/CreditContext";
import { MoodBoardsProvider } from "../contexts/MoodBoardsContext";
import { GmailAuthProvider } from "../contexts/GmailAuthContext";
import GlobalGmailBanner from "../components/GlobalGmailBanner";
// Removed LoadingProvider - using progressive loading instead
import Script from "next/script";
import { SpeedInsights } from "@vercel/speed-insights/next";
import AuthenticatedNavWrapper from "../components/AuthenticatedNavWrapper";
import SimpleNavWrapper from "../components/SimpleNavWrapper";
import IdleTimeoutManager from "../components/IdleTimeoutManager";
import { usePathname } from 'next/navigation';
import GlobalErrorBoundary from '../components/GlobalErrorBoundary';
import HydrationErrorBoundary from '../components/HydrationErrorBoundary';

// Import scheduled task manager to start automation (server-side only)
import '@/lib/initScheduledTasks';

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
  const isAuthPage = pathname === '/login' || pathname === '/signup';
  
  return (
    <html lang="en" className={`${playfair.variable} ${workSans.variable}`}>
      <head>
        {/* Prevent white screen flash */}
        <style jsx global>{`
          html, body {
            background-color: #F3F2F0 !important;
          }
          #__next {
            min-height: 100vh;
            background-color: #F3F2F0;
          }
          /* Force re-render on hydration issues */
          .hydration-fix {
            opacity: 0;
            animation: fadeIn 0.3s ease-in-out forwards;
          }
          @keyframes fadeIn {
            to { opacity: 1; }
          }
        `}</style>
      </head>
      <body className="min-h-screen flex flex-col font-sans text-base text-[#364257] bg-linen">
        <AuthProvider>
          <SWRProvider>
            <CreditProvider>
              <MoodBoardsProvider>
                <GmailAuthProvider>
                  {isAuthPage ? (
                  // For auth pages (login/signup), don't use LoadingProvider
                  <GlobalErrorBoundary>
                    <HydrationErrorBoundary>
                      {children}
                    </HydrationErrorBoundary>
                  </GlobalErrorBoundary>
                ) : (
                  // For authenticated pages, show immediately with progressive loading
                  <>
                    {/* Simplified Navigation */}
                    {!hideNav && (
                      <SimpleNavWrapper>
                        <GlobalErrorBoundary>
                          <HydrationErrorBoundary>
                            {children}
                          </HydrationErrorBoundary>
                        </GlobalErrorBoundary>
                      </SimpleNavWrapper>
                    )}
                    {hideNav && (
                      <GlobalErrorBoundary>
                        <HydrationErrorBoundary>
                          {children}
                        </HydrationErrorBoundary>
                      </GlobalErrorBoundary>
                    )}
                  </>
                )}
                </GmailAuthProvider>
              </MoodBoardsProvider>
            </CreditProvider>
            
            <IdleTimeoutManager />
            <SpeedInsights />
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