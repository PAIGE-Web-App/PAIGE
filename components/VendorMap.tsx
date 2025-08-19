"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
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
  currentPage?: number;
  itemsPerPage?: number;
}

// Custom map theme that matches the app's color scheme - defined outside component to prevent recreation
const mapTheme = [
  {
    featureType: 'all',
    elementType: 'geometry',
    stylers: [{ color: '#F3F2F0' }] // Light cream background
  },
  {
    featureType: 'all',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#332B42' }] // Dark text
  },
  {
    featureType: 'all',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#F3F2F0' }]
  },
  {
    featureType: 'administrative',
    elementType: 'geometry.fill',
    stylers: [{ color: '#E8E6E0' }] // Slightly darker cream
  },
  {
    featureType: 'landscape',
    elementType: 'geometry',
    stylers: [{ color: '#F8F7F5' }] // Very light cream
  },
  {
    featureType: 'poi',
    elementType: 'geometry',
    stylers: [{ color: '#E8E6E0' }]
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#FFFFFF' }] // White roads
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#D4D1CB' }] // Light gray road borders
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#332B42' }]
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#E8E6E0' }]
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#D4D1CB' }] // Light gray water
  }
];

const VendorMap: React.FC<VendorMapProps> = ({
  vendors,
  selectedVendor,
  onVendorSelect,
  hoveredVendor,
  currentPage = 1,
  itemsPerPage = 10
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [markers, setMarkers] = useState<any[]>([]);

  // Calculate which vendors to show based on pagination - memoized to prevent infinite re-renders
  const startIndex = useMemo(() => (currentPage - 1) * itemsPerPage, [currentPage, itemsPerPage]);
  const endIndex = useMemo(() => startIndex + itemsPerPage, [startIndex, itemsPerPage]);
  const visibleVendors = useMemo(() => vendors.slice(startIndex, endIndex), [vendors, startIndex, endIndex]);



  // Memoized function to update marker appearance
  const updateMarkerAppearance = useCallback((marker: any, vendor: any, isHovered: boolean, isSelected: boolean) => {
    if (!window.google) return;
    
    let scale = 8;
    let fillColor = '#AB9C95';
    let fillOpacity = 0.9;
    let strokeWeight = 2;

    if (isHovered) {
      scale = 10;
      fillColor = '#A85C36';
      fillOpacity = 1;
      strokeWeight = 3;
    } else if (isSelected) {
      scale = 8;
      fillColor = '#A85C36';
      fillOpacity = 0.9;
      strokeWeight = 2;
    }

    marker.setIcon({
      path: window.google.maps.SymbolPath.CIRCLE,
      scale,
      fillColor,
      fillOpacity,
      strokeColor: '#332B42',
      strokeWeight
    });
  }, []); // No dependencies needed - this function doesn't depend on any props or state

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
        gestureHandling: 'cooperative',
        styles: mapTheme, // Apply custom theme
        backgroundColor: '#F3F2F0' // Match theme background
      });

      setMap(newMap);

    } catch (error) {
      console.error('Error initializing map:', error);
      
      // Check for quota error specifically
      if (error.message && error.message.includes('OverQuotaMapError')) {
        console.error('Google Maps API quota exceeded. Please check your billing and quotas.');
        // You could set a state here to show a specific quota error message
      }
    }
  }, [vendors.length]); // mapTheme is now defined outside component, no need to depend on it

  // Add markers when map is ready and visible vendors change
  useEffect(() => {
    if (!map || !visibleVendors.length || !window.google) return;

    try {
      // Clear existing markers
      markers.forEach(marker => marker.setMap(null));

      const newMarkers: any[] = [];
      const bounds = new window.google.maps.LatLngBounds();

      visibleVendors.forEach((vendor, index) => {
        if (vendor.geometry?.location) {
          try {
            const marker = new window.google.maps.Marker({
              position: vendor.geometry.location,
              map,
              title: vendor.name,
              label: {
                text: (startIndex + index + 1).toString(),
                color: 'white',
                fontSize: '12px',
                fontWeight: 'bold'
              },
              icon: {
                path: window.google.maps.SymbolPath.CIRCLE,
                scale: 8,
                fillColor: selectedVendor?.place_id === vendor.place_id ? '#A85C36' : '#AB9C95',
                fillOpacity: 0.9,
                strokeColor: '#332B42',
                strokeWeight: 2
              }
            });

            // Add click event
            marker.addListener('click', () => {
              onVendorSelect(vendor);
            });

            newMarkers.push(marker);
            bounds.extend(vendor.geometry.location);
          } catch (error) {
            console.error('Error creating marker for vendor:', vendor.name, error);
          }
        }
      });

      setMarkers(newMarkers);

      // Fit map to show all visible markers
      if (newMarkers.length > 0) {
        map.fitBounds(bounds);
        
        // Add some padding to the bounds
        const listener = window.google.maps.event.addListener(map, 'idle', () => {
          if (map.getZoom() > 15) map.setZoom(15);
          window.google.maps.event.removeListener(listener);
        });
      }
    } catch (error) {
      console.error('Error updating markers:', error);
    }
  }, [map, visibleVendors, selectedVendor, startIndex]); // onVendorSelect is only used for event listeners, not effect logic

  // Update marker hover states when hoveredVendor or selectedVendor changes
  useEffect(() => {
    if (!markers.length || !window.google) return;

    markers.forEach((marker, index) => {
      const vendor = visibleVendors[index];
      if (vendor) {
        const isHovered = hoveredVendor?.place_id === vendor.place_id;
        const isSelected = selectedVendor?.place_id === vendor.place_id;
        updateMarkerAppearance(marker, vendor, isHovered, isSelected);
      }
    });
  }, [hoveredVendor, selectedVendor, markers, visibleVendors, updateMarkerAppearance]);

  if (!window.google?.maps) {
    return (
      <div className="bg-white border border-[#AB9C95] rounded-[5px] h-full min-h-[600px] flex flex-col">
        <div className="flex-1 bg-[#F3F2F0] flex items-center justify-center">
          <div className="text-center text-[#AB9C95]">
            <MapPin className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-sm">Google Maps API Quota Exceeded</p>
            <p className="text-xs mt-2">Please check your Google Cloud Console billing and quotas</p>
            <p className="text-xs mt-1 text-[#A85C36]">
              <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="underline">
                Go to Google Cloud Console
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (vendors.length === 0) {
    return (
      <div className="bg-white border border-[#AB9C95] rounded-[5px] h-full min-h-[600px] flex flex-col">
        <div className="flex-1 bg-[#F3F2F0] flex items-center justify-center">
          <div className="text-center text-[#AB9C95]">
            <MapPin className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-sm">No vendors found</p>
            <p className="text-xs mt-2">Try adjusting your search filters</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#AB9C95] rounded-[5px] h-full min-h-[600px] flex flex-col">
      <div className="flex-1 relative">
        <div ref={mapRef} className="w-full h-full rounded-b-[5px]" />
        {visibleVendors.length > 0 && (
          <div className="absolute bottom-4 left-4 bg-white border border-[#AB9C95] rounded-[5px] px-3 py-2 text-sm text-[#332B42] shadow-sm">
            Showing {startIndex + 1}-{Math.min(endIndex, vendors.length)} of {vendors.length} vendors
          </div>
        )}
      </div>
    </div>
  );
};

export default VendorMap;
