// components/EditContactModal.tsx
import React, { useState, useEffect, useCallback } from "react";
import { X, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { doc, deleteDoc, updateDoc, collection, getDocs, writeBatch } from "firebase/firestore";
import { db, getUserCollectionRef } from "../lib/firebase"; // Import getUserCollectionRef
import { getCategoryStyle } from "../utils/categoryStyle";
import LoadingSpinner from "./LoadingSpinner";

import FormField from "./FormField";
import EmailFormField from "./EmailFormField";
import { getAllCategories, saveCategoryIfNew } from "../lib/firebaseCategories";
import CategorySelectField from "./CategorySelectField";
import Banner from './Banner'; // NEW: Import the Banner component
import { useCustomToast } from "../hooks/useCustomToast"; // ADD THIS LINE
import { Contact } from "../types/contact";
import CategoryPill from "./CategoryPill"; // ADD THIS LINE
import VendorSearchField from "./VendorSearchField"; // ADD THIS LINE
import { useUserProfileData } from "../hooks/useUserProfileData";
import { getRelevantCategories } from "../utils/vendorSearchUtils";
import { VENDOR_CATEGORIES } from '@/constants/vendorCategories';


interface EditContactModalProps {
  contact: Contact;
  userId: string;
  onClose: () => void;
  onSave: (updatedContact: Contact) => void;
  onDelete: (deletedId: string) => void;
  jiggleEmailField?: boolean;
}

// Moved outside the component
function getRandomAvatarColor() {
  const avatarColors = [
    "#4B3E6E", "#3C5A99", "#264653", "#2A9D8F", "#1D3557", "#6D597A",
    "#7D4F50", "#5D3A00", "#3A405A", "#4A5759", "#2E4057", "#3E3E3E"
  ];
  return avatarColors[Math.floor(Math.random() * avatarColors.length)];
}

export default function EditContactModal({
  contact,
  userId,
  onClose,
  onSave,
  onDelete,
  jiggleEmailField = false,
}: EditContactModalProps) {
  const [formData, setFormData] = useState({
    name: contact.name || "",
    email: contact.email || "",
    phone: contact.phone || "",
    category: contact.category || "",
    website: contact.website || "",
    avatarColor: (contact.avatarColor && typeof contact.avatarColor === 'string') ? contact.avatarColor : '#364257',
    userId: userId,
    orderIndex: contact.orderIndex !== undefined ? contact.orderIndex : 0,
  });

  // Get the standard category labels from centralized categories
  const standardCategoryLabels = VENDOR_CATEGORIES.map(cat => cat.label);
  
  const [customCategory, setCustomCategory] = useState(
    contact.category && !standardCategoryLabels.includes(contact.category)
      ? contact.category
      : ""
  );
  const [errors, setErrors] = useState<{ email?: string; phone?: string; name?: string; category?: string; customCategory?: string }>({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { showSuccessToast, showErrorToast, showInfoToast } = useCustomToast(); // ADD THIS LINE

  // Memoized callback to prevent infinite re-renders
  const handleEmailValidationChange = useCallback((isValid: boolean, warning?: string) => {
    if (!isValid && warning) {
      setErrors(prev => ({ ...prev, email: warning }));
    } else if (errors.email && isValid) {
      setErrors(prev => ({ ...prev, email: undefined }));
    }
  }, [errors.email]);
  
  // Use centralized vendor search utility
  // getRelevantCategories is now imported from utils/vendorSearchUtils
  
  // Vendor association state
  const [selectedVendor, setSelectedVendor] = useState<any>(null);
  const [isLoadingVendor, setIsLoadingVendor] = useState(false);
  const { weddingLocation } = useUserProfileData();
  const [geoLocation, setGeoLocation] = useState<string | null>(null);

  // Handle vendor selection and auto-populate fields
  const handleVendorSelect = async (vendor: any) => {
    setSelectedVendor(vendor);
    
    // Auto-populate website if available (always update with vendor data)
    if (vendor.website) {
      setFormData(prev => ({ ...prev, website: vendor.website }));
    }
    
    // Auto-populate phone if available (always update with vendor data)
    if (vendor.formatted_phone_number) {
      setFormData(prev => ({ ...prev, phone: vendor.formatted_phone_number }));
    }

    // Add vendor to user's personal vendor collection and community database
    try {
      const { addVendorToUserAndCommunity } = await import('@/lib/addVendorToUserAndCommunity');
      
      // Add to user's personal vendor collection
      const result = await addVendorToUserAndCommunity({
        userId,
        vendorMetadata: vendor,
        category: formData.category || 'Vendor',
        selectedAsVenue: false,
        selectedAsVendor: true
      });

      if (result.success) {
        console.log('Successfully added vendor to personal collection and community database');
      } else {
        console.error('Failed to add vendor to personal collection:', result.error);
      }
    } catch (error) {
      console.error('Error adding vendor to personal collection and community database:', error);
      // Don't fail the operation if this fails
    }

  };
 

  useEffect(() => {
    console.log('EditContactModal: Contact data received:', contact);
    console.log('EditContactModal: Contact placeId:', contact.placeId);
    console.log('EditContactModal: Full contact object:', JSON.stringify(contact, null, 2));
    
    setFormData({
      name: contact.name || "",
      email: contact.email || "",
      phone: contact.phone || "",
      category: contact.category || "",
      website: contact.website || "",
      avatarColor: (contact.avatarColor && typeof contact.avatarColor === 'string') ? contact.avatarColor : '#364257',
      userId: userId,
      orderIndex: contact.orderIndex !== undefined ? contact.orderIndex : 0,
    });
    setCustomCategory(
      contact.category && !standardCategoryLabels.includes(contact.category)
        ? contact.category
        : ""
    );
    setErrors({});
    setConfirmDelete(false);
    
    // Pre-populate vendor if contact already has a placeId
    if (contact.placeId) {
      console.log('EditContactModal: Contact has placeId, fetching vendor details');
      setIsLoadingVendor(true);
      fetchVendorDetails(contact.placeId);
    } else {
      console.log('EditContactModal: Contact has no placeId');
    }
  }, [contact, userId]);

  const fetchVendorDetails = async (placeId: string) => {
    try {
      console.log('Fetching vendor details for placeId:', placeId);
      
      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 10000)
      );
      
      const fetchPromise = fetch(`/api/google-place-details?placeId=${placeId}`);
      const response = await Promise.race([fetchPromise, timeoutPromise]) as Response;
      const data = await response.json();
      
      console.log('Vendor details response:', data);
      if (data.status === 'OK' && data.result) {
        setSelectedVendor(data.result);
        console.log('Set selected vendor:', data.result);
        
        // Update form data with vendor details
        setFormData(prev => {
          const updates: any = {};
          
          // Update phone if vendor has it and contact doesn't
          if (data.result.formatted_phone_number && !prev.phone) {
            updates.phone = data.result.formatted_phone_number;
          }
          
          // Update website if vendor has a real website (not Google Maps)
          if (data.result.website && !data.result.website.includes('maps.google.com')) {
            // Only update if contact doesn't have a real website
            const hasRealWebsite = prev.website && !prev.website.includes('maps.google.com');
            if (!hasRealWebsite) {
              updates.website = data.result.website;
            }
          }
          
          return { ...prev, ...updates };
        });
      } else {
        console.error('Failed to fetch vendor details:', data);
      }
    } catch (error) {
      console.error('Error fetching vendor details:', error);
      // Show error toast if needed
      showErrorToast('Failed to load vendor details. You can still search for vendors.');
    } finally {
      setIsLoadingVendor(false);
    }
  };

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


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    setErrors((prevErrors) => {
      const newErrors = { ...prevErrors };
      if (newErrors[name as keyof typeof newErrors]) {
        delete newErrors[name as keyof typeof newErrors];
      }
      return newErrors;
    });
  };

  const handleCustomCategoryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomCategory(e.target.value);
    setErrors((prevErrors) => {
      const newErrors = { ...prevErrors };
      if (newErrors.customCategory) {
        delete newErrors.customCategory;
      }
      return newErrors;
    });
  };

  const validate = () => {
    const newErrors: { email?: string; phone?: string; name?: string; category?: string; customCategory?: string } = {};
    if (!formData.name.trim()) {
      newErrors.name = "Name is required.";
    }
    if (!formData.category.trim()) {
      newErrors.category = "Category is required.";
    }
    if (formData.category === "Other" && !customCategory.trim()) {
      newErrors.customCategory = "Custom category is required.";
    }
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Invalid email format.";
    }
    if (formData.phone && !/^\+?[0-9\s\-()]{7,20}$/.test(formData.phone)) {
      newErrors.phone = "Invalid phone number format.";
    }
    if (!formData.phone.trim() && !formData.email.trim()) {
      newErrors.phone = "Either phone or email must be provided";
      newErrors.email = "Either phone or email must be provided";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      showErrorToast("Please correct the errors in the form."); // USE CUSTOM TOAST
      return;
    }

    let categoryToSave = formData.category;
    if (formData.category === "Other" && customCategory.trim()) {
      categoryToSave = customCategory.trim();
      await saveCategoryIfNew(categoryToSave, userId);
    }

    const updatedContact: Contact = {
      ...contact,
      name: formData.name,
      email: formData.email.trim() ? formData.email.trim() : null,
      phone: formData.phone.trim() ? formData.phone.trim() : null,
      category: categoryToSave,
      website: formData.website.trim() ? formData.website.trim() : null,
      avatarColor: formData.avatarColor || '#364257',
      orderIndex: formData.orderIndex,
      userId: formData.userId,
      // Update vendor association if a new vendor was selected
      placeId: selectedVendor?.place_id || contact.placeId || null,
      isVendorContact: !!selectedVendor || contact.isVendorContact || false,
    };

    try {
      // Use getUserCollectionRef to get the correct document path
      const contactRef = doc(getUserCollectionRef( "contacts", userId), contact.id);
      
      // Create a clean update object that excludes undefined values
      const updateData: any = {
        name: updatedContact.name,
        email: updatedContact.email,
        phone: updatedContact.phone,
        category: updatedContact.category,
        website: updatedContact.website,
        avatarColor: updatedContact.avatarColor,
        orderIndex: updatedContact.orderIndex,
        userId: updatedContact.userId,
        placeId: updatedContact.placeId,
        isVendorContact: updatedContact.isVendorContact,
      };
      
      // Only include isOfficial if it's defined
      if (contact.isOfficial !== undefined) {
        updateData.isOfficial = contact.isOfficial;
      }
      
      await updateDoc(contactRef, updateData);
      console.log('EditContactModal: Contact saved with placeId:', updatedContact.placeId);
      console.log('EditContactModal: Updated contact data:', updatedContact);
      
      // Create verified email if vendor is associated and contact has email
      if (selectedVendor && formData.email) {
        console.log('🔗 Creating verified email for vendor:', selectedVendor.name, 'with email:', formData.email);
        try {
          const emailResponse = await fetch('/api/vendor-emails', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              placeId: selectedVendor.place_id,
              vendorName: selectedVendor.name,
              vendorAddress: selectedVendor.formatted_address,
              vendorCategory: formData.category || 'Vendor',
              email: formData.email,
              contactName: formData.name,
              role: formData.category || 'Contact',
              userId
            })
          });

          const emailData = await emailResponse.json();
          console.log('🔗 Email API response:', emailData);

          if (emailResponse.ok) {
            console.log('✅ Successfully created verified email for vendor');
            
            // Clear the vendor email cache so new emails show up immediately
            try {
              const VendorEmailQueue = (await import('@/utils/vendorEmailQueue')).default;
              const queue = VendorEmailQueue.getInstance();
              queue.clearCache();
              console.log('🔄 Cleared vendor email cache');
            } catch (error) {
              console.error('Failed to clear vendor email cache:', error);
            }
            
            showSuccessToast('Contact associated with vendor and verified email added!');
          } else {
            console.error('❌ Failed to create verified email for vendor:', emailData);
            showSuccessToast('Contact updated successfully! (Note: Verified email creation failed)');
          }
        } catch (error) {
          console.error('❌ Error creating verified email for vendor:', error);
          showSuccessToast('Contact updated successfully! (Note: Verified email creation failed)');
        }
      } else {
        showSuccessToast("Contact updated successfully!");
      }
      
      onSave(updatedContact);
      onClose();
    } catch (error) {
      console.error("Error updating contact:", error);
      showErrorToast("Failed to update contact. Please try again."); // USE CUSTOM TOAST
    }
  };

  const handleDelete = async () => {
    try {
      if (contact.id && userId) {
        // Delete all messages for this contact
        const messagesRef = collection(db, `users/${userId}/contacts/${contact.id}/messages`);
        const messagesSnap = await getDocs(messagesRef);
        if (!messagesSnap.empty) {
          const batch = writeBatch(db);
          messagesSnap.docs.forEach(doc => batch.delete(doc.ref));
          await batch.commit();
        }
        // Now delete the contact document
        await deleteDoc(doc(getUserCollectionRef("contacts", userId), contact.id));
        onDelete(contact.id);
        showSuccessToast("Contact deleted!");
        onClose();
      } else {
        showErrorToast("Contact ID or User ID is missing. Cannot delete.");
      }
    } catch (error: any) {
      console.error("Error deleting contact:", error);
      showErrorToast(`Failed to delete contact: ${error.message}`);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50">
        <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -50, opacity: 0 }}
        className="bg-white rounded-[5px] shadow-xl max-w-xl w-full h-[90vh] max-h-[600px] flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fixed Header */}
        <div className="flex-shrink-0 bg-white border-b border-[#AB9C95] px-6 py-4 flex items-center justify-between">
          <h5 className="h5 text-left">Edit Contact</h5>
          <button
            onClick={onClose}
            className="text-[#7A7A7A] hover:text-[#332B42] p-1 rounded-full"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
      <div className="flex flex-col items-center mb-4">
        <div
          className="h-8 w-8 flex items-center justify-center rounded-full text-white text-[14px] font-normal font-work-sans"
          style={{ backgroundColor: formData.avatarColor || '#364257' }}
        >
          {formData.name
            ? formData.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
            : "?"}
        </div>

        {(formData.category !== "Other" || customCategory.trim() !== "") && (
          <div className="mt-3">
            <CategoryPill category={formData.category === "Other" ? customCategory.trim() : formData.category} />
          </div>
        )}
      </div>

      {confirmDelete && (
        <Banner
          message="Are you sure? All chat history will be lost :("
          type="error"
          // Removed onDismiss prop to make it not dismissable
        />
      )}

      <div className="space-y-2">
        <FormField
          label="Name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="Enter name"
          error={errors.name}
        />

        <div className={jiggleEmailField ? 'animate-jiggle' : ''}>
          <EmailFormField
            label="Email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Enter email"
            error={errors.email}
            onValidationChange={handleEmailValidationChange}
          />
        </div>

        <CategorySelectField
          userId={userId}
          value={formData.category}
          customCategoryValue={customCategory}
          onChange={handleChange}
          onCustomCategoryChange={handleCustomCategoryChange}
          error={errors.category}
          customCategoryError={errors.customCategory}
          label="Category"
          placeholder="Select a Category"
        />

        {/* Vendor Association Section */}
        {(formData.email || formData.phone) && (
          <div className="mt-4">
            <label className="block space-y-1">
              <span className="text-xs font-medium text-[#332B42]">Link to Vendor (Optional)</span>
              {isLoadingVendor ? (
                <div className="flex items-center gap-2 p-3 bg-gray-50 border border-[#AB9C95] rounded-[5px]">
                  <LoadingSpinner size="sm" />
                  <span className="text-sm text-gray-600">Loading linked vendor...</span>
                </div>
              ) : selectedVendor ? (
                <div className="p-3 bg-gray-50 border border-[#AB9C95] rounded-[5px]">
                  <div className="flex items-center justify-between mb-2">
                    <h6 className="h6 m-0">{selectedVendor.name}</h6>
                    <button
                      onClick={() => setSelectedVendor(null)}
                      className="text-gray-500 hover:text-gray-700 p-1"
                      aria-label="Remove vendor link"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-1 text-xs text-gray-700">
                    <div><strong>Name:</strong> {selectedVendor.name}</div>
                    {selectedVendor.formatted_address && (
                      <div><strong>Address:</strong> {selectedVendor.formatted_address}</div>
                    )}
                    {selectedVendor.formatted_phone_number && (
                      <div><strong>Phone:</strong> {selectedVendor.formatted_phone_number}</div>
                    )}
                    {selectedVendor.website && !selectedVendor.website.includes('maps.google.com') && (
                      <div><strong>Website:</strong> <a href={selectedVendor.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{selectedVendor.website}</a></div>
                    )}
                    {selectedVendor.rating && (
                      <div><strong>Rating:</strong> {selectedVendor.rating} ⭐</div>
                    )}
                  </div>
                </div>
              ) : (
                <VendorSearchField
                  value={selectedVendor}
                  onChange={handleVendorSelect}
                  onClear={() => setSelectedVendor(null)}
                  placeholder={formData.category ? `Search for ${formData.category} vendors...` : "Search for any wedding vendor..."}
                  disabled={false}
                  categories={getRelevantCategories(formData.category)}
                  location={vendorSearchLocation}
                />
              )}
              <p className="text-xs text-gray-600 mt-2">
                {formData.category 
                  ? `Searching within ${formData.category} category. Clear category to search all vendors.`
                  : "Searching across all wedding vendor categories. Select a category to narrow your search."
                }
                {selectedVendor && (
                  <span className="block mt-1 text-green-600">
                    ✓ Website and phone info auto-populated from Google
                  </span>
                )}
              </p>
            </label>
          </div>
        )}

        <FormField
          label="Phone Number"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          placeholder="Enter phone number"
          error={errors.phone}
        />
        <FormField
          label="Website"
          name="website"
          value={formData.website}
          onChange={handleChange}
          placeholder="Enter website"
        />
        </div>
        </div>

        {/* Fixed Footer */}
        <div className="flex-shrink-0 bg-white border-t border-[#AB9C95] px-6 py-4">
          <div className="flex justify-between items-center gap-2">
          <button
            onClick={() => {
              if (!confirmDelete) {
                setConfirmDelete(true);
              } else {
                handleDelete();
              }
            }}
            className={`btn-delete ${confirmDelete ? 'confirm' : ''}`}
          >
            {confirmDelete ? "Confirm Deletion" : "Delete"}
          </button>

          <button
            onClick={handleSubmit}
            className="btn-primary"
          >
            Save
          </button>
          </div>
        </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
