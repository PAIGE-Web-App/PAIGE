// components/OnboardingModal.tsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle, Mail, MessageSquare, Phone } from "lucide-react";
import FormField from "./FormField";
import SelectField from "./SelectField";
import { v4 as uuidv4 } from "uuid";
import { saveContactToFirestore } from "../lib/saveContactToFirestore";
import { getAllCategories, saveCategoryIfNew } from "../lib/firebaseCategories";
import toast from "react-hot-toast";
import CategoryPill from "./CategoryPill";
import CategorySelectField from "./CategorySelectField";

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

  const [gmailAuthStatus, setGmailAuthStatus] = useState<'idle' | 'pending' | 'success' | 'failed'>('idle');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gmailAuth = params.get('gmailAuth');

    console.log("OnboardingModal: useEffect running. gmailAuth param:", gmailAuth); 

    if (gmailAuth) {
        if (gmailAuth === 'success') {
            setGmailAuthStatus('success');
            toast.success("Gmail connected successfully!");
            setCurrentStep(4);
            console.log("OnboardingModal: Gmail auth success. Setting currentStep to 4.");
        } else if (gmailAuth === 'error') {
            setGmailAuthStatus('failed');
            toast.error("Failed to connect Gmail. Please try again.");
            setCurrentStep(3);
            console.log("OnboardingModal: Gmail auth error. Setting currentStep to 3.");
        }
        params.delete('gmailAuth');
        const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
        window.history.replaceState({}, document.title, newUrl);
        console.log("OnboardingModal: Cleaned URL parameters.");
    }
  }, []);


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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 flex bg-black bg-opacity-40 overflow-hidden justify-center items-end md:items-center" // Adjusted for mobile to be at bottom
    >
      <motion.div
        initial={{ y: "100vh", x: "-50%", left: "50%" }} // Adjusted for mobile slide-up from bottom
        animate={{ y: 0, x: "-50%", left: "50%" }}
        exit={{ y: "100vh", x: "-50%", left: "50%" }}
        transition={{ type: "spring", stiffness: 200, damping: 30 }}
        className="relative w-full h-[95vh] rounded-t-[15px] bg-[#F3F2F0] flex overflow-hidden
                   md:h-full md:rounded-[15px] md:top-auto md:left-auto md:transform-none" // Removed md:w and md:max-w, changed md:h to md:h-full to ensure full width on desktop
      >
        <div className="flex flex-1 h-full flex-col md:flex-row"> {/* Changed to flex-col on mobile */}
          {/* Left Sidebar (Steps) - Responsive */}
          <div className="w-full md:w-[300px] bg-white p-8 border-b md:border-r border-[#AB9C95] flex flex-col justify-between flex-shrink-0"> {/* Adjusted border for mobile */}
            <div>
              <h2 className="text-xl font-playfair font-semibold text-[#332B42] mb-8">Set up your unified inbox</h2>
              <ul className="space-y-4">
                {steps.map((step) => (
                  <li key={step.id} className="flex items-center gap-3">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                        currentStep > step.id
                          ? "bg-[#A85C36] text-white"
                          : currentStep === step.id
                          ? "bg-[#332B42] text-white"
                          : "bg-[#E0DBD7] text-[#7A7A7A]"
                      }`}
                    >
                      {currentStep > step.id ? (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      ) : (
                        step.id
                      )}
                    </div>
                    <span
                      className={`text-sm font-medium transition-colors duration-300 ${
                        currentStep >= step.id ? "text-[#332B42]" : "text-[#7A7A7A]"
                      }`}
                    >
                      {step.name}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right Content Area */}
          <div className="flex-1 flex flex-col h-full bg-[#F3F2F0]">

            <div className="p-8 pb-4 border-b border-[#AB9C95] bg-[#F3F2F0] relative z-10">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-[#332B42] hover:text-[#A85C36] z-10"
                aria-label="Close"
              >
                <X size={24} />
              </button>
              {currentStep === 1 && (
                <>
                  <h3 className="text-lg font-playfair font-semibold text-[#332B42] mb-2">What are your contacts' details?</h3>
                </>
              )}
              {currentStep === 2 && (
                <>
                  <h3 className="text-lg font-playfair font-semibold text-[#332B42] mb-2">How will you communicate with your vendors?</h3>
                  <p className="text-sm text-[#364257]">Select the channels you use to communicate with your vendors.</p>
                </>
              )}
              {currentStep === 3 && (
                <>
                  <h3 className="text-lg font-playfair font-semibold text-[#332B42] mb-2">Authorize Paige to work with your channels.</h3>
                  <p className="text-sm text-[#364257]">Connect your accounts to import conversations.</p>
                </>
              )}
            </div>

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
                              <span className="font-medium text-[#332B42] block">Gmail</span>
                              <span className="text-xs text-[#7A7A7A]">Lorem ipsum dolor</span>
                            </div>
                          </div>
                        </label>

                        <label className={`flex items-center p-4 border rounded-[5px] cursor-pointer transition-all duration-200 ${
                          selectedCommunicationChannels.includes("iMessage")
                            ? "border-[#A85C36] bg-[#EBE3DD]"
                            : "border-[#AB9C95] bg-white hover:bg-[#F8F6F4]"
                        }`}>
                          <input
                            type="checkbox"
                            checked={selectedCommunicationChannels.includes("iMessage")}
                            onChange={() => handleChannelToggle("iMessage")}
                            className="form-checkbox rounded text-[#A85C36] focus:ring-[#A85C36] mr-3"
                          />
                          <div className="flex items-center">
                            <MessageSquare size={20} className="text-blue-500 mr-2" />
                            <div>
                              <span className="font-medium text-[#332B42] block">iMessage</span>
                              <span className="text-xs text-[#7A7A7A]">Lorem ipsum dolor</span>
                            </div>
                          </div>
                        </label>

                        <label className={`flex items-center p-4 border rounded-[5px] cursor-pointer transition-all duration-200 ${
                          selectedCommunicationChannels.includes("SMS Android")
                            ? "border-[#A85C36] bg-[#EBE3DD]"
                            : "border-[#AB9C95] bg-white hover:bg-[#F8F6F4]"
                        }`}>
                          <input
                            type="checkbox"
                            checked={selectedCommunicationChannels.includes("SMS Android")}
                            onChange={() => handleChannelToggle("SMS Android")}
                            className="form-checkbox rounded text-[#A85C36] focus:ring-[#A85C36] mr-3"
                          />
                          <div className="flex items-center">
                            <Phone size={20} className="text-green-500 mr-2" />
                            <div>
                              <span className="font-medium text-[#332B42] block">SMS Android</span>
                              <span className="text-xs text-[#7A7A7A]">Lorem ipsum dolor</span>
                            </div>
                          </div>
                        </label>

                        <label className={`flex items-center p-4 border rounded-[5px] cursor-pointer transition-all duration-200 ${
                          selectedCommunicationChannels.includes("Whatsapp")
                            ? "border-[#A85C36] bg-[#EBE3DD]"
                            : "border-[#AB9C95] bg-white hover:bg-[#F8F6F4]"
                        }`}>
                          <input
                            type="checkbox"
                            checked={selectedCommunicationChannels.includes("Whatsapp")}
                            onChange={() => handleChannelToggle("Whatsapp")}
                            className="form-checkbox rounded text-[#A85C36] focus:ring-[#A85C36] mr-3"
                          />
                          <div className="flex items-center">
                            <MessageSquare size={20} className="text-emerald-500 mr-2" />
                            <div>
                              <span className="font-medium text-[#332B42] block">Whatsapp</span>
                              <span className="text-xs text-[#7A7A7A]">Lorem ipsum dolor</span>
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

                      {(selectedCommunicationChannels.includes('iMessage') || selectedCommunicationChannels.includes('SMS Android') || selectedCommunicationChannels.includes('Whatsapp')) && (
                        <div className="p-4 border border-blue-200 bg-blue-50 rounded-md text-sm text-blue-800">
                          <p className="font-semibold mb-1">Note for Messaging Apps:</p>
                          <p>Direct API access for historical iMessage, SMS, and personal WhatsApp conversations is limited by Apple, Google, and Meta for third-party applications. We are exploring solutions to integrate these channels more deeply in the future. For now, you can still manage contacts and use other features.</p>
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

            <div className="p-8 pt-4 border-t border-[#AB9C95] bg-[#F3F2F0] flex justify-between items-center z-10">
              {currentStep > 1 && currentStep < 4 && (
                <button onClick={handleBack} className="btn-primary-inverse">
                  Back
                </button>
              )}
              {currentStep === 1 && <div />}
              {currentStep < 4 ? (
                <button
                  onClick={handleNext}
                  className="btn-primary ml-auto"
                  disabled={isSaving || (currentStep === 3 && selectedCommunicationChannels.includes('Gmail') && gmailAuthStatus === 'pending')}
                >
                  {isSaving ? "Saving..." : "Save & Continue"}
                </button>
              ) : (
                <button onClick={handleComplete} className="btn-primary ml-auto">
                  Go to Dashboard
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
