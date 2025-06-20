import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

interface WeddingBannerData {
  daysLeft: number | null;
  userName: string | null;
  isLoading: boolean;
  handleSetWeddingDate: () => void;
}

export const useWeddingBanner = (router: any, localWeddingDate?: string | null): WeddingBannerData => {
  const { user, userName, loading: authLoading } = useAuth();
  const [firestoreWeddingDate, setFirestoreWeddingDate] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch wedding date for banner
  useEffect(() => {
    // Only fetch if no local date is being passed for preview
    if (user && localWeddingDate === undefined) {
      const fetchWeddingDate = async () => {
        setIsLoading(true);
        try {
          const userRef = doc(db, "users", user.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const data = userSnap.data();
            if (data.weddingDate?.seconds) {
              setFirestoreWeddingDate(new Date(data.weddingDate.seconds * 1000));
            } else {
              setFirestoreWeddingDate(null);
            }
          }
        } catch (error) {
          console.error('Error fetching wedding date:', error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchWeddingDate();
    } else {
      setIsLoading(false);
    }
  }, [user, localWeddingDate]);

  // Calculate days left
  const calculateDaysLeft = () => {
    const dateToUse = localWeddingDate ? new Date(localWeddingDate) : firestoreWeddingDate;

    if (!dateToUse) return null;
    const today = new Date();
    // Reset time portion to compare dates only
    today.setHours(0, 0, 0, 0);
    
    // Create a new date object from dateToUse to avoid modifying the original state
    const weddingDate = new Date(dateToUse);
    weddingDate.setHours(0, 0, 0, 0);
    
    // Add one day to the difference to include the wedding day itself
    const diffTime = weddingDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysLeft = calculateDaysLeft();

  const handleSetWeddingDate = () => {
    router.push('/settings?tab=wedding&highlight=weddingDate');
  };

  return {
    daysLeft,
    userName,
    isLoading: authLoading || isLoading,
    handleSetWeddingDate
  };
}; 