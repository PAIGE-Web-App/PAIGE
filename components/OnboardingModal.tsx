// components/OnboardingModal.tsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle, Mail, MessageSquare, Phone, Bell, Smartphone } from "lucide-react";
import FormField from "./FormField";
import SelectField from "./SelectField";
import { v4 as uuidv4 } from "uuid";
import { saveContactToFirestore } from "../lib/saveContactToFirestore";
import { getAllCategories, saveCategoryIfNew } from "../lib/firebaseCategories";
import toast from "react-hot-toast";
import CategoryPill from "./CategoryPill";
import CategorySelectField from "./CategorySelectField";
import { getUserCollectionRef } from "../lib/firebase";
import { collection, query, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import Stepper from './Stepper';
import OnboardingModalBase from "./OnboardingModalBase";
import VendorSearchField from "./VendorSearchField";
import { useUserProfileData } from "../hooks/useUserProfileData";

interface OnboardingContact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  category: string;
  website: string | null;
  avatarColor: string;
  userId: string;
  orderIndex?: number;
  // Vendor association fields
  placeId?: string | null;
  isVendorContact?: boolean;
}

interface OnboardingModalProps {
  userId: string;
  onClose: () => void;
  onComplete: (contacts: OnboardingContact[], selectedChannels: string[]) => Promise<void>; 
}

// Moved outside the component
const getRandomAvatarColor = () => {
  const adaColors = [
    "#1565C0", // Darker Blue
    "#2E7D32", // Darker Green
    "#6A1B9A", // Darker Purple
    "#EF6C00", // Darker Orange
    "#303F9F", // Darker Indigo
    "#00838F", // Darker Cyan
    "#AD1457", // Darker Pink
    "#558B2F", // Darker Light Green
    "#4E342E", // Darker Brown
    "#00695C"  // Darker Teal
  ];
  return adaColors[Math.floor(Math.random() * adaColors.length)];
};

// Moved outside the component
const defaultCategories = ["Photographer", "Caterer", "Florist", "DJ", "Venue"];

// Add triggerGmailImport function
const triggerGmailImport = async (userId: string, contacts: OnboardingContact[]) => {
  try {
    const response = await fetch('/api/start-gmail-import', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        contacts,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to start Gmail import');
    }

    console.log('Gmail import started successfully:', data);
    return data;
  } catch (error) {
    console.error('Error starting Gmail import:', error);
    throw error;
  }
};

export default function OnboardingModal({ userId, onClose, onComplete }: OnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [onboardingContacts, setOnboardingContacts] = useState<OnboardingContact[]>([
    {
      id: uuidv4(),
      name: "",
      email: null,
      phone: null,
      category: "",
      website: null,
      avatarColor: getRandomAvatarColor(),
      userId: userId,
      orderIndex: 0,
    },
  ]);
  const [customCategoryInputs, setCustomCategoryInputs] = useState<{ [key: string]: string }>({});
  const [selectedCommunicationChannels, setSelectedCommunicationChannels] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, Record<string, string>>>({});
  const [channelErrors, setChannelErrors] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [selectedVendors, setSelectedVendors] = useState<{ [key: string]: any }>({});

  const [gmailAuthStatus, setGmailAuthStatus] = useState<'idle' | 'pending' | 'success' | 'failed'>('idle');
  const { weddingLocation } = useUserProfileData();
  const [geoLocation, setGeoLocation] = useState<string | null>(null);

  // Location detection for vendor search
  useEffect(() => {
    if (!weddingLocation && !geoLocation) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (position) => {
          const { latitude, longitude } = position.coords;
          // Use a reverse geocoding API to get city/state from lat/lng
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await res.json();
          const city = data.address.city || data.address.town || data.address.village || '';
          const state = data.address.state || '';
          setGeoLocation(`${city}${city && state ? ', ' : ''}${state}` || 'United States');
        }, () => setGeoLocation('United States'));
      } else {
        setGeoLocation('United States');
      }
    }
  }, [weddingLocation, geoLocation]);

  const vendorSearchLocation = weddingLocation || geoLocation || 'United States';

  // Get relevant categories for vendor search
  const getRelevantCategories = (contactCategory: string): string[] => {
    // If no category is selected, search across all wedding vendor categories
    if (!contactCategory || contactCategory === '') {
      return ['jewelry_store', 'florist', 'bakery', 'restaurant', 'hair_care', 'photographer', 'videographer', 'clothing_store', 'beauty_salon', 'spa', 'dj', 'band', 'wedding_planner', 'caterer', 'car_rental', 'travel_agency', 'officiant', 'suit_rental', 'makeup_artist', 'stationery', 'rentals', 'favors'];
    }

    // If category is selected, map to specific Google Places types
    const categoryToGoogleTypes: Record<string, string[]> = {
      'Jewelry': ['jewelry_store'],
      'Florist': ['florist'],
      'Bakery': ['bakery'],
      'Reception Venue': ['restaurant'],
      'Hair & Beauty': ['hair_care', 'beauty_salon'],
      'Photographer': ['photographer'],
      'Videographer': ['videographer'],
      'Bridal Salon': ['clothing_store'],
      'Beauty Salon': ['beauty_salon'],
      'Spa': ['spa'],
      'DJ': ['dj'],
      'Band': ['band'],
      'Wedding Planner': ['wedding_planner'],
      'Catering': ['caterer'],
      'Car Rental': ['car_rental'],
      'Travel Agency': ['travel_agency'],
      'Officiant': ['officiant'],
      'Suit/Tux Rental': ['suit_rental'],
      'Makeup Artist': ['makeup_artist'],
      'Stationery': ['stationery'],
      'Rentals': ['rentals'],
      'Favors': ['favors']
    };

    // Get the relevant Google Places types for this category
    const relevantTypes = categoryToGoogleTypes[contactCategory] || [];
    
    // If we have specific types, use them; otherwise fall back to all categories
    return relevantTypes.length > 0 ? relevantTypes : ['jewelry_store', 'florist', 'bakery', 'restaurant', 'hair_care', 'photographer', 'videographer', 'clothing_store', 'beauty_salon', 'spa', 'dj', 'band', 'wedding_planner', 'caterer', 'car_rental', 'travel_agency', 'officiant', 'suit_rental', 'makeup_artist', 'stationery', 'rentals', 'favors'];
  };

  // Handle vendor selection for a specific contact
  const handleVendorSelect = (contactId: string, vendor: any) => {
    setSelectedVendors(prev => ({ ...prev, [contactId]: vendor }));
    
    // Update the contact with vendor association
    setOnboardingContacts(prev => prev.map(contact => {
      if (contact.id === contactId) {
        return {
          ...contact,
          placeId: vendor.place_id,
          isVendorContact: true,
          // Auto-populate website and phone if available
          website: vendor.website || contact.website,
          phone: vendor.formatted_phone_number || contact.phone
        };
      }
      return contact;
    }));
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gmailAuth = params.get('gmailAuth');
    const userId = params.get('userId');

    console.log("OnboardingModal: useEffect running. gmailAuth param:", gmailAuth, "userId:", userId); 

    if (gmailAuth === 'success' && userId === userId) {
      setGmailAuthStatus('success');
      toast.success("Gmail connected successfully!");
      setCurrentStep(4);
      console.log("OnboardingModal: Gmail auth success. Setting currentStep to 4.");

      // Trigger Gmail import
      const triggerImport = async () => {
        try {
          if (!userId) {
            console.error("OnboardingModal: userId is null, cannot proceed with Gmail import");
            toast.error("User ID is missing. Please try again.");
            return;
          }
          const contactsCollectionRef = getUserCollectionRef<OnboardingContact>("contacts", userId);
          const contactsQuery = query(contactsCollectionRef);
          const contactsSnapshot = await getDocs(contactsQuery);
          const contacts = contactsSnapshot.docs.map(doc => doc.data() as OnboardingContact);
          
          console.log("OnboardingModal: Triggering Gmail import with contacts:", contacts);
          await triggerGmailImport(userId, contacts);
          console.log("OnboardingModal: Gmail import completed successfully");
        } catch (error) {
          console.error("OnboardingModal: Error during Gmail import:", error);
          toast.error("Failed to import Gmail messages. Please try again.");
        }
      };

      triggerImport();
    } else if (gmailAuth === 'error') {
      setGmailAuthStatus('failed');
      toast.error("Failed to connect Gmail. Please try again.");
      setCurrentStep(3);
      console.log("OnboardingModal: Gmail auth error. Setting currentStep to 3.");
    }

    // Clean up URL parameters
    if (gmailAuth) {
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
      console.log("OnboardingModal: Cleaned URL parameters.");
    }
  }, [userId]);

  const handleContactChange = useCallback((index: number, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setOnboardingContacts((prevContacts) => {
      const updatedContacts = [...prevContacts];
      updatedContacts[index] = { ...updatedContacts[index], [name]: value };
      return updatedContacts;
    });

    setErrors((prevErrors) => {
      const newErrors = { ...prevErrors };
      const contactId = onboardingContacts[index].id;
      if (newErrors[contactId]) {
        delete newErrors[contactId][name];
        if (Object.keys(newErrors[contactId]).length === 0) {
          delete newErrors[contactId];
        }
      }
      return newErrors;
    });
  }, [onboardingContacts]);

  const handleCustomCategoryChange = useCallback((contactId: string, value: string) => {
    setCustomCategoryInputs((prev) => ({ ...prev, [contactId]: value }));
  }, []);

  const addContactForm = useCallback(() => {
    setOnboardingContacts((prev) => [
      ...prev,
      {
        id: uuidv4(),
        name: "",
        email: null,
        phone: null,
        category: "",
        website: null,
        avatarColor: getRandomAvatarColor(),
        userId: userId,
        orderIndex: Date.now(),
      },
    ]);
  }, [userId]);

  const removeContactForm = useCallback((id: string) => {
    setOnboardingContacts((prev) => prev.filter((contact) => contact.id !== id));
    setCustomCategoryInputs((prev) => {
      const newCustom = { ...prev };
      delete newCustom[id];
      return newCustom;
    });
    setErrors((prevErrors) => {
      const newErrors = { ...prevErrors };
      delete newErrors[id];
      return newErrors;
    });
  }, []);

  const validateStep1 = useCallback(() => {
    let isValid = true;
    const newErrors: Record<string, Record<string, string>> = {};

    onboardingContacts.forEach((contact) => {
      newErrors[contact.id] = {};
      if (!contact.name.trim()) {
        newErrors[contact.id].name = "Name is required.";
        isValid = false;
      }
      if (!contact.category) {
        newErrors[contact.id].category = "Category is required.";
        isValid = false;
      }
      if (contact.category === "Other" && !customCategoryInputs[contact.id]?.trim()) {
        newErrors[contact.id].customCategory = "Custom category is required.";
        isValid = false;
      }
      if (contact.email && contact.email.trim() && !/\S+@\S+\.\S+/.test(contact.email)) {
        newErrors[contact.id].email = "Invalid email format.";
        isValid = false;
      }
      if (contact.phone && contact.phone.trim() && !/^\+?[0-9\s\-()]{7,20}$/.test(contact.phone)) {
        newErrors[contact.id].phone = "Invalid phone number format.";
        isValid = false;
      }
      if (!contact.phone?.trim() && !contact.email?.trim()) {
        newErrors[contact.id].phone = "Either phone or email must be provided";
        newErrors[contact.id].email = "Either phone or email must be provided";
        isValid = false;
      }
      if (Object.keys(newErrors[contact.id]).length === 0) {
        delete newErrors[contact.id];
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [onboardingContacts, customCategoryInputs]);

  const handleNext = useCallback(async () => {
    if (currentStep === 1) {
      if (!validateStep1()) {
        toast.error("Please correct the errors in the contact forms.");
        return;
      }
      setIsSaving(true);
      try {
        const contactsToSave = onboardingContacts.map(contact => {
          const finalCategory = contact.category === "Other"
            ? customCategoryInputs[contact.id]?.trim() || "Other"
            : contact.category;

          return {
            ...contact,
            category: finalCategory,
            email: contact.email?.trim() || null,
            phone: contact.phone?.trim() || null,
            website: contact.website?.trim() || null,
            orderIndex: contact.orderIndex !== undefined ? contact.orderIndex : Date.now(),
          };
        });

        console.log("OnboardingModal: onboardingContacts before saving:", contactsToSave);

        for (const contact of contactsToSave) {
            const currentCategoryName = contact.category;
            await saveCategoryIfNew(currentCategoryName, userId);
        }

        for (const contact of contactsToSave) {
          await saveContactToFirestore(contact);
        }
        toast.success("Contacts saved successfully!");
        setErrors({});
        setCurrentStep(currentStep + 1);
      } catch (error) {
        console.error("Error saving contacts:", error);
        toast.error("Failed to save contacts. Please try again.");
      } finally {
        setIsSaving(false);
      }
    } else if (currentStep === 2) {
      if (selectedCommunicationChannels.length === 0) {
        setChannelErrors("Please select at least one communication channel.");
        toast.error("Please select at least one communication channel.");
        return;
      }
      setChannelErrors("");
      setCurrentStep(currentStep + 1);
    } else if (currentStep === 3) {
      if (selectedCommunicationChannels.includes('Gmail') && gmailAuthStatus !== 'success') {
        toast.error("Please connect Gmail to proceed.");
        return;
      }
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep, validateStep1, onboardingContacts, customCategoryInputs, userId, selectedCommunicationChannels, gmailAuthStatus]);

  const handleBack = useCallback(() => {
    setCurrentStep((prevStep) => prevStep - 1);
  }, []);

  const handleChannelToggle = useCallback((channel: string) => {
    setSelectedCommunicationChannels((prev) =>
      prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel]
    );
    setChannelErrors("");
  }, []);

  const handleGmailAuth = useCallback(() => {
    setGmailAuthStatus('pending');
    const redirectUri = encodeURIComponent(`${window.location.origin}${window.location.pathname}`);
    console.log("OnboardingModal: Initiating Gmail Auth. redirectUri:", decodeURIComponent(redirectUri));
    window.location.href = `/api/auth/google/initiate?userId=${userId}&redirectUri=${redirectUri}`;
  }, [userId]);

  const handleComplete = useCallback(() => {
    onComplete(onboardingContacts, selectedCommunicationChannels);
    onClose();
  }, [onComplete, onboardingContacts, selectedCommunicationChannels, onClose]);

  const steps = [
    { id: 1, name: "Add vendor details" },
    { id: 2, name: "Communication Channels" },
    { id: 3, name: "Authorize" },
    { id: 4, name: "Complete" },
  ];

  return (
    <OnboardingModalBase
      isOpen={true}
      onClose={onClose}
      steps={steps}
      currentStep={currentStep}
      onStepChange={(step) => setCurrentStep(Number(step))}
      sidebarTitle="Set up your unified inbox"
      footer={
        <div className="flex gap-4 justify-end w-full">
          {currentStep > 1 && currentStep < 4 && (
            <button onClick={handleBack} className="btn-primaryinverse">
              Back
            </button>
          )}
          {currentStep < 4 ? (
            <button
              onClick={handleNext}
              className="btn-primary"
              disabled={isSaving || (currentStep === 3 && selectedCommunicationChannels.includes('Gmail') && gmailAuthStatus === 'pending')}
            >
              {isSaving ? "Saving..." : "Save & Continue"}
            </button>
          ) : (
            <button onClick={handleComplete} className="btn-primary">
              Go to Dashboard
            </button>
          )}
        </div>
      }
    >
      <div className="flex-1 overflow-y-auto p-8 pt-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="w-full"
          >
            {currentStep === 1 && (
              <div>
                <div className="space-y-6">
                  {onboardingContacts.map((contact, index) => (
                    <div key={contact.id} className="p-4 border border-[#AB9C95] rounded-[5px] bg-white relative">
                      {onboardingContacts.length > 1 && (
                        <button
                          onClick={() => removeContactForm(contact.id)}
                          className="absolute top-2 right-2 text-[#7A7A7A] hover:text-red-600"
                          aria-label="Remove contact"
                        >
                          <X size={16} />
                        </button>
                      )}
                      <div className="flex items-center gap-3 mb-4">
                        <div
                          className="h-8 w-8 min-w-[32px] min-h-[32px] flex items-center justify-center rounded-full text-white text-[14px] font-normal font-work-sans"
                          style={{ backgroundColor: contact.avatarColor || "#364257" }}
                        >
                          {contact.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                        <div>
                          <h4 className="text-lg font-playfair font-semibold text-[#332B42]">
                            Contact {index + 1}
                          </h4>
                          {contact.category === "Other" && customCategoryInputs[contact.id] ? (
                            <CategoryPill category={customCategoryInputs[contact.id]} />
                          ) : (
                            contact.category && <CategoryPill category={contact.category} />
                          )}
                        </div>
                      </div>
                      <div className="space-y-4">
                        <FormField
                          label={
                            <>
                              Contact Name<span className="text-[#A85C36]">*</span>
                            </>
                          }
                          name="name"
                          value={contact.name}
                          onChange={(e) => handleContactChange(index, e)}
                          placeholder="Enter contact's full name"
                          error={errors[contact.id]?.name}
                        />
                        <CategorySelectField
                          userId={userId}
                          value={contact.category}
                          customCategoryValue={customCategoryInputs[contact.id] || ""}
                          onChange={(e) => handleContactChange(index, e)}
                          onCustomCategoryChange={(e) => handleCustomCategoryChange(contact.id, e.target.value)}
                          error={errors[contact.id]?.category}
                          customCategoryError={errors[contact.id]?.customCategory}
                          label="Category"
                          placeholder="Select Category"
                        />
                        
                        {/* Vendor Association */}
                        {(contact.email || contact.phone) && (
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-[#332B42]">
                              Link to Vendor (Optional)
                            </label>
                            <VendorSearchField
                              value={selectedVendors[contact.id]}
                              onChange={(vendor) => handleVendorSelect(contact.id, vendor)}
                              onClear={() => {
                                setSelectedVendors(prev => {
                                  const newSelected = { ...prev };
                                  delete newSelected[contact.id];
                                  return newSelected;
                                });
                                // Remove vendor association from contact
                                setOnboardingContacts(prev => prev.map(c => 
                                  c.id === contact.id 
                                    ? { ...c, placeId: null, isVendorContact: false }
                                    : c
                                ));
                              }}
                              placeholder={contact.category ? `Search for ${contact.category} vendors...` : "Search for any wedding vendor..."}
                              disabled={false}
                              categories={getRelevantCategories(contact.category)}
                              location={vendorSearchLocation}
                            />
                            <p className="text-xs text-gray-600">
                              {contact.category 
                                ? `Searching within ${contact.category} category. Clear category to search all vendors.`
                                : "Searching across all wedding vendor categories. Select a category to narrow your search."
                              }
                              {selectedVendors[contact.id] && (
                                <span className="block mt-1 text-green-600">
                                  ✓ Website and phone info auto-populated from Google
                                </span>
                              )}
                            </p>
                          </div>
                        )}

                        <FormField
                          label="Contact Email"
                          name="email"
                          value={contact.email || ""}
                          onChange={(e) => handleContactChange(index, e)}
                          placeholder="Enter contact's email"
                          error={errors[contact.id]?.email}
                        />
                        <FormField
                          label="Contact Phone Number"
                          name="phone"
                          value={contact.phone || ""}
                          onChange={(e) => handleContactChange(index, e)}
                          placeholder="e.g., 123-456-7890"
                          error={errors[contact.id]?.phone}
                        />
                        <FormField
                          label="Website (Optional)"
                          name="website"
                          value={contact.website || ""}
                          onChange={(e) => handleContactChange(index, e)}
                          placeholder="Enter contact's website"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={addContactForm}
                  className="mt-6 text-[#A85C36] hover:text-[#784528] text-sm font-medium flex items-center gap-1"
                >
                  + Add another vendor
                </button>
              </div>
            )}

            {currentStep === 2 && (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> {/* Adjusted for mobile */}
                  <label className={`flex items-center p-4 border rounded-[5px] cursor-pointer transition-all duration-200 ${
                    selectedCommunicationChannels.includes("Gmail")
                      ? "border-[#A85C36] bg-[#EBE3DD]"
                      : "border-[#AB9C95] bg-white hover:bg-[#F8F6F4]"
                  }`}>
                    <input
                      type="checkbox"
                      checked={selectedCommunicationChannels.includes("Gmail")}
                      onChange={() => handleChannelToggle("Gmail")}
                      className="form-checkbox rounded text-[#A85C36] focus:ring-[#A85C36] mr-3"
                    />
                    <div className="flex items-center">
                      <Mail size={20} className="text-red-500 mr-2" />
                      <div>
                        <span className="font-medium text-[#332B42] block">Gmail Integration</span>
                        <span className="text-xs text-[#7A7A7A]">Import existing conversations & add footers to emails</span>
                      </div>
                    </div>
                  </label>

                  <label className={`flex items-center p-4 border rounded-[5px] cursor-pointer transition-all duration-200 ${
                    selectedCommunicationChannels.includes("SMS")
                      ? "border-[#A85C36] bg-[#EBE3DD]"
                      : "border-[#AB9C95] bg-white hover:bg-[#F8F6F4]"
                  }`}>
                    <input
                      type="checkbox"
                      checked={selectedCommunicationChannels.includes("SMS")}
                      onChange={() => handleChannelToggle("SMS")}
                      className="form-checkbox rounded text-[#A85C36] focus:ring-[#A85C36] mr-3"
                    />
                    <div className="flex items-center">
                      <Bell size={20} className="text-green-500 mr-2" />
                      <div>
                        <span className="font-medium text-[#332B42] block">SMS Notifications</span>
                        <span className="text-xs text-[#7A7A7A]">Get notified when you receive new messages</span>
                      </div>
                    </div>
                  </label>

                  <label className={`flex items-center p-4 border rounded-[5px] cursor-pointer transition-all duration-200 ${
                    selectedCommunicationChannels.includes("InApp")
                      ? "border-[#A85C36] bg-[#EBE3DD]"
                      : "border-[#AB9C95] bg-white hover:bg-[#F8F6F4]"
                  }`}>
                    <input
                      type="checkbox"
                      checked={selectedCommunicationChannels.includes("InApp")}
                      onChange={() => handleChannelToggle("InApp")}
                      className="form-checkbox rounded text-[#A85C36] focus:ring-[#A85C36] mr-3"
                    />
                    <div className="flex items-center">
                      <MessageSquare size={20} className="text-blue-500 mr-2" />
                      <div>
                        <span className="font-medium text-[#332B42] block">In-App Messaging</span>
                        <span className="text-xs text-[#7A7A7A]">Message vendors directly through Paige</span>
                      </div>
                    </div>
                  </label>

                  <label className={`flex items-center p-4 border rounded-[5px] cursor-pointer transition-all duration-200 ${
                    selectedCommunicationChannels.includes("Push")
                      ? "border-[#A85C36] bg-[#EBE3DD]"
                      : "border-[#AB9C95] bg-white hover:bg-[#F8F6F4]"
                  }`}>
                    <input
                      type="checkbox"
                      checked={selectedCommunicationChannels.includes("Push")}
                      onChange={() => handleChannelToggle("Push")}
                      className="form-checkbox rounded text-[#A85C36] focus:ring-[#A85C36] mr-3"
                    />
                    <div className="flex items-center">
                      <Smartphone size={20} className="text-purple-500 mr-2" />
                      <div>
                        <span className="font-medium text-[#332B42] block">Push Notifications</span>
                        <span className="text-xs text-[#7A7A7A]">Real-time alerts for new messages</span>
                      </div>
                    </div>
                  </label>
                </div>
                {channelErrors && <p className="text-xs text-red-500 mt-2">{channelErrors}</p>}
              </div>
            )}

            {currentStep === 3 && (
              <div>
                {selectedCommunicationChannels.includes('Gmail') && (
                  <div className="p-4 border rounded-md flex items-center justify-between shadow-sm bg-white mb-4">
                    <div className="flex items-center">
                      <Mail size={24} className="text-red-500 mr-3" />
                      <div>
                        <p className="font-semibold text-[#332B42]">Connect Gmail</p>
                        <p className="text-xs text-[#7A7A7A]">Allows Paige to scan your Gmail for vendor conversations.</p>
                      </div>
                    </div>
                    {gmailAuthStatus === 'idle' && (
                      <button onClick={handleGmailAuth} className="btn-secondary px-4 py-2 text-sm">
                        Connect
                      </button>
                    )}
                    {gmailAuthStatus === 'pending' && (
                      <span className="text-sm text-gray-500 flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Connecting...
                      </span>
                    )}
                    {gmailAuthStatus === 'success' && (
                      <span className="text-sm text-green-600 flex items-center">
                        <CheckCircle size={16} className="mr-1" /> Connected
                      </span>
                    )}
                    {gmailAuthStatus === 'failed' && (
                      <button onClick={handleGmailAuth} className="btn-primary px-4 py-2 text-sm bg-red-600 hover:bg-red-700">
                        Retry Connection
                      </button>
                    )}
                  </div>
                )}

                {(selectedCommunicationChannels.includes('SMS') || selectedCommunicationChannels.includes('Push')) && (
                  <div className="p-4 border border-blue-200 bg-blue-50 rounded-md text-sm text-blue-800">
                    <p className="font-semibold mb-1">Notification Setup:</p>
                    <p>You'll be able to configure SMS and push notifications in your settings after onboarding. These will alert you when you receive new messages from vendors through Paige.</p>
                  </div>
                )}

                {selectedCommunicationChannels.includes('InApp') && (
                  <div className="p-4 border border-green-200 bg-green-50 rounded-md text-sm text-green-800">
                    <p className="font-semibold mb-1">In-App Messaging:</p>
                    <p>You can now message vendors directly through Paige, just like Airbnb or Rover. All conversations stay within the app for better organization and tracking.</p>
                  </div>
                )}

                {selectedCommunicationChannels.length === 0 && (
                    <p className="text-sm text-gray-500 italic text-center">No communication channels selected. Click "Save & Continue" to proceed.</p>
                )}
              </div>
            )}

            {currentStep === 4 && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <img src="/celebration.svg" alt="Celebration" className="w-48 h-48 mb-6" />
                <h3 className="text-xl font-playfair font-semibold text-[#332B42] mb-2">You're All Set!</h3>
                <p className="text-sm text-[#364257] mb-6 max-w-md">
                  Your unified inbox is now ready. Start managing all your wedding communications in one place.
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </OnboardingModalBase>
  );
}
