// src/hooks/useAuth.ts (Example structure)
import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth'; // MODIFIED: Removed getAuth
import { useRouter, usePathname } from 'next/navigation';
import { auth } from '@/lib/firebase'; // ADDED THIS LINE

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  // DELETED: const auth = getAuth(); // Ensure Firebase app is initialized elsewhere

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      setUser(authUser);
      setLoading(false);
      console.log('[useAuth] onAuthStateChanged:', { authUser, pathname });

      // Only redirect to login if not already on /login or /signup
      if (!authUser && pathname !== '/login' && pathname !== '/signup') {
        console.log('[useAuth] Redirecting to /login from', pathname);
        router.push('/login');
      }
    });

    // Clean up subscription on unmount
    return () => unsubscribe();
  }, [pathname, router]);

  useEffect(() => {
    console.log('[useAuth] State:', { user, loading, pathname });
  }, [user, loading, pathname]);

  return { user, loading }; // <-- ADD THIS LINE
};