"use client";

import React, { useState, useRef } from "react";
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from "framer-motion";
import PlacesAutocompleteInput from '@/components/PlacesAutocompleteInput';
import VenueSearchInput from '@/components/VenueSearchInput';
import VenueCard from '@/components/VenueCard';
import MaxBudgetInput from '@/components/MaxBudgetSlider';

interface WeddingTabProps {
  weddingDate: string;
  setWeddingDate: (date: string) => void;
  weddingLocation: string;
  setWeddingLocation: (location: string) => void;
  weddingLocationUndecided: boolean;
  setWeddingLocationUndecided: (undecided: boolean) => void;
  hasVenue: boolean | null;
  setHasVenue: (hasVenue: boolean | null) => void;
  selectedVenueMetadata: any;
  setSelectedVenueMetadata: (metadata: any) => void;
  venueSearch: string;
  setVenueSearch: (search: string) => void;
  vibe: string[];
  generatedVibes: string[];
  guestCount: number;
  setGuestCount: (count: number) => void;
  maxBudget: number;
  setMaxBudget: (budget: number) => void;
  selectedLocationType: string | null;
  setSelectedLocationType: (type: string | null) => void;
  weddingLocationCoords: { lat: number; lng: number } | null;
  jiggleAnimate: string;
  jiggleMaxBudget: string;
  saving: boolean;
  hasUnsavedWeddingChanges: boolean;
  onSave: () => Promise<void>;
}

export default function WeddingTab({
  weddingDate,
  setWeddingDate,
  weddingLocation,
  setWeddingLocation,
  weddingLocationUndecided,
  setWeddingLocationUndecided,
  hasVenue,
  setHasVenue,
  selectedVenueMetadata,
  setSelectedVenueMetadata,
  venueSearch,
  setVenueSearch,
  vibe,
  generatedVibes,
  guestCount,
  setGuestCount,
  maxBudget,
  setMaxBudget,
  selectedLocationType,
  setSelectedLocationType,
  weddingLocationCoords,
  jiggleAnimate,
  jiggleMaxBudget,
  saving,
  hasUnsavedWeddingChanges,
  onSave
}: WeddingTabProps) {
  const weddingDateRef = useRef<HTMLDivElement>(null);
  const maxBudgetRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const highlightWeddingLocation = searchParams?.get('highlight') === 'weddingLocation';

  // Scroll to Max budget input when jiggle animation is triggered
  React.useEffect(() => {
    if (jiggleMaxBudget && maxBudgetRef.current) {
      setTimeout(() => {
        maxBudgetRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }, 100); // Small delay to ensure the element is rendered
    }
  }, [jiggleMaxBudget]);

  return (
    <div className="space-y-6 pb-8">
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h5 className="mb-6">Wedding Details</h5>
        <div className="flex flex-col gap-4">
          <div ref={weddingDateRef} className={`relative col-span-1 ${jiggleAnimate}`}>
            <label htmlFor="wedding-date" className="block text-xs font-work-sans text-[#332B42] mb-1">When's the big day?*</label>
            <input
              id="wedding-date"
              type="date"
              value={weddingDate}
              onChange={(e) => setWeddingDate(e.target.value)}
              className="w-full px-3 py-2 border rounded border-[#AB9C95] text-sm focus:outline-none focus:ring-2 focus:ring-[#A85C36] appearance-none"
              placeholder="mm/dd/yyyy"
            />
          </div>
          <div className={`${highlightWeddingLocation ? 'animate-jiggle' : ''}`}>
            <label className="block text-xs font-work-sans text-[#332B42] mb-1">Where do you want to get married?*</label>
            <PlacesAutocompleteInput
              value={weddingLocation || ''}
              onChange={setWeddingLocation}
              setVenueMetadata={setSelectedVenueMetadata}
              setSelectedLocationType={setSelectedLocationType}
              placeholder="Enter wedding location"
              types={['geocode']}
              disabled={weddingLocationUndecided}
            />
            <div className="mt-2">
              <label className="flex items-center text-sm text-[#332B42]">
                <input
                  type="checkbox"
                  checked={weddingLocationUndecided}
                  onChange={(e) => setWeddingLocationUndecided(e.target.checked)}
                  className="form-checkbox rounded border-[#AB9C95] text-[#A85C36] mr-2"
                />
                We haven't decided yet
              </label>
            </div>
          </div>
          <div>
            <label className="block text-xs font-work-sans text-[#332B42] mb-2">Have you already found your venue?*</label>
            <div className="flex items-center gap-4">
              <label className="flex items-center text-sm text-[#332B42]">
                <input
                  type="radio"
                  name="hasVenue"
                  checked={hasVenue === true}
                  onChange={() => setHasVenue(true)}
                  className="form-radio border-[#AB9C95] text-[#A85C36] mr-2"
                />
                Yes
              </label>
              <label className="flex items-center text-sm text-[#332B42]">
                <input
                  type="radio"
                  name="hasVenue"
                  checked={hasVenue === false}
                  onChange={() => {
                    setHasVenue(false);
                    setSelectedVenueMetadata(null);
                  }}
                  className="form-radio border-[#AB9C95] text-[#A85C36] mr-2"
                />
                No
              </label>
            </div>
          </div>
          <AnimatePresence>
            {hasVenue && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div>
                  <label className="block text-xs font-work-sans text-[#332B42] mb-1">Search for your venue*</label>
                  {selectedVenueMetadata ? (
                    <VenueCard
                      venue={selectedVenueMetadata}
                      onDelete={() => {
                        setSelectedVenueMetadata(null);
                        setVenueSearch("");
                      }}
                    />
                  ) : (
                    <VenueSearchInput
                      value={venueSearch}
                      onChange={setVenueSearch}
                      setVenueMetadata={setSelectedVenueMetadata}
                      placeholder="Search for your venue"
                      weddingLocation={weddingLocation}
                    />
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {(vibe.length > 0 || generatedVibes.length > 0) && (
            <div>
              <label className="block text-xs font-work-sans text-[#332B42] mb-1">Wedding Vibe</label>
              <div className="flex flex-wrap gap-2">
                {[...vibe, ...generatedVibes].map((vibeItem, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 rounded-full border text-sm font-work-sans border-[#AB9C95] text-[#332B42] bg-white"
                  >
                    {vibeItem}
                  </span>
                ))}
              </div>
              <a href="/moodboards" className="text-xs text-[#A85C36] underline mt-2 inline-block hover:opacity-80">
                Update vibe
              </a>
            </div>
          )}
          <div>
            <label className="block text-xs font-work-sans text-[#332B42] mb-1">Guest Count</label>
            <input 
              type="number" 
              value={guestCount} 
              onChange={e => setGuestCount(Number(e.target.value))} 
              className="w-full px-3 py-2 border rounded border-[#AB9C95] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A85C36]" 
            />
          </div>
          

          <div ref={maxBudgetRef} className={jiggleMaxBudget}>
            <label className="block text-xs font-work-sans text-[#332B42] mb-1">What's your maximum budget?</label>
            <MaxBudgetInput
              value={maxBudget}
              onChange={setMaxBudget}
              placeholder="Enter your maximum budget"
            />
          </div>
        </div>
        <div className="flex justify-end items-center mt-6 gap-3">
          <button
            className="btn-primary px-8 py-2 rounded font-semibold text-base disabled:opacity-60"
            onClick={onSave}
            disabled={!hasUnsavedWeddingChanges || saving}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
} 