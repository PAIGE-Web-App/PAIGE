'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Users, DollarSign, MapPin, Edit3, Check, X, AlertTriangle } from 'lucide-react';
import { debounce } from '@/utils/requestBatcher';

interface WeddingDetailsAccordionProps {
  generatedData: any;
  onUpdateGeneratedData?: (updatedData: any) => void;
}

export default function WeddingDetailsAccordion({ generatedData, onUpdateGeneratedData }: WeddingDetailsAccordionProps) {
  const [showWeddingDetails, setShowWeddingDetails] = useState(true);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editedValues, setEditedValues] = useState<{[key: string]: any}>({});
  const [showRegenerationModal, setShowRegenerationModal] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<{[key: string]: any}>({});
  
  // Location autocomplete state
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const autocompleteService = useRef<any>(null);
  const sessionToken = useRef<any>(null);
  const locationInputRef = useRef<HTMLInputElement>(null);

  // Initialize Google Places Autocomplete service
  useEffect(() => {
    const initializeAutocomplete = () => {
      if (typeof window !== 'undefined' && window.google && window.google.maps && window.google.maps.places) {
        autocompleteService.current = new window.google.maps.places.AutocompleteService();
        sessionToken.current = new window.google.maps.places.AutocompleteSessionToken();
        console.log('✅ Google Places Autocomplete service initialized');
        return true;
      } else {
        console.log('❌ Google Places API not available');
        return false;
      }
    };

    // Try to initialize immediately
    if (!initializeAutocomplete()) {
      // If not available, set up a polling mechanism to check periodically
      const checkInterval = setInterval(() => {
        if (initializeAutocomplete()) {
          clearInterval(checkInterval);
        }
      }, 500);

      // Clean up interval after 10 seconds
      const timeout = setTimeout(() => {
        clearInterval(checkInterval);
        console.log('❌ Google Places API still not available after 10 seconds');
      }, 10000);

      return () => {
        clearInterval(checkInterval);
        clearTimeout(timeout);
      };
    }
  }, []);

  // Editing functions
  const handleEditField = (field: string, currentValue: any) => {
    setEditingField(field);
    const newEditedValues = {...editedValues, [field]: currentValue};
    
    if (field === 'weddingDate') {
      newEditedValues.weddingDateUndecided = currentValue === 'TBD' || !currentValue;
      // Convert date to YYYY-MM-DD format for HTML date input (fixed timezone issue)
      if (currentValue && currentValue !== 'TBD') {
        try {
          const date = new Date(currentValue);
          if (!isNaN(date.getTime())) {
            // Use local date to avoid timezone issues
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            newEditedValues.weddingDate = `${year}-${month}-${day}`;
          }
        } catch (error) {
          console.error('Error converting date:', error);
        }
      }
    }
    setEditedValues(newEditedValues);
  };

  const handleSaveFieldWithUpdate = (field: string) => {
    setEditingField(null);
    
    let hasChanges = false;
    const originalValue = getOriginalValue(field);
    const newValue = editedValues[field];

    if (field === 'weddingDate') {
      const originalUndecided = getOriginalValue('weddingDateUndecided');
      const newUndecided = editedValues.weddingDateUndecided;
      hasChanges = originalValue !== newValue || originalUndecided !== newUndecided;
    } else {
      hasChanges = originalValue !== newValue;
    }
    
    if (hasChanges) {
      const newPendingChanges = { ...pendingChanges };
      switch (field) {
        case 'weddingDate':
          newPendingChanges.weddingDate = editedValues.weddingDate;
          newPendingChanges.weddingDateUndecided = editedValues.weddingDateUndecided;
          break;
        case 'guestCount':
          newPendingChanges.guestCount = editedValues.guestCount;
          break;
        case 'budgetAmount':
          newPendingChanges.budgetAmount = editedValues.budgetAmount;
          break;
        case 'location':
          newPendingChanges.location = editedValues.location;
          break;
      }
      setPendingChanges(newPendingChanges);
      setShowRegenerationModal(true);
    }
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setEditedValues({});
  };

  const getOriginalValue = (field: string) => {
    switch (field) {
      case 'weddingDate':
        return generatedData?.weddingDate;
      case 'weddingDateUndecided':
        return generatedData?.weddingDate === 'TBD' || !generatedData?.weddingDate;
      case 'guestCount':
        return generatedData?.guestCount;
      case 'budgetAmount':
        return generatedData?.budgetAmount;
      case 'location':
        return generatedData?.location;
      default:
        return '';
    }
  };

  const handleRegeneratePlan = () => {
    setShowRegenerationModal(false);
    
    const updatedGeneratedData = { ...generatedData, ...pendingChanges };
    
    // Update the generatedData via callback prop
    if (onUpdateGeneratedData) {
      onUpdateGeneratedData(updatedGeneratedData);
    }
    
    setPendingChanges({});
    console.log('Regenerating plan with new values:', pendingChanges);
  };

  const handleCancelRegeneration = () => {
    setShowRegenerationModal(false);
    setPendingChanges({});
  };

  // Helper function to get current display value (pending changes take precedence)
  const getCurrentDisplayValue = (field: string) => {
    if (pendingChanges[field] !== undefined) {
      return pendingChanges[field];
    }
    return getOriginalValue(field);
  };

  // Location autocomplete functions
  const handleLocationSelect = (suggestion: any) => {
    setEditedValues({...editedValues, location: suggestion.description});
    setLocationSuggestions([]);
  };

  const debouncedLocationSearch = debounce((inputValue: string) => {
    console.log('🔍 Location search triggered:', inputValue);
    console.log('🔍 Autocomplete service available:', !!autocompleteService.current);
    
    if (!autocompleteService.current || inputValue.length < 2) {
      console.log('❌ No autocomplete service or input too short');
      setLocationSuggestions([]);
      return;
    }
    setIsLocationLoading(true);
    const request = {
      input: inputValue,
      types: ['geocode'],
      sessionToken: sessionToken.current,
    };
    console.log('🔍 Making autocomplete request:', request);
    autocompleteService.current.getPlacePredictions(request, (predictions: any[], status: any) => {
      console.log('🔍 Autocomplete response:', { status, predictions: predictions?.length || 0 });
      setIsLocationLoading(false);
      if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
        setLocationSuggestions(predictions);
        console.log('✅ Location suggestions set:', predictions.length);
      } else {
        setLocationSuggestions([]);
        console.log('❌ No location suggestions found');
      }
    });
  }, 300);

  const handleLocationInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    console.log('🔍 Location input changed:', inputValue);
    setEditedValues({...editedValues, location: inputValue});
    
    // Clear suggestions if input is empty
    if (!inputValue.trim()) {
      setLocationSuggestions([]);
      return;
    }

    // Use debounced search
    debouncedLocationSearch(inputValue);
  };

  return (
    <>
      {/* Wedding Details Accordion */}
      <div className="mb-6">
        <button
          onClick={() => setShowWeddingDetails(!showWeddingDetails)}
          className="flex items-center justify-between w-full p-3 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="font-work text-[#332B42] text-sm">Your Wedding Details</span>
            <span className="text-xs text-[#7A7A7A] bg-gray-100 px-2 py-1 rounded">
              {showWeddingDetails ? 'Hide' : 'Show'} details
            </span>
          </div>
          {showWeddingDetails ? (
            <svg className="w-4 h-4 text-[#7A7A7A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-[#7A7A7A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </button>
        
        <AnimatePresence>
          {showWeddingDetails && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-visible"
            >
              <div className="pt-3 pb-2 space-y-3 pl-4 bg-white rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {/* Wedding Date */}
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#A85C36] flex-shrink-0" />
                    <div className="flex-1">
                      <span className="text-[#7A7A7A] font-work">Wedding Date:</span>
                      {editingField === 'weddingDate' ? (
                        <div className="mt-1">
                          <div className="flex items-center gap-2">
                            <input
                              type="date"
                              value={editedValues.weddingDate || ''}
                              onChange={(e) => setEditedValues({...editedValues, weddingDate: e.target.value})}
                              disabled={editedValues.weddingDateUndecided}
                              className={`text-sm border border-gray-300 rounded px-2 py-1 text-[#332B42] font-work w-48 ${
                                editedValues.weddingDateUndecided 
                                  ? 'bg-[#F3F2F0] text-[#AB9C95] cursor-not-allowed' 
                                  : ''
                              }`}
                            />
                            <button
                              onClick={() => handleSaveFieldWithUpdate('weddingDate')}
                              className="p-1 text-green-600 hover:text-green-700"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="p-1 text-gray-400 hover:text-gray-600"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          <label className="flex items-center gap-2 mt-1 text-xs text-[#7A7A7A]">
                            <input
                              type="checkbox"
                              checked={editedValues.weddingDateUndecided}
                              onChange={(e) => setEditedValues({
                                ...editedValues, 
                                weddingDateUndecided: e.target.checked,
                                weddingDate: e.target.checked ? 'TBD' : editedValues.weddingDate
                              })}
                              className="rounded"
                            />
                            We haven't decided yet
                          </label>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[#332B42] font-work">
                            {getCurrentDisplayValue('weddingDate') === 'TBD' || !getCurrentDisplayValue('weddingDate') 
                              ? 'TBD' 
                              : new Date(getCurrentDisplayValue('weddingDate')).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'long', 
                                  day: 'numeric' 
                                })
                            }
                          </span>
                          <button
                            onClick={() => handleEditField('weddingDate', getCurrentDisplayValue('weddingDate'))}
                            className="p-1 text-gray-400 hover:text-gray-600"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Guest Count */}
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#A85C36] flex-shrink-0" />
                    <div className="flex-1">
                      <span className="text-[#7A7A7A] font-work">Guests:</span>
                      {editingField === 'guestCount' ? (
                        <div className="flex items-center gap-2 mt-1">
                            <input
                              type="number"
                              value={editedValues.guestCount || ''}
                              onChange={(e) => setEditedValues({...editedValues, guestCount: parseInt(e.target.value) || 0})}
                              className="text-sm border border-gray-300 rounded px-2 py-1 text-[#332B42] font-work w-24"
                              placeholder="Enter guest count"
                            />
                          <button
                            onClick={() => handleSaveFieldWithUpdate('guestCount')}
                            className="p-1 text-green-600 hover:text-green-700"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="p-1 text-gray-400 hover:text-gray-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[#332B42] font-work">{getCurrentDisplayValue('guestCount')}</span>
                          <button
                            onClick={() => handleEditField('guestCount', getCurrentDisplayValue('guestCount'))}
                            className="p-1 text-gray-400 hover:text-gray-600"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Budget */}
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-[#A85C36] flex-shrink-0" />
                    <div className="flex-1">
                      <span className="text-[#7A7A7A] font-work">Budget:</span>
                      {editingField === 'budgetAmount' ? (
                        <div className="flex items-center gap-2 mt-1">
                            <input
                              type="number"
                              value={editedValues.budgetAmount || ''}
                              onChange={(e) => setEditedValues({...editedValues, budgetAmount: parseInt(e.target.value) || 0})}
                              className="text-sm border border-gray-300 rounded px-2 py-1 text-[#332B42] font-work w-32"
                              placeholder="Enter budget"
                            />
                          <button
                            onClick={() => handleSaveFieldWithUpdate('budgetAmount')}
                            className="p-1 text-green-600 hover:text-green-700"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="p-1 text-gray-400 hover:text-gray-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[#332B42] font-work">
                            ${getCurrentDisplayValue('budgetAmount')?.toLocaleString()}
                          </span>
                          <button
                            onClick={() => handleEditField('budgetAmount', getCurrentDisplayValue('budgetAmount'))}
                            className="p-1 text-gray-400 hover:text-gray-600"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Location */}
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#A85C36] flex-shrink-0" />
                    <div className="flex-1">
                      <span className="text-[#7A7A7A] font-work">Location:</span>
                      {editingField === 'location' ? (
                        <div className="mt-1">
                          <div className="relative flex items-center gap-2">
                            <div className="relative">
                              <input
                                ref={locationInputRef}
                                type="text"
                                value={editedValues.location || ''}
                                onChange={handleLocationInputChange}
                                className="text-sm border border-gray-300 rounded px-2 py-1 text-[#332B42] font-work w-64"
                                placeholder="Enter location"
                              />
                              {locationSuggestions.length > 0 && (
                                <div className="absolute top-full left-0 right-0 z-[9999] mt-1">
                                  <ul className="bg-white border border-gray-300 rounded max-h-48 overflow-y-auto shadow-lg">
                                    {locationSuggestions.map((suggestion) => (
                                      <li
                                        key={suggestion.place_id}
                                        className="px-3 py-2 cursor-pointer hover:bg-gray-50 text-sm"
                                        onClick={() => handleLocationSelect(suggestion)}
                                      >
                                        {suggestion.description}
                                        <span className="text-xs text-gray-500 ml-2">
                                          {suggestion.types?.includes('locality') ? 'City' :
                                           suggestion.types?.includes('administrative_area_level_1') ? 'State' :
                                           suggestion.types?.includes('country') ? 'Country' : 'Location'}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {isLocationLoading && (
                                <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                                  <div className="w-4 h-4 border-2 border-gray-300 border-t-[#A85C36] rounded-full animate-spin"></div>
                                </div>
                              )}
                            </div>
                            <button
                              onClick={() => handleSaveFieldWithUpdate('location')}
                              className="p-1 text-green-600 hover:text-green-700"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="p-1 text-gray-400 hover:text-gray-600"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[#332B42] font-work">{getCurrentDisplayValue('location')}</span>
                          <button
                            onClick={() => handleEditField('location', getCurrentDisplayValue('location'))}
                            className="p-1 text-gray-400 hover:text-gray-600"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Regeneration Confirmation Modal */}
      {showRegenerationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]">
          <div className="bg-white rounded-[5px] shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#332B42]">Regenerate Wedding Plan?</h3>
              <button
                onClick={handleCancelRegeneration}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-[#7A7A7A]">
                  Updating your wedding details will regenerate your personalized plan. 
                  Any vendors you've already favorited will be cleared.
                </p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleCancelRegeneration}
                className="flex-1 btn-primaryinverse"
              >
                Cancel
              </button>
              <button
                onClick={handleRegeneratePlan}
                className="flex-1 btn-primary"
              >
                Regenerate Plan
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
