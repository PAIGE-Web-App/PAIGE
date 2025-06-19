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

export const useWeddingBanner = (router: any): WeddingBannerData => {
  const { user } = useAuth();
  const [userData, setUserData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user data for banner
  useEffect(() => {
    if (user) {
      const fetchUserData = async () => {
        try {
          const userRef = doc(db, "users", user.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            setUserData(userSnap.data());
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchUserData();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  // Calculate days left
  const calculateDaysLeft = () => {
    if (!userData?.weddingDate) return null;
    const weddingDate = new Date(userData.weddingDate);
    const today = new Date();
    const diffTime = weddingDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : null;
  };

  const daysLeft = calculateDaysLeft();
  const userName = userData?.userName || null;

  const handleSetWeddingDate = () => {
    router.push('/profile?tab=wedding');
  };

  return {
    daysLeft,
    userName,
    isLoading,
    handleSetWeddingDate
  };
}; 