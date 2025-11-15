"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Sparkles, Loader2 } from 'lucide-react';
import CollectionsPageSkeleton from '@/components/jewelry/CollectionsPageSkeleton';
import { useCustomToast } from '@/hooks/useCustomToast';
import WeddingBanner from '@/components/WeddingBanner';
import useSWR from 'swr';

interface ShopifyCollection {
  id: number;
  title: string;
  handle: string;
  description: string;
  image: string | null;
}

export default function CollectionsPage() {
  const [collections, setCollections] = useState<ShopifyCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { showErrorToast } = useCustomToast();

  // SWR fetcher function
  const fetcher = async (url: string) => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch collections');
    }
    const data = await response.json();
    return data.collections || [];
  };

  // Use SWR for request deduplication and caching
  const { data: collectionsData, error, isLoading } = useSWR<ShopifyCollection[]>(
    '/api/shopify/collections',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000, // Dedupe requests within 60 seconds
    }
  );

  // Update collections state when SWR data changes
  useEffect(() => {
    if (collectionsData) {
      setCollections(collectionsData);
    }
  }, [collectionsData]);

  // Update loading state
  useEffect(() => {
    setLoading(isLoading);
  }, [isLoading]);

  // Handle errors
  useEffect(() => {
    if (error) {
      console.error('Error fetching collections:', error);
      showErrorToast('Failed to load collections. Please try again later.');
    }
  }, [error, showErrorToast]);

  const handleCollectionClick = (handle: string) => {
    router.push(`/jewelry/collections/${handle}`);
  };

  if (loading) {
    return <CollectionsPageSkeleton />;
  }

  return (
    <div className="min-h-screen bg-linen mobile-scroll-container">
      <style jsx global>{`
        @media (max-width: 768px) {
          html, body {
            height: 100vh;
            overflow: hidden;
          }
          .mobile-scroll-container {
            height: 100vh;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
          }
        }
      `}</style>
      <WeddingBanner />
      
      <div className="max-w-6xl mx-auto">
        <div className="app-content-container flex flex-col gap-4 py-8 pb-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-[#7A7A7A] mb-4">
            <button
              onClick={() => router.push('/jewelry')}
              className="hover:text-[#332B42] transition-colors"
            >
              All Jewelry
            </button>
            <span>/</span>
            <span className="text-[#332B42]">Collections</span>
          </div>

          {/* Header */}
          <div className="mb-6">
            <h1 className="h2 mb-2">Collections</h1>
            <p className="text-sm text-[#7A7A7A] font-work-sans">
              Browse our curated jewelry collections
            </p>
          </div>

          {/* Collections Grid */}
          {collections.length === 0 ? (
            <div className="text-center py-12">
              <Sparkles className="w-16 h-16 text-[#AB9C95] mx-auto mb-4" />
              <p className="text-[#7A7A7A]">No collections available at this time.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {collections.map((collection) => (
                <motion.div
                  key={collection.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-lg shadow-sm border border-[#E0DBD7] overflow-hidden hover:shadow-md transition-all cursor-pointer group"
                  onClick={() => handleCollectionClick(collection.handle)}
                >
                  {/* Collection Image */}
                  <div className="relative aspect-[4/3] bg-[#F9F8F7] overflow-hidden">
                    {collection.image ? (
                      <img
                        src={collection.image}
                        alt={collection.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Sparkles className="w-12 h-12 text-[#AB9C95]" />
                      </div>
                    )}
                  </div>

                  {/* Collection Info */}
                  <div className="p-4">
                    <h3 className="h6 mb-2">{collection.title}</h3>
                    {collection.description && (
                      <p className="text-xs text-[#7A7A7A] line-clamp-2">
                        {collection.description.replace(/<[^>]*>/g, '')}
                      </p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

