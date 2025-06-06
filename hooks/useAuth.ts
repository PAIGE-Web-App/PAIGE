// src/hooks/useAuth.ts (Example structure)
import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth'; // MODIFIED: Removed getAuth
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase'; // ADDED THIS LINE

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  // DELETED: const auth = getAuth(); // Ensure Firebase app is initialized elsewhere

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      setUser(authUser);
      setLoading(false);

      if (!authUser) {
        // Redirect to login page if not authenticated
        router.push('/login');
      }
    });

    // Clean up subscription on unmount
   return () => unsubscribe();
  }, []);

  return { user, loading }; // <-- ADD THIS LINE
};