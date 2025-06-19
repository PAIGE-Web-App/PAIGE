"use client";

import { useAuth } from "../../contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import WeddingBanner from "../../components/WeddingBanner";
import { useWeddingBanner } from "../../hooks/useWeddingBanner";

export default function InspirationPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { daysLeft, userName, isLoading, handleSetWeddingDate } = useWeddingBanner(router);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F3F2F0] flex items-center justify-center">
        <div className="text-[#332B42]">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#F3F2F0]">
      <WeddingBanner 
        daysLeft={daysLeft}
        userName={userName}
        isLoading={isLoading}
        onSetWeddingDate={handleSetWeddingDate}
      />
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white rounded-lg p-8 shadow">
          <h1 className="text-2xl font-playfair font-semibold mb-6 text-[#332B42]">
            Wedding Inspiration
          </h1>
          
          <div className="text-center py-12">
            <div className="text-6xl mb-4">✨</div>
            <h2 className="text-xl font-playfair font-medium mb-4 text-[#332B42]">
              Coming Soon!
            </h2>
            <p className="text-[#364257] mb-6 max-w-md mx-auto">
              We're working on creating an amazing inspiration experience to help you discover and refine your wedding vibe.
            </p>
            <p className="text-sm text-[#7A7A7A]">
              This is where you'll be able to update your wedding vibe and get inspired by beautiful wedding ideas.
            </p>
          </div>

          <div className="flex justify-center mt-8">
            <button
              onClick={() => router.back()}
              className="btn-primary px-6 py-2 rounded font-semibold text-base"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 