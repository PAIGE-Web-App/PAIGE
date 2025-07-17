import React, { useState, useEffect } from 'react';
import FlagVendorModal from './FlagVendorModal';
import VendorContactModal from './VendorContactModal';
import VendorEmailBadge from './VendorEmailBadge';

function getFavorites() {
  if (typeof window === 'undefined') return [];
  return JSON.parse(localStorage.getItem('vendorFavorites') || '[]');
}
function setFavorites(favs) {
  localStorage.setItem('vendorFavorites', JSON.stringify(favs));
}

export default function VendorCatalogCard({ vendor, onContact, onFlagged, bulkContactMode = false, isSelected = false, onSelectionChange }) {
  const [imgSrc, setImgSrc] = useState(vendor.image);
  const isPlaceholder = imgSrc === '/Venue.png';
  const [isFavorite, setIsFavorite] = useState(false);
  const [isFlagged, setIsFlagged] = useState(false);
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);



  useEffect(() => {
    const favs = getFavorites();
    setIsFavorite(favs.includes(vendor.id));
    // Fetch flagged vendors from backend
    fetch('/api/flag-vendor')
      .then(res => res.json())
      .then(data => {
        if (data.flagged && data.flagged.some(f => f.vendorId === vendor.id)) {
          setIsFlagged(true);
        }
      });
  }, [vendor.id]);

  const toggleFavorite = () => {
    const favs = getFavorites();
    let updated;
    if (favs.includes(vendor.id)) {
      updated = favs.filter(id => id !== vendor.id);
    } else {
      updated = [...favs, vendor.id];
    }
    setFavorites(updated);
    setIsFavorite(updated.includes(vendor.id));
  };

  const handleFlagVendor = async (reason, customReason) => {
    setIsSubmitting(true);
    try {
      await fetch('/api/flag-vendor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          vendorId: vendor.id,
          reason,
          customReason
        }),
      });
      setIsFlagged(true);
      setShowFlagModal(false);
      if (onFlagged) {
        onFlagged(vendor.id);
      }
    } catch (error) {
      console.error('Error flagging vendor:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCardClick = (e) => {
    // Only handle card clicks in bulk mode
    if (!bulkContactMode) return;
    
    // Don't trigger if clicking on interactive elements
    if (e.target.closest('button') || e.target.closest('input') || e.target.closest('a')) {
      return;
    }
    
    // Toggle selection
    if (onSelectionChange) {
      onSelectionChange(vendor.id);
    }
  };

  return (
    <div 
      className={`bg-white border rounded-[5px] p-4 flex flex-col items-start relative h-full${isFlagged ? ' border-red-500' : ''}${isSelected ? ' border-[#A85C36] border-2' : ''}${bulkContactMode ? ' cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={handleCardClick}
    >

      {/* Bulk selection checkbox */}
      {bulkContactMode && (
        <div className="absolute z-20 top-3 left-3 bg-white rounded shadow-sm p-1">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelectionChange && onSelectionChange(vendor.id)}
            className="w-5 h-5 text-[#A85C36] bg-white border-2 border-[#A85C36] rounded focus:ring-[#A85C36] focus:ring-2 cursor-pointer"
          />
        </div>
      )}
      
      {/* Heart icon - hidden in bulk mode */}
      {!bulkContactMode && (
        <button
          className="absolute z-10 bg-white/80 rounded-full p-1 shadow hover:bg-[#F8F6F4]"
          style={{ top: '1.25rem', right: '1.25rem', border: 'none', position: 'absolute' }}
          onClick={toggleFavorite}
          aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          {isFavorite ? (
            <svg width="24" height="24" fill="#A85C36" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
          ) : (
            <svg width="24" height="24" fill="none" stroke="#A85C36" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
          )}
        </button>
      )}
      {/* Flag button */}
      {!bulkContactMode && !isFlagged && (
        <button
          className="absolute top-3 left-3 z-10 bg-white/80 rounded-full p-1 shadow hover:bg-red-100 text-xs text-red-600 border border-red-200"
          onClick={() => setShowFlagModal(true)}
          aria-label="Flag vendor"
          style={{ border: 'none' }}
        >
          🚩 Flag
        </button>
      )}
      {!bulkContactMode && isFlagged && (
        <span className="absolute top-3 left-3 z-10 bg-red-100 text-red-600 px-2 py-1 rounded text-xs font-semibold border border-red-200">Flagged</span>
      )}
      <div className="w-full min-h-[128px] h-32 bg-[#F3F2F0] rounded mb-2 flex items-center justify-center overflow-hidden">
        <img
          src={imgSrc}
          alt={vendor.name}
          className={`w-full h-full ${isPlaceholder ? 'object-contain' : 'object-cover'}`}
          onError={() => setImgSrc('/Venue.png')}
        />
      </div>
      <div className="flex-1 w-full flex flex-col">
        <h5 className="mb-1" style={{ fontFamily: 'Playfair Display, serif', fontWeight: 500, fontSize: '1.125rem', lineHeight: 1.5, color: '#332B42' }}>{vendor.name}</h5>
        <div className="flex items-center gap-1 text-xs mb-1">
          <span className="text-[#A85C36]">★ {vendor.rating}</span>
          <span className="text-[#332B42]">({vendor.reviewCount})</span>
        </div>
        {vendor.price && (
          <div className="text-xs text-[#332B42] mb-1">{vendor.price}</div>
        )}
        <div className="text-xs text-[#332B42] mb-1">{vendor.address || vendor.location}</div>
        {vendor.mainTypeLabel && (
          <div className="text-xs text-[#AB9C95] mb-1">{vendor.mainTypeLabel}</div>
        )}
        {vendor.source && vendor.source.url && (
          <a href={vendor.source.url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#A85C36] underline mb-2 block">{vendor.source.name}</a>
        )}
        
        {/* Vendor Email Badge */}
        <VendorEmailBadge placeId={vendor.id} className="mb-2" />
        
        {/* Price estimate badge */}
        {vendor.estimate && (
          <div className="mt-2 mb-1 px-3 py-1 bg-[#E6EEF6] text-[#364257] text-base font-semibold rounded shadow-sm">
            Estimate {vendor.estimate}
          </div>
        )}
      </div>
      <button 
        className="btn-primary w-full mt-auto" 
        onClick={() => setShowContactModal(true)}
        disabled={bulkContactMode}
      >
        Contact
      </button>
      
      {/* Flag Vendor Modal */}
      {showFlagModal && (
        <FlagVendorModal
          vendor={vendor}
          onClose={() => setShowFlagModal(false)}
          onSubmit={handleFlagVendor}
          isSubmitting={isSubmitting}
        />
      )}

      {/* Contact Modal */}
      <VendorContactModal
        vendor={vendor}
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
      />
    </div>
  );
} 