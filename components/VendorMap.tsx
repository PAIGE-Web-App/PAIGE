"use client";

import React, { useEffect, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';

// TypeScript declarations for Google Maps
declare global {
  interface Window {
    google: any;
  }
}

interface VendorMapProps {
  vendors: any[];
  selectedVendor: any;
  onVendorSelect: (vendor: any) => void;
  hoveredVendor?: any;
}

const VendorMap: React.FC<VendorMapProps> = ({
  vendors,
  selectedVendor,
  onVendorSelect,
  hoveredVendor
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [markers, setMarkers] = useState<any[]>([]);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || !window.google?.maps || vendors.length === 0) return;

    try {
      const center = { lat: 32.7767, lng: -96.7970 }; // Dallas, TX

      const newMap = new window.google.maps.Map(mapRef.current, {
        center,
        zoom: 11,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: true,
        gestureHandling: 'cooperative'
      });

      setMap(newMap);
      console.log('Map initialized successfully');
    } catch (error) {
      console.error('Error initializing map:', error);
    }
  }, [vendors.length]);

  // Add markers when map is ready and vendors change
  useEffect(() => {
    if (!map || !vendors.length || !window.google) return;

    try {
      // Clear existing markers
      markers.forEach(marker => marker.setMap(null));

      const newMarkers: any[] = [];
      const bounds = new window.google.maps.LatLngBounds();

      vendors.forEach((vendor, index) => {
        if (vendor.geometry?.location) {
          try {
            const marker = new window.google.maps.Marker({
              position: vendor.geometry.location,
              map,
              title: vendor.name,
              label: {
                text: (index + 1).toString(),
                color: 'white',
                fontSize: '12px',
                fontWeight: 'bold'
              },
              icon: {
                path: window.google.maps.SymbolPath.CIRCLE,
                scale: 8,
                fillColor: '#A85C36',
                fillOpacity: 1,
                strokeColor: '#332B42',
                strokeWeight: 2
              }
            });

            // Add click listener
            marker.addListener('click', () => {
              onVendorSelect(vendor);
            });

            newMarkers.push(marker);
            bounds.extend(vendor.geometry.location);
          } catch (markerError) {
            console.error(`Error creating marker for vendor ${vendor.name}:`, markerError);
          }
        }
      });

      setMarkers(newMarkers);

      // Fit bounds if we have markers
      if (newMarkers.length > 0) {
        map.fitBounds(bounds);
        console.log(`Successfully created ${newMarkers.length} markers`);
      }
    } catch (error) {
      console.error('Error creating markers:', error);
    }
  }, [map, vendors, onVendorSelect]);

  // Handle vendor hover highlighting
  useEffect(() => {
    if (!markers.length || !window.google) return;

    markers.forEach((marker, index) => {
      const vendor = vendors[index];
      const isHovered = hoveredVendor?.place_id === vendor?.place_id;
      const isSelected = selectedVendor?.place_id === vendor?.place_id;

      let color = '#A85C36'; // Default color
      let scale = 8;

      if (isHovered) {
        color = '#784528'; // Darker on hover
        scale = 10;
      } else if (isSelected) {
        color = '#A85C36'; // Selected color
        scale = 9;
      }

      marker.setIcon({
        path: window.google.maps.SymbolPath.CIRCLE,
        scale,
        fillColor: color,
        fillOpacity: 1,
        strokeColor: '#332B42',
        strokeWeight: isHovered || isSelected ? 3 : 2
      });
    });
  }, [markers, hoveredVendor, selectedVendor, vendors]);

  // Show loading state while waiting for Google Maps
  if (!window.google?.maps) {
    return (
      <div className="bg-white border border-[#AB9C95] rounded-[5px] h-full flex flex-col">
        <div className="p-4 border-b border-[#AB9C95]">
          <h3 className="font-semibold text-[#332B42]">Map View</h3>
        </div>
        <div className="flex-1 bg-[#F3F2F0] flex items-center justify-center">
          <div className="text-center text-[#AB9C95]">
            <MapPin className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-sm">Loading map...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show empty state if no vendors
  if (vendors.length === 0) {
    return (
      <div className="bg-white border border-[#AB9C95] rounded-[5px] h-full flex flex-col">
        <div className="p-4 border-b border-[#AB9C95]">
          <h3 className="font-semibold text-[#332B42]">Map View</h3>
        </div>
        <div className="flex-1 bg-[#F3F2F0] flex items-center justify-center">
          <div className="text-center text-[#AB9C95]">
            <MapPin className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-sm">No vendors to display</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#AB9C95] rounded-[5px] h-full flex flex-col">
      <div className="p-4 border-b border-[#AB9C95] flex items-center justify-between">
        <h3 className="font-semibold text-[#332B42]">Map View</h3>
        <span className="text-sm text-[#AB9C95]">
          {vendors.filter(v => v.geometry?.location).length} locations
        </span>
      </div>
      
      <div className="flex-1 relative">
        <div
          ref={mapRef}
          className="w-full h-full"
          style={{ minHeight: '400px' }}
        />
        
        {/* Vendor count overlay */}
        <div className="absolute bottom-4 right-4 bg-white bg-opacity-90 px-3 py-2 rounded shadow-sm">
          <p className="text-sm text-[#332B42] font-medium">
            {vendors.filter(v => v.geometry?.location).length} vendors on map
          </p>
        </div>
      </div>
    </div>
  );
};

export default VendorMap;
