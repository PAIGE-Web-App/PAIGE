import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../contexts/AuthContext";

export function useUserProfileData() {
  const { user, loading: authLoading } = useAuth();
  const [userName, setUserName] = useState<string | null>(null);
  const [weddingDate, setWeddingDate] = useState<Date | null>(null);
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [showBanner, setShowBanner] = useState<boolean>(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [partnerName, setPartnerName] = useState<string | null>(null);
  const [guestCount, setGuestCount] = useState<number | null>(null);
  const [budget, setBudget] = useState<string | null>(null);
  const [cityState, setCityState] = useState<string | null>(null);
  const [style, setStyle] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUserName(data.userName || null);
        setShowBanner(data.showBanner !== false); // default to true if undefined
        setPartnerName(data.partnerName || null);
        setGuestCount(data.guestCount || null);
        setBudget(data.budget || null);
        setCityState(data.cityState || null);
        setStyle(data.style || null);

        if (data.weddingDate?.seconds) {
          const date = new Date(data.weddingDate.seconds * 1000);
          setWeddingDate(date);
          const today = new Date();
          const diffTime = date.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          setDaysLeft(diffDays);
        } else {
          setWeddingDate(null);
          setDaysLeft(null);
        }
      }
      setProfileLoading(false);
    };
    if (!authLoading) fetchUserData();
  }, [user, authLoading]);

  return { userName, weddingDate, daysLeft, showBanner, profileLoading, partnerName, guestCount, budget, cityState, style };
} 