import { getAuth, signOut } from 'firebase/auth';

export const handleLogout = async (router?: any) => {
  console.log("Starting logout process...");
  
  try {
    // Clear session cookie
    const sessionResponse = await fetch('/api/sessionLogout', {
      method: 'POST',
      credentials: 'include',
    });
    console.log("Session cookie cleared:", sessionResponse.ok);
    
    // Sign out from Firebase
    const auth = getAuth();
    await signOut(auth);
    console.log("Firebase signout completed");
    
    // Small delay to ensure cookie is cleared
    setTimeout(() => {
      console.log("Redirecting to login");
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