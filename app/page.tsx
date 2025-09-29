// app/page.tsx - Main Page Router
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from "../components/LoadingSpinner";
import LandingPage from "./landing/page";

export default function MainPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Only redirect if we're not already loading and we have a definitive auth state
    if (!loading && user) {
      console.log('🔄 Main page: User authenticated, redirecting to dashboard');
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-linen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // If user is authenticated, show loading while redirecting
  if (user) {
    return (
      <div className="min-h-screen bg-linen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // If user is not authenticated, show landing page
  return <LandingPage />;
}