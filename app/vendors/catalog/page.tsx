"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import WeddingBanner from '../../../components/WeddingBanner';
import { useWeddingBanner } from '../../../hooks/useWeddingBanner';
import SelectField from '@/components/SelectField';
import FormField from '@/components/FormField';

const CATEGORIES = [
  { value: 'florist', label: 'Florists' },
  { value: 'jewelry_store', label: 'Jewelers' },
  { value: 'bakery', label: 'Bakeries & Cakes' },
  { value: 'restaurant', label: 'Reception Venues' },
  { value: 'hair_care', label: 'Hair & Beauty' },
  { value: 'photographer', label: 'Photographers' },
  { value: 'clothing_store', label: 'Bridal Salons' },
  { value: 'beauty_salon', label: 'Beauty Salons' },
  { value: 'spa', label: 'Spas' },
  { value: 'dj', label: 'DJs' },
  { value: 'band', label: 'Bands' },
  { value: 'wedding_planner', label: 'Wedding Planners' },
  { value: 'caterer', label: 'Catering' },
  { value: 'car_rental', label: 'Car Rentals' },
  { value: 'travel_agency', label: 'Travel Agencies' },
  // Add or remove as needed for your app
];

export default function VendorCatalogPage() {
  const [category, setCategory] = useState(CATEGORIES[0].value);
  const [location, setLocation] = useState('Dallas, TX');
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
      <div className="app-content-container flex flex-col gap-6 py-8">
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
            <button className="btn-primary px-6 py-2 mt-6" onClick={handleSearch}>Search</button>
          </div>
        </div>
        <div>
          <h3 className="text-lg font-playfair mb-2">Popular Categories</h3>
          <div className="grid grid-cols-4 gap-4 mb-8">
            {CATEGORIES.map(cat => (
              <button
                key={cat.value}
                className="bg-white border rounded p-4 flex flex-col items-center cursor-pointer hover:shadow-md transition"
                onClick={() => handleCategoryClick(cat.value)}
                style={{ outline: 'none', border: '1px solid #E0DBD7' }}
              >
                <img src="/Venue.png" alt={cat.label} className="w-20 h-20 object-contain mb-2" />
                <span className="text-xs font-medium text-[#332B42]">{cat.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 