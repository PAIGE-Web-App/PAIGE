"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Map } from 'lucide-react';
import WeddingBanner from '@/components/WeddingBanner';
import { useUserProfileData } from '@/hooks/useUserProfileData';
import SelectField from '@/components/SelectField';
import FormField from '@/components/FormField';
import { VENDOR_CATEGORIES } from '@/constants/vendorCategories';

const CATEGORIES = VENDOR_CATEGORIES;

export default function VendorCatalogPage() {
  const [category, setCategory] = useState(CATEGORIES[0].value);
  
  // Get user's wedding location from profile data
  const { weddingLocation, profileLoading } = useUserProfileData();
  const [location, setLocation] = useState('');
  
  // Update location when weddingLocation loads from Firestore
  useEffect(() => {
    if (weddingLocation && !profileLoading) {
      setLocation(weddingLocation);
    }
  }, [weddingLocation, profileLoading]);
  
  const router = useRouter();

  // Handler for category card click
  const handleCategoryClick = (catValue: string) => {
    const url = `/vendors/catalog/${catValue}${location ? `?location=${encodeURIComponent(location)}` : ''}`;
    router.push(url);
  };

  // Handler for search button
  const handleSearch = () => {
    if (category) {
      const url = `/vendors/catalog/${category}${location ? `?location=${encodeURIComponent(location)}` : ''}`;
      router.push(url);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-linen mobile-scroll-container">
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
          .mobile-catalog-content {
            padding-left: 1rem;
            padding-right: 1rem;
            max-width: 100%;
            overflow-x: hidden;
          }
        }
      `}</style>
      <WeddingBanner />
      <div className="max-w-6xl mx-auto w-full">
        <div className="app-content-container flex flex-col gap-6 py-8 mobile-catalog-content">
          <div className="mt-12 mb-12">
            <div className="mb-8">
              <h2 className="h4">Find top-rated vendors for every vibe</h2>                                                                                   
            </div>
            <div className="flex flex-col md:flex-row gap-4 items-start mb-4">
              <div className="w-full md:w-auto md:min-w-[220px] md:max-w-[280px]">
                <SelectField
                  label="Category"
                  name="category"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  options={CATEGORIES}
                />
              </div>
              <div className="w-full md:w-auto md:min-w-[220px] md:max-w-[280px]">
                <FormField
                  label="City, State"
                  name="location"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder="Enter a city or state"
                />
                <a
                  href="/settings?tab=wedding&highlight=weddingLocation"
                  className="text-xs text-[#A85C36] underline mt-1 inline-block"
                >
                  Update Default Value
                </a>
              </div>
              <button className="btn-primary mt-6 w-full md:w-auto" onClick={handleSearch}>Search</button>                                                                                                         
            </div>
          </div>
          <div>
            <h3 className="text-lg font-playfair mb-2">Popular Categories</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 mb-6">
              {CATEGORIES.map(cat => {
                const IconComponent = cat.icon;
                return (
                  <button
                    key={cat.value}
                    className="bg-white border rounded-lg p-6 flex flex-col items-center cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-1"                                               
                    onClick={() => handleCategoryClick(cat.value)}
                    style={{ outline: 'none', border: '1px solid #E0DBD7' }}
                  >
                    <div className="w-16 h-16 flex items-center justify-center mb-3">
                      <IconComponent className="w-8 h-8 text-[#A85C36] stroke-[1.5]" />
                    </div>
                    <span className="text-sm font-medium text-[#332B42] text-center leading-tight">{cat.singular}</span>                                                                                                   
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}