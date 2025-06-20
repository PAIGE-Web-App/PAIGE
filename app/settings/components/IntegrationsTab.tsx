"use client";

import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { doc, getDoc, updateDoc, deleteField } from "firebase/firestore";
import { db } from "../../../lib/firebase";

interface IntegrationsTabProps {
  user: any;
  onGoogleAction: (action: () => Promise<void>) => void;
}

export default function IntegrationsTab({ user, onGoogleAction }: IntegrationsTabProps) {
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleEmail, setGoogleEmail] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGoogleIntegration = async () => {
      setLoading(true);
      if (!user?.uid) {
        setLoading(false);
        return;
      }
      
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const userData = userDoc.data();
        
        if (userData?.googleTokens) {
          setGoogleConnected(true);
          setGoogleEmail(userData.googleTokens.email || userData.googleEmail || "");
        } else {
          setGoogleConnected(false);
          setGoogleEmail("");
        }
      } catch (error) {
        console.error("Error fetching Google integration:", error);
        setGoogleConnected(false);
        setGoogleEmail("");
      } finally {
        setLoading(false);
      }
    };

    fetchGoogleIntegration();
  }, [user?.uid]);

  const handleConnectGoogle = () => {
    if (!user?.uid) {
      toast.error("Could not find user. Please try logging in again.");
      return;
    }
    const redirectUri = encodeURIComponent(`${window.location.origin}/settings?tab=integrations`);
    const googleAuthUrl = `/api/auth/google/initiate?userId=${user.uid}&redirectUri=${redirectUri}`;
    window.location.href = googleAuthUrl;
  };

  const handleDisconnectGoogle = () => {
    onGoogleAction(async () => {
      try {
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, {
          googleTokens: deleteField()
        });

        setGoogleConnected(false);
        setGoogleEmail("");
        toast.success("Google account disconnected successfully");
      } catch (error) {
        toast.error("Failed to disconnect Google account");
      }
    });
  };

  if (loading) {
    return (
      <div className="flex gap-8 pb-8">
        <div className="flex-1 bg-white rounded-lg p-6 shadow">
          <h2 className="text-lg font-playfair font-semibold mb-6 text-[#332B42]">Integrations</h2>
          <div className="flex items-center justify-center py-10">
            <p className="text-sm text-gray-500">Loading integration status...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-8 pb-8">
      <div className="flex-1 bg-white rounded-lg p-6 shadow">
        <h2 className="text-lg font-playfair font-semibold mb-6 text-[#332B42]">Integrations</h2>
        
        <div className="space-y-6">
          <div className="border border-[#AB9C95] rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src="/Gmail_icon_(2020).svg" alt="Gmail" className="w-8 h-8" />
                <div>
                  <h6 className="font-playfair font-medium text-[#332B42]">
                    {googleConnected
                      ? "Gmail Integration (Import Contacts and Send Messages)"
                      : "Gmail Integration"}
                  </h6>
                  {googleConnected ? (
                    <p className="text-sm text-[#7A7A7A]">{googleEmail}</p>
                  ) : (
                    <p className="text-sm text-[#7A7A7A]">
                      Connect your Gmail account to import contacts and send emails
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={googleConnected ? handleDisconnectGoogle : handleConnectGoogle}
                className={`px-4 py-2 rounded font-work-sans text-sm font-medium transition-colors duration-150 ${
                  googleConnected
                    ? "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                    : "btn-primary"
                }`}
              >
                {googleConnected ? "Disconnect" : "Connect"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 