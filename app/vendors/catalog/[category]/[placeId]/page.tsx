"use client";
import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { useEffect } from 'react';
import { useUserProfileData } from '@/hooks/useUserProfileData';
import Breadcrumb from '@/components/Breadcrumb';
import { generateVendorDetailBreadcrumbs } from '@/utils/breadcrumbUtils';
import { getCategoryFromSlug } from '@/utils/vendorUtils';
// import MessagingModal from '../../../components/MessagingModal'; // TODO: Use your real messaging modal

export default function VendorCatalogDetailsPage() {
  const [showContact, setShowContact] = useState(false);
  const [vendor, setVendor] = useState<any>(null);
  const { placeId, category } = useParams() as { placeId: string; category: string };
  const { weddingLocation } = useUserProfileData();

  useEffect(() => {
    async function fetchDetails() {
      if (!placeId) return;
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,website,photos,rating,user_ratings_total,types,geometry,price_level,review,formatted_phone_number,opening_hours,about&key=${apiKey}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.result) setVendor(data.result);
    }
    fetchDetails();
  }, [placeId]);

  if (!vendor) {
    return <div className="app-content-container py-8">Loading...</div>;
  }

  return (
    <div className="flex flex-col min-h-screen bg-linen">
      <div className="app-content-container flex flex-col gap-6 py-8">
        <Breadcrumb
          items={generateVendorDetailBreadcrumbs({
            category: getCategoryFromSlug(category),
            location: weddingLocation || undefined,
            vendorName: vendor?.name,
            vendorAddress: vendor?.formatted_address,
            userWeddingLocation: weddingLocation || undefined
          })}
        />
        <div className="flex gap-8">
          <div className="flex-1">
            {/* Image carousel placeholder */}
            <div className="bg-white border rounded mb-4 flex items-center justify-center h-72">
              <img src={vendor.photos && vendor.photos.length > 0 ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${vendor.photos[0].photo_reference}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}` : '/Venue.png'} alt={vendor.name} className="h-60 object-contain" />
            </div>
            <div className="mb-4">
              <h2 className="text-2xl font-playfair font-medium text-[#332B42] mb-1">{vendor.name}</h2>
              <div className="flex items-center gap-2 text-sm text-[#332B42] mb-1">
                <span>{vendor.formatted_address}</span>
                <span className="text-[#A85C36]">★ {vendor.rating} ({vendor.user_ratings_total})</span>
                {vendor.price_level && <span>{'$'.repeat(vendor.price_level)}</span>}
                {/* Add more fields as needed */}
              </div>
              <div className="flex gap-2 mt-2">
                <button className="btn-primaryinverse" onClick={() => setShowContact(true)}>Favorite</button>
                <button className="btn-primary" onClick={() => setShowContact(true)}>Contact</button>
              </div>
            </div>
            <div className="bg-white border rounded p-4 mb-4">
              <div className="font-semibold mb-1">Basic Details</div>
              <div className="text-sm mb-1">📍 {vendor.formatted_address}</div>
              {vendor.website && <a href={vendor.website} target="_blank" rel="noopener noreferrer" className="text-xs text-[#332B42] underline">Website</a>}
            </div>
            <div className="bg-white border rounded p-4">
              <div className="font-semibold mb-1">About</div>
              <div className="text-sm text-[#332B42]">{vendor.about || ''}</div>
            </div>
          </div>
          {/* Comments section placeholder */}
          <div className="w-[420px] bg-white border rounded p-4">
            <div className="font-semibold mb-2">Comments</div>
            {/* TODO: Comments section */}
            <div className="text-xs text-gray-400">Add a comment. To tag someone enter @ and add their names.</div>
          </div>
        </div>
      </div>
      {/* Contact Modal */}
      {/* TODO: Use your real messaging modal from app/page.tsx */}
      
    </div>
  );
} 