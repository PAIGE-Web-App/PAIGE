import { getAuth, signOut } from 'firebase/auth';

export const handleLogout = async (router?: any) => {
  
  try {
    // Clear session cookie
    const sessionResponse = await fetch('/api/sessionLogout', {
      method: 'POST',
      credentials: 'include',
    });
    
    // Sign out from Firebase
    const auth = getAuth();
    await signOut(auth);
    
    // Small delay to ensure cookie is cleared
    setTimeout(() => {
      if (router) {
        router.push('/login');
      } else {
        window.location.href = '/login';
      }
    }, 100);
    
  } catch (error) {
    console.error("Logout error:", error);
    // Fallback redirect
    if (router) {
      router.push('/login');
    } else {
      window.location.href = '/login';
    }
  }
}; 