'use client';

import React, { useState, useEffect } from 'react';

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

async function fetchPlaceDetails(placeId) {
  if (!placeId) return null;
  const res = await fetch(`/api/google-place-details?placeId=${placeId}`);
  const data = await res.json();
  if (data.status === 'OK') return data.result;
  return null;
}

export default function AdminCurationPage() {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [flagged, setFlagged] = useState<any[]>([]);
  const [flaggedDetails, setFlaggedDetails] = useState<Record<string, any>>({});
  const [loadingFlagged, setLoadingFlagged] = useState(true);
  const [flaggedError, setFlaggedError] = useState<string | null>(null);
  const [unflagging, setUnflagging] = useState<string | null>(null);
  const [reviewingSuggestion, setReviewingSuggestion] = useState<string | null>(null);

  useEffect(() => {
    setLoadingSuggestions(true);
    fetch('/api/venue-suggestions')
      .then(res => res.json())
      .then(data => {
        if (data.suggestions && Array.isArray(data.suggestions)) {
          setSuggestions(data.suggestions);
        } else {
          setSuggestions([]);
        }
        setLoadingSuggestions(false);
      })
      .catch(err => {
        setSuggestionError('Failed to load suggestions');
        setLoadingSuggestions(false);
      });
  }, []);

  useEffect(() => {
    setLoadingFlagged(true);
    fetch('/api/flag-vendor')
      .then(res => res.json())
      .then(async data => {
        if (data.flagged && Array.isArray(data.flagged)) {
          setFlagged(data.flagged);
          // Fetch Google Places details for each flagged vendor
          const detailsObj = {};
          await Promise.all(
            data.flagged.map(async (f) => {
              const details = await fetchPlaceDetails(f.vendorId);
              if (details) detailsObj[f.vendorId] = details;
            })
          );
          setFlaggedDetails(detailsObj);
        } else {
          setFlagged([]);
        }
        setLoadingFlagged(false);
      })
      .catch(err => {
        setFlaggedError('Failed to load flagged vendors');
        setLoadingFlagged(false);
      });
  }, []);

  const handleApproveSuggestion = async (id) => {
    setReviewingSuggestion(id);
    try {
      await fetch('/api/venue-suggestions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, approved: true, rejected: false }),
      });
      setSuggestions(s => s.map(sug => sug.id === id ? { ...sug, approved: true, rejected: false } : sug));
    } catch (err) {
      alert('Failed to approve suggestion');
    } finally {
      setReviewingSuggestion(null);
    }
  };
  const handleRejectSuggestion = async (id) => {
    setReviewingSuggestion(id);
    try {
      await fetch('/api/venue-suggestions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, approved: false, rejected: true }),
      });
      setSuggestions(s => s.map(sug => sug.id === id ? { ...sug, approved: false, rejected: true } : sug));
    } catch (err) {
      alert('Failed to reject suggestion');
    } finally {
      setReviewingSuggestion(null);
    }
  };

  const handleUnflag = async (vendorId: string) => {
    setUnflagging(vendorId);
    try {
      const res = await fetch('/api/flag-vendor', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendorId }),
      });
      if (res.ok) {
        setFlagged(f => f.filter(v => v.vendorId !== vendorId));
        setFlaggedDetails(d => {
          const copy = { ...d };
          delete copy[vendorId];
          return copy;
        });
      } else {
        alert('Failed to unflag vendor');
      }
    } catch (err) {
      alert('Failed to unflag vendor');
    } finally {
      setUnflagging(null);
    }
  };

  // Helper to render a vendor card (matches VendorCatalogCard as much as possible)
  function renderVendorCard(flag, details) {
    const imgSrc = details?.photos?.length
      ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${details.photos[0].photo_reference}&key=${GOOGLE_API_KEY}`
      : '/Venue.png';
    return (
      <div className="h-full flex flex-col bg-white border rounded-[5px] p-4 items-start relative">
        <span className="absolute top-3 left-3 z-10 bg-red-100 text-red-600 px-2 py-1 rounded text-xs font-semibold border border-red-200">Flagged</span>
        <div className="w-full min-h-[128px] h-32 bg-[#F3F2F0] rounded mb-2 flex items-center justify-center overflow-hidden">
          <img
            src={imgSrc}
            alt={details?.name || flag.vendorId}
            className={`w-full h-full ${!details?.photos?.length ? 'object-contain' : 'object-cover'}`}
            onError={e => (e.currentTarget.src = '/Venue.png')}
          />
        </div>
        <div className="flex-1 w-full flex flex-col">
          <h5 className="mb-1" style={{ fontFamily: 'Playfair Display, serif', fontWeight: 500, fontSize: '1.125rem', lineHeight: 1.5, color: '#332B42' }}>{details?.name || 'Unknown Name'}</h5>
          {details?.types && details.types.length > 0 && (
            <div className="text-xs text-[#A85C36] font-semibold mb-1">{details.types[0]}</div>
          )}
          <div className="flex items-center gap-1 text-xs mb-1">
            {details?.rating && <span className="text-[#A85C36]">★ {details.rating}</span>}
            {details?.user_ratings_total && <span className="text-[#332B42]">({details.user_ratings_total})</span>}
          </div>
          {details?.price_level && (
            <div className="text-xs text-[#332B42] mb-1">{'$'.repeat(details.price_level)}</div>
          )}
          <div className="text-xs text-[#332B42] mb-1">{details?.formatted_address}</div>
          {details?.types && details.types.length > 0 && (
            <div className="text-xs text-[#AB9C95] mb-1">{details.types[0]}</div>
          )}
          {details?.website && (
            <a href={details.website} target="_blank" rel="noopener noreferrer" className="text-xs text-[#A85C36] underline mb-2 block">{details.website}</a>
          )}
          {/* Flag info */}
          <div className="mt-2 mb-1 px-3 py-1 bg-[#FDEDED] text-[#A85C36] text-xs font-semibold rounded shadow-sm">
            <div><span className="font-bold">Reason:</span> {flag.reason}</div>
            {flag.customReason && <div><span className="font-bold">Custom:</span> {flag.customReason}</div>}
            {flag.flaggedAt && <div><span className="font-bold">Flagged At:</span> {flag.flaggedAt}</div>}
            {flag.userId && <div><span className="font-bold">User ID:</span> {flag.userId}</div>}
          </div>
        </div>
        <button
          className="btn-primaryinverse mt-2 w-full"
          disabled={unflagging === flag.vendorId}
          onClick={() => handleUnflag(flag.vendorId)}
        >
          {unflagging === flag.vendorId ? 'Unflagging...' : 'Unflag'}
        </button>
      </div>
    );
  }

  // Helper to render a suggestion card (matches VendorCatalogCard as much as possible)
  function renderSuggestionCard(sug) {
    return (
      <div className="bg-white border rounded-[5px] p-4 flex flex-col items-start relative mb-4">
        <span className="absolute top-3 left-3 z-10 bg-blue-100 text-blue-600 px-2 py-1 rounded text-xs font-semibold border border-blue-200">Suggested</span>
        <div className="w-full h-32 bg-[#F3F2F0] rounded mb-2 flex items-center justify-center overflow-hidden">
          <img
            src={sug.image || '/Venue.png'}
            alt={sug.name}
            className={`w-full h-full ${!sug.image ? 'object-contain' : 'object-cover'}`}
            onError={e => (e.currentTarget.src = '/Venue.png')}
          />
        </div>
        <h5 className="mb-1" style={{ fontFamily: 'Playfair Display, serif', fontWeight: 500, fontSize: '1.125rem', lineHeight: 1.5, color: '#332B42' }}>{sug.name || 'Unknown Name'}</h5>
        {sug.category && (
          <div className="text-xs text-[#A85C36] font-semibold mb-1">{sug.category}</div>
        )}
        {sug.rating && (
          <div className="flex items-center gap-1 text-xs mb-1">
            <span className="text-[#A85C36]">★ {sug.rating}</span>
            {sug.reviewCount && <span className="text-[#332B42]">({sug.reviewCount})</span>}
          </div>
        )}
        {sug.price && (
          <div className="text-xs text-[#332B42] mb-1">{sug.price}</div>
        )}
        <div className="text-xs text-[#332B42] mb-1">{sug.address}</div>
        {sug.cuisine && (
          <div className="text-xs text-[#AB9C95] mb-1">{sug.cuisine}</div>
        )}
        {sug.website && (
          <a href={sug.website} target="_blank" rel="noopener noreferrer" className="text-xs text-[#A85C36] underline mb-2 block">{sug.website}</a>
        )}
        {sug.description && (
          <div className="mt-2 mb-1 px-3 py-1 bg-[#E6EEF6] text-[#364257] text-xs font-semibold rounded shadow-sm">{sug.description}</div>
        )}
        <div className="flex gap-2 mt-2">
          {sug.approved ? (
            <span className="text-green-600 font-semibold">Approved</span>
          ) : sug.rejected ? (
            <span className="text-red-600 font-semibold">Rejected</span>
          ) : (
            <>
              <button
                className="btn-primary"
                disabled={reviewingSuggestion === sug.id}
                onClick={() => handleApproveSuggestion(sug.id)}
              >
                {reviewingSuggestion === sug.id ? 'Approving...' : 'Approve'}
              </button>
              <button
                className="btn-primaryinverse"
                disabled={reviewingSuggestion === sug.id}
                onClick={() => handleRejectSuggestion(sug.id)}
              >
                {reviewingSuggestion === sug.id ? 'Rejecting...' : 'Reject'}
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="app-content-container py-8">
      <h2 className="text-2xl font-bold mb-6">Admin Curation Tool</h2>
      <section className="mb-8">
        <h3 className="text-lg font-semibold mb-2">Suggested Vendors</h3>
        {loadingSuggestions && <div className="text-gray-500">Loading suggestions...</div>}
        {suggestionError && <div className="text-red-500">{suggestionError}</div>}
        {!loadingSuggestions && suggestions.length === 0 && <div className="text-gray-500">No suggestions yet.</div>}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 items-stretch">
          {suggestions.map((s, idx) => (
            <div key={s.id || idx} className="h-full">
              {renderSuggestionCard(s)}
            </div>
          ))}
        </div>
      </section>
      <section>
        <h3 className="text-lg font-semibold mb-2">Flagged Vendors</h3>
        {loadingFlagged && <div className="text-gray-500">Loading flagged vendors...</div>}
        {flaggedError && <div className="text-red-500">{flaggedError}</div>}
        {!loadingFlagged && flagged.length === 0 && <div className="text-gray-500">No flagged vendors.</div>}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 items-stretch">
          {flagged.map((f, idx) => (
            <div key={f.vendorId || idx} className="h-full">
              {flaggedDetails[f.vendorId]
                ? renderVendorCard(f, flaggedDetails[f.vendorId])
                : <div className="border rounded p-4 bg-white text-xs text-gray-500 h-full">Loading vendor details...</div>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
} 