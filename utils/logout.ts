import { getAuth, signOut } from 'firebase/auth';

// Prevent multiple logout calls
let isLoggingOut = false;

export const handleLogout = async (router?: any) => {
  // Prevent multiple logout calls
  if (isLoggingOut) {
    console.log('Logout already in progress, skipping...');
    return;
  }
  
  isLoggingOut = true;
  
  try {
    console.log('Starting logout process...');
    
    // Sign out from Firebase first
    const auth = getAuth();
    await signOut(auth);
    
    // Clear session cookie
    const sessionResponse = await fetch('/api/sessionLogout', {
      method: 'POST',
      credentials: 'include',
    });
    
    console.log('Logout completed, redirecting...');
    
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
  } finally {
    // Reset the flag after a delay
    setTimeout(() => {
      isLoggingOut = false;
    }, 2000);
  }
}; 