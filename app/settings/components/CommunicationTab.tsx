"use client";

import { useState, useEffect } from "react";
import { useCustomToast } from "../../../hooks/useCustomToast";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { useAuth } from "../../../contexts/AuthContext";
import { useUserProfileData } from "../../../hooks/useUserProfileData";
import SelectField from "../../../components/SelectField";
import SettingsTabSkeleton from './SettingsTabSkeleton';

export default function CommunicationTab() {
  const { user } = useAuth();
  const { showSuccessToast, showErrorToast } = useCustomToast();
  const { communicationPreferences, setCommunicationPreferences, profileLoading, reload } = useUserProfileData();
  
  // Communication preferences state
  const [localCommPrefs, setLocalCommPrefs] = useState<{
    generalTone: 'friendly' | 'professional' | 'casual' | 'formal';
    negotiationStyle: 'assertive' | 'collaborative' | 'diplomatic' | 'direct';
    formalityLevel: 'very-casual' | 'casual' | 'professional' | 'very-formal';
  }>({
    generalTone: 'friendly',
    negotiationStyle: 'collaborative',
    formalityLevel: 'professional'
  });
  const [savingCommPrefs, setSavingCommPrefs] = useState(false);

  // Sync communication preferences with Firestore data
  useEffect(() => {
    if (!profileLoading && communicationPreferences) {
      setLocalCommPrefs({
        generalTone: communicationPreferences.generalTone,
        negotiationStyle: communicationPreferences.negotiationStyle,
        formalityLevel: communicationPreferences.formalityLevel
      });
    }
  }, [communicationPreferences, profileLoading]);

  // Handle communication preference changes
  const handleCommPrefChange = (field: 'generalTone' | 'negotiationStyle' | 'formalityLevel', value: string) => {
    setLocalCommPrefs((prev) => ({ ...prev, [field]: value }));
  };

  // Save communication preferences
  const handleSaveCommPrefs = async () => {
    if (!user?.uid) {
      showErrorToast("Please log in to save communication preferences");
      return;
    }

    setSavingCommPrefs(true);
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        communicationPreferences: {
          ...localCommPrefs,
          updatedAt: new Date()
        }
      });
      
      setCommunicationPreferences(localCommPrefs);
      
      // Reload user profile data to ensure all components pick up the changes
      reload();
      
      showSuccessToast("Communication preferences saved!");
    } catch (error) {
      console.error("Error saving communication preferences:", error);
      showErrorToast("Failed to save communication preferences");
    } finally {
      setSavingCommPrefs(false);
    }
  };

  const hasCommPrefsChanged = JSON.stringify(localCommPrefs) !== JSON.stringify(communicationPreferences);

  if (profileLoading) {
    return <SettingsTabSkeleton />;
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h5 className="mb-6">Communication Style</h5>
        <p className="text-sm text-[#7A7A7A] mb-6">
          Customize how Paige writes emails and messages for you. These preferences will be used for all vendor communications and negotiations.
        </p>
        
        <div className="space-y-4">
          <SelectField
            label="General Tone"
            name="generalTone"
            value={localCommPrefs.generalTone}
            onChange={(e) => handleCommPrefChange('generalTone', e.target.value)}
            options={[
              { value: 'friendly', label: 'Friendly - Warm and approachable' },
              { value: 'professional', label: 'Professional - Business-like and polished' },
              { value: 'casual', label: 'Casual - Relaxed and informal' },
              { value: 'formal', label: 'Formal - Traditional and respectful' }
            ]}
          />

          <SelectField
            label="Negotiation Style"
            name="negotiationStyle"
            value={localCommPrefs.negotiationStyle}
            onChange={(e) => handleCommPrefChange('negotiationStyle', e.target.value)}
            options={[
              { value: 'collaborative', label: 'Collaborative - Working together to find solutions' },
              { value: 'diplomatic', label: 'Diplomatic - Tactful and considerate' },
              { value: 'direct', label: 'Direct - Clear and straightforward' },
              { value: 'assertive', label: 'Assertive - Confident and firm' }
            ]}
          />

          <SelectField
            label="Formality Level"
            name="formalityLevel"
            value={localCommPrefs.formalityLevel}
            onChange={(e) => handleCommPrefChange('formalityLevel', e.target.value)}
            options={[
              { value: 'very-casual', label: 'Very Casual - Very relaxed' },
              { value: 'casual', label: 'Casual - Comfortable and friendly' },
              { value: 'professional', label: 'Professional - Standard business tone' },
              { value: 'very-formal', label: 'Very Formal - Traditional and formal' }
            ]}
          />

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSaveCommPrefs}
              disabled={!hasCommPrefsChanged || savingCommPrefs}
              className="btn-primary px-4 py-2 rounded font-work-sans text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingCommPrefs ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

