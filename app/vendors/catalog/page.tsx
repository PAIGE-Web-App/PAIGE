"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import WeddingBanner from '@/components/WeddingBanner';
import { useWeddingBanner } from '@/hooks/useWeddingBanner';
import { useUserProfileData } from '@/hooks/useUserProfileData';
import SelectField from '@/components/SelectField';
import FormField from '@/components/FormField';
import Breadcrumb from '@/components/Breadcrumb';

const CATEGORIES = [
  { value: 'venue', label: 'Venues', singular: 'Venue', icon: '🏛️' },
  { value: 'photographer', label: 'Photographers', singular: 'Photographer', icon: '📸' },
  { value: 'florist', label: 'Florists', singular: 'Florist', icon: '🌸' },
  { value: 'caterer', label: 'Catering', singular: 'Caterer', icon: '🍽️' },
  { value: 'dj', label: 'DJs', singular: 'DJ', icon: '🎵' },
  { value: 'bakery', label: 'Bakeries & Cakes', singular: 'Baker', icon: '🎂' },
  { value: 'jewelry_store', label: 'Jewelers', singular: 'Jeweler', icon: '💍' },
  { value: 'hair_care', label: 'Hair & Beauty', singular: 'Hair Stylist', icon: '💇‍♀️' },
  { value: 'clothing_store', label: 'Bridal Salons', singular: 'Dress Shop', icon: '👗' },
  { value: 'beauty_salon', label: 'Beauty Salons', singular: 'Beauty Salon', icon: '💄' },
  { value: 'spa', label: 'Spas', singular: 'Spa', icon: '🧖‍♀️' },
  { value: 'car_rental', label: 'Car Rentals', singular: 'Car Rental', icon: '🚗' },
  { value: 'travel_agency', label: 'Travel Agencies', singular: 'Travel Agency', icon: '✈️' },
  { value: 'wedding_planner', label: 'Wedding Planners', singular: 'Wedding Planner', icon: '📋' },
  { value: 'officiant', label: 'Officiants', singular: 'Officiant', icon: '⛪' },
  { value: 'suit_rental', label: 'Suit & Tux Rentals', singular: 'Suit & Tux Rental', icon: '🎩' },
  { value: 'makeup_artist', label: 'Makeup Artists', singular: 'Makeup Artist', icon: '💋' },
  { value: 'stationery', label: 'Stationery & Invitations', singular: 'Stationery', icon: '✉️' },
  { value: 'rentals', label: 'Event Rentals', singular: 'Event Rental', icon: '🪑' },
  { value: 'favors', label: 'Wedding Favors', singular: 'Wedding Favor', icon: '🎁' },
  { value: 'band', label: 'Bands', singular: 'Musician', icon: '🎤' },
];

export default function VendorCatalogPage() {
  const [category, setCategory] = useState(CATEGORIES[0].value);
  
  // Get user's wedding location from profile data
  const { weddingLocation } = useUserProfileData();
  const [location, setLocation] = useState(weddingLocation || 'Dallas, TX');
  
  const router = useRouter();
  const { daysLeft, userName, isLoading: bannerLoading, handleSetWeddingDate } = useWeddingBanner(router);

  // Handler for category card click
  const handleCategoryClick = (catValue: string) => {
    const url = `/vendors/catalog/${encodeURIComponent(catValue)}?location=${encodeURIComponent(location)}`;
    router.push(url);
  };

  // Handler for search button
  const handleSearch = () => {
    if (category) {
      const url = `/vendors/catalog/${encodeURIComponent(category)}?location=${encodeURIComponent(location)}`;
      router.push(url);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-linen">
      <WeddingBanner
        daysLeft={daysLeft}
        userName={userName}
        isLoading={bannerLoading}
        onSetWeddingDate={handleSetWeddingDate}
      />
      <div className="max-w-6xl mx-auto">
        <div className="app-content-container flex flex-col gap-6 py-8">
          <Breadcrumb
            items={[
              { label: 'Vendor Hub', href: '/vendors' },
              { label: 'Vendor Search', isCurrent: true }
            ]}
          />
          <div className="mt-12 mb-12">
            <h2 className="text-2xl font-playfair font-medium text-[#332B42] mb-8">Find top-rated vendors for every vibe</h2>
            <div className="flex gap-4 items-start mb-4">
              <div className="min-w-[220px]">
                <SelectField
                  label="Category"
                  name="category"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  options={CATEGORIES}
                />
              </div>
              <div className="min-w-[220px]">
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
              <button className="btn-search-match mt-6" onClick={handleSearch}>Search</button>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-playfair mb-2">Popular Categories</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 mb-6">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  className="bg-white border rounded-lg p-6 flex flex-col items-center cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-1"
                  onClick={() => handleCategoryClick(cat.value)}
                  style={{ outline: 'none', border: '1px solid #E0DBD7' }}
                >
                  <img src="/Venue.png" alt={cat.label} className="w-16 h-16 object-contain mb-3" />
                  <span className="text-sm font-medium text-[#332B42] text-center leading-tight">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 