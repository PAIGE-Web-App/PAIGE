// components/AddContactModal.tsx
import { getAllCategories, saveCategoryIfNew } from "../lib/firebaseCategories";
import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { saveContactToFirestore } from "../lib/saveContactToFirestore";
import FormField from "./FormField";
import SelectField from "./SelectField";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getCategoryStyle } from "../utils/categoryStyle";
import { getAuth } from "firebase/auth";
import CategoryPill from "./CategoryPill";
import CategorySelectField from "./CategorySelectField";
import { useCustomToast } from "../hooks/useCustomToast";
import VendorSearchField from "./VendorSearchField";
import { VENDOR_CATEGORIES } from '@/constants/vendorCategories';
import { useUserProfileData } from "../hooks/useUserProfileData";
import { getRelevantCategories } from "../utils/vendorSearchUtils";

// Moved outside the component
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

// Moved outside the component
function cleanFirestoreData(data: Record<string, any>) {
  return Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== undefined));
}

// Extract just the values for the dropdown
const VENDOR_CATEGORY_VALUES = VENDOR_CATEGORIES.map(cat => cat.value);


export default function AddContactModal({ onClose, onSave, userId }: any) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    category: "",
    website: "",
  });

  const [avatarColor, setAvatarColor] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  const [customCategory, setCustomCategory] = useState("");
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { showSuccessToast, showErrorToast } = useCustomToast(); // Initialize useCustomToast
  
  // Use centralized vendor search utility
  // getRelevantCategories is now imported from utils/vendorSearchUtils
  
  // Vendor association state
  const [selectedVendor, setSelectedVendor] = useState<any>(null);
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
    setIsMounted(true);

    const hash = Math.floor(Math.random() * 100000);
    const index = hash % adaColors.length;
    setAvatarColor(adaColors[index]);

    const fetchCategories = async () => {
      if (userId) {
        const categories = await getAllCategories(userId);
        setCategoryOptions(categories);
      }
    };
    fetchCategories();
  }, [userId]);

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
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleCustomCategoryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomCategory(e.target.value);
    if (errors.customCategory) {
      setErrors((prev) => ({ ...prev, customCategory: "" }));
    }
  };


  const handleSubmit = async () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required.";
    }

    if (!formData.category || formData.category === "") {
      newErrors.category = "Category is required.";
    } else if (formData.category === "Other" && !customCategory.trim()) {
      newErrors.customCategory = "Custom category name is required when 'Other' is selected.";
    }

    if (formData.email && formData.email.trim() && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Invalid email format.";
    }

    if (formData.phone && formData.phone.trim() && !/^\+?[0-9\s\-()]{7,20}$/.test(formData.phone)) {
      newErrors.phone = "Invalid phone number format.";
    }

    if (!formData.phone.trim() && !formData.email.trim()) {
      newErrors.phone = "Either phone or email must be provided.";
      newErrors.email = "Either phone or email must be provided.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      showErrorToast("Please correct the errors in the form.");
      return;
    }

    let finalCategory = formData.category;
    if (formData.category === "Other") {
      finalCategory = customCategory.trim();
      await saveCategoryIfNew(userId, finalCategory);
    }

    const randomAvatarColor = adaColors[Math.floor(Math.random() * adaColors.length)];

    const newContact = {
      id: `${uuidv4()}-${Date.now()}`, // More unique ID to avoid conflicts
      name: formData.name.trim(),
      email: formData.email.trim() || null,
      phone: formData.phone.trim() || null,
      category: finalCategory,
      website: formData.website.trim() || null,
      avatarColor: avatarColor,
      orderIndex: -new Date().getTime(), // Changed to a negative timestamp for sorting to the top
      userId: userId,
      // Vendor association fields
      placeId: selectedVendor?.place_id || null,
      isVendorContact: !!selectedVendor,
      createdAt: new Date().toISOString(), // Add timestamp for debugging
    };

    try {
      console.log('💾 Saving contact to Firestore:', newContact);
      await saveContactToFirestore(newContact);
      console.log('✅ Contact saved successfully to Firestore');
      
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
              vendorCategory: finalCategory || 'Vendor',
              email: formData.email,
              contactName: formData.name,
              role: finalCategory || 'Contact',
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
            
            showSuccessToast('Contact added and verified email created!');
          } else {
            console.error('❌ Failed to create verified email for vendor:', emailData);
            showSuccessToast('Contact added successfully! (Note: Verified email creation failed)');
          }
        } catch (error) {
          console.error('❌ Error creating verified email for vendor:', error);
          showSuccessToast('Contact added successfully! (Note: Verified email creation failed)');
        }
      } else {
        showSuccessToast("Contact added successfully!");
      }
      
      console.log('📞 Calling onSave callback with contact:', newContact);
      onSave(newContact);
      console.log('✅ onSave callback completed');
      onClose();
    } catch (error) {
      console.error("❌ Error adding contact:", error);
      console.error("❌ Contact data that failed:", newContact);
      showErrorToast(`Failed to add contact: ${error.message || 'Unknown error'}`);
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
          <h5 className="h5 text-left">Add New Contact</h5>
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
          className="w-12 h-12 flex items-center justify-center rounded-full text-white text-sm font-normal"
          style={{ backgroundColor: isMounted && avatarColor ? avatarColor : "#364257" }}
        >
          {formData.name.trim()
            ? formData.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()
            : "🙂"}
        </div>

        {formData.category && formData.category !== "" && (
          <div className="mt-3">
            <CategoryPill category={formData.category === "Other" ? customCategory.trim() : formData.category} />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <FormField
          label="Name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="Enter name"
          error={errors.name}
        />

        <FormField
          label="Email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="Enter email"
          error={errors.email}
        />

        <CategorySelectField
          className="mt-4"
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

        {/* Inline Vendor Search */}
        {(formData.email || formData.phone) && (
          <div className="mt-4">
            <label className="block space-y-1">
              <span className="text-xs font-medium text-[#332B42]">Link to Vendor (Optional)</span>
              <VendorSearchField
                value={selectedVendor}
                onChange={handleVendorSelect}
                onClear={() => setSelectedVendor(null)}
                placeholder={formData.category ? `Search for ${formData.category} vendors...` : "Search for any wedding vendor..."}
                disabled={false}
                categories={getRelevantCategories(formData.category)}
                location={vendorSearchLocation}
              />
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
          <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="btn-primaryinverse"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="btn-primary"
          >
            Submit
          </button>
          </div>
        </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}