"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useCustomToast } from '@/hooks/useCustomToast';
import { ArrowLeft, Star, MapPin, Phone, Globe, Mail, MessageSquare } from 'lucide-react';
import VendorContactModal from '@/components/VendorContactModal';

interface VendorDetails {
  place_id: string;
  name: string;
  formatted_address: string;
  formatted_phone_number?: string;
  website?: string;
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  photos?: Array<{
    photo_reference: string;
    height: number;
    width: number;
  }>;
  types?: string[];
  url?: string;
  opening_hours?: {
    open_now: boolean;
    weekday_text?: string[];
  };
  reviews?: Array<{
    author_name: string;
    rating: number;
    text: string;
    time: number;
  }>;
}

export default function VendorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { showSuccessToast, showErrorToast } = useCustomToast();
  
  const [vendor, setVendor] = useState<VendorDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  const placeId = params?.placeId as string;

  useEffect(() => {
    if (!placeId) {
      setError('No vendor ID provided');
      setLoading(false);
      return;
    }

    const fetchVendorDetails = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/google-place-details?placeId=${placeId}`);
        const data = await response.json();

        if (data.status === 'OK' && data.result) {
          setVendor(data.result);
        } else {
          setError('Vendor not found');
        }
      } catch (err) {
        console.error('Error fetching vendor details:', err);
        setError('Failed to load vendor details');
      } finally {
        setLoading(false);
      }
    };

    fetchVendorDetails();
  }, [placeId]);

  const getVendorCategory = (types: string[] = []): string => {
    const typeToCategory: Record<string, string> = {
      'florist': 'Florist',
      'jewelry_store': 'Jewelry',
      'bakery': 'Bakery',
      'restaurant': 'Reception Venue',
      'hair_care': 'Hair & Beauty',
      'photographer': 'Photographer',
      'videographer': 'Videographer',
      'clothing_store': 'Bridal Salon',
      'beauty_salon': 'Beauty Salon',
      'spa': 'Spa',
      'dj': 'DJ',
      'band': 'Band',
      'wedding_planner': 'Wedding Planner',
      'caterer': 'Catering',
      'car_rental': 'Car Rental',
      'travel_agency': 'Travel Agency',
      'officiant': 'Officiant',
      'suit_rental': 'Suit/Tux Rental',
      'makeup_artist': 'Makeup Artist',
      'stationery': 'Stationery',
      'rentals': 'Rentals',
      'favors': 'Favors'
    };

    for (const type of types) {
      if (typeToCategory[type]) {
        return typeToCategory[type];
      }
    }
    return 'Vendor';
  };

  const handleContact = () => {
    if (!user) {
      showErrorToast('Please log in to contact vendors');
      return;
    }
    setShowContactModal(true);
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-linen">
        <div className="app-content-container flex flex-col gap-6 py-8">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-[#A85C36] hover:text-[#784528] transition-colors"
            >
              <ArrowLeft size={20} />
              Back
            </button>
          </div>
          <div className="flex items-center justify-center h-64">
            <div className="w-12 h-12 border-4 border-[#A85C36] border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !vendor) {
    return (
      <div className="flex flex-col min-h-screen bg-linen">
        <div className="app-content-container flex flex-col gap-6 py-8">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-[#A85C36] hover:text-[#784528] transition-colors"
            >
              <ArrowLeft size={20} />
              Back
            </button>
          </div>
          <div className="bg-white rounded-lg p-8 text-center">
            <h2 className="text-xl font-playfair font-semibold text-[#332B42] mb-2">Vendor Not Found</h2>
            <p className="text-[#364257] mb-4">{error || 'This vendor could not be found.'}</p>
            <button
              onClick={() => router.back()}
              className="btn-primary px-6 py-2"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-linen">
      <div className="app-content-container flex flex-col gap-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-[#A85C36] hover:text-[#784528] transition-colors"
          >
            <ArrowLeft size={20} />
            Back
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Photos */}
            {vendor.photos && vendor.photos.length > 0 && (
              <div className="bg-white rounded-lg overflow-hidden">
                <div className="relative h-64 md:h-80">
                  <img
                    src={`https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${vendor.photos[currentPhotoIndex].photo_reference}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`}
                    alt={vendor.name}
                    className="w-full h-full object-cover"
                  />
                  {vendor.photos.length > 1 && (
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                      {vendor.photos.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentPhotoIndex(index)}
                          className={`w-3 h-3 rounded-full transition-colors ${
                            index === currentPhotoIndex ? 'bg-white' : 'bg-white/50'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Vendor Info */}
            <div className="bg-white rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-playfair font-semibold text-[#332B42] mb-2">
                    {vendor.name}
                  </h1>
                  <div className="flex items-center gap-4 text-sm text-[#364257]">
                    <span className="bg-[#F3F2F0] px-3 py-1 rounded-full">
                      {getVendorCategory(vendor.types)}
                    </span>
                    {vendor.rating && (
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        <span>{vendor.rating}</span>
                        {vendor.user_ratings_total && (
                          <span>({vendor.user_ratings_total} reviews)</span>
                        )}
                      </div>
                    )}
                    {vendor.price_level !== undefined && (
                      <span>{'$'.repeat(vendor.price_level)}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-[#A85C36]" />
                  <span className="text-[#364257]">{vendor.formatted_address}</span>
                </div>
                {vendor.formatted_phone_number && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-[#A85C36]" />
                    <span className="text-[#364257]">{vendor.formatted_phone_number}</span>
                  </div>
                )}
                {vendor.website && (
                  <div className="flex items-center gap-3">
                    <Globe className="w-5 h-5 text-[#A85C36]" />
                    <a
                      href={vendor.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#A85C36] hover:text-[#784528] underline"
                    >
                      Visit Website
                    </a>
                  </div>
                )}
              </div>

              {/* Opening Hours */}
              {vendor.opening_hours && (
                <div className="mb-6">
                  <h3 className="font-semibold text-[#332B42] mb-2">Hours</h3>
                  <div className="text-sm text-[#364257]">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`w-2 h-2 rounded-full ${vendor.opening_hours.open_now ? 'bg-green-500' : 'bg-red-500'}`}></span>
                      <span>{vendor.opening_hours.open_now ? 'Open now' : 'Closed now'}</span>
                    </div>
                    {vendor.opening_hours.weekday_text && (
                      <div className="space-y-1">
                        {vendor.opening_hours.weekday_text.map((day, index) => (
                          <div key={index} className="text-xs">{day}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Reviews */}
              {vendor.reviews && vendor.reviews.length > 0 && (
                <div>
                  <h3 className="font-semibold text-[#332B42] mb-3">Recent Reviews</h3>
                  <div className="space-y-3">
                    {vendor.reviews.slice(0, 3).map((review, index) => (
                      <div key={index} className="border-l-4 border-[#A85C36] pl-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{review.author_name}</span>
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-yellow-500 fill-current" />
                            <span className="text-xs">{review.rating}</span>
                          </div>
                        </div>
                        <p className="text-sm text-[#364257] line-clamp-3">{review.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Card */}
            <div className="bg-white rounded-lg p-6">
              <h3 className="font-semibold text-[#332B42] mb-4">Contact Vendor</h3>
              <div className="space-y-3">
                <button
                  onClick={handleContact}
                  className="w-full btn-primary flex items-center justify-center gap-2 py-3"
                >
                  <MessageSquare size={16} />
                  Send Message
                </button>
                {vendor.website && (
                  <a
                    href={vendor.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full btn-primaryinverse flex items-center justify-center gap-2 py-3"
                  >
                    <Globe size={16} />
                    Visit Website
                  </a>
                )}
                {vendor.formatted_phone_number && (
                  <a
                    href={`tel:${vendor.formatted_phone_number}`}
                    className="w-full btn-primaryinverse flex items-center justify-center gap-2 py-3"
                  >
                    <Phone size={16} />
                    Call Now
                  </a>
                )}
              </div>
            </div>

            {/* Quick Info */}
            <div className="bg-white rounded-lg p-6">
              <h3 className="font-semibold text-[#332B42] mb-4">Quick Info</h3>
              <div className="space-y-2 text-sm text-[#364257]">
                <div className="flex justify-between">
                  <span>Category:</span>
                  <span className="font-medium">{getVendorCategory(vendor.types)}</span>
                </div>
                {vendor.rating && (
                  <div className="flex justify-between">
                    <span>Rating:</span>
                    <span className="font-medium">{vendor.rating}/5</span>
                  </div>
                )}
                {vendor.user_ratings_total && (
                  <div className="flex justify-between">
                    <span>Reviews:</span>
                    <span className="font-medium">{vendor.user_ratings_total}</span>
                  </div>
                )}
                {vendor.price_level !== undefined && (
                  <div className="flex justify-between">
                    <span>Price Level:</span>
                    <span className="font-medium">{'$'.repeat(vendor.price_level)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Modal */}
      {showContactModal && vendor && (
        <VendorContactModal
          vendor={{
            id: vendor.place_id,
            name: vendor.name,
            location: vendor.formatted_address,
            rating: vendor.rating,
            reviewCount: vendor.user_ratings_total,
            image: vendor.photos && vendor.photos.length > 0
              ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${vendor.photos[0].photo_reference}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
              : '/Venue.png',
            price: vendor.price_level !== undefined ? '$'.repeat(vendor.price_level) : '',
            address: vendor.formatted_address,
            types: vendor.types || []
          }}
          isOpen={showContactModal}
          onClose={() => setShowContactModal(false)}
        />
      )}
    </div>
  );
} 