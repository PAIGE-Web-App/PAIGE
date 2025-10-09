import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export function usePortal() {
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    // Create a new div element for the portal
    const div = document.createElement('div');
    div.style.position = 'fixed';
    div.style.top = '0';
    div.style.left = '0';
    div.style.width = '100%';
    div.style.height = '100%';
    div.style.pointerEvents = 'none';
    div.style.zIndex = '99999'; // Higher than any other modal
    
    // Append to document body
    document.body.appendChild(div);
    setPortalContainer(div);

    // Cleanup function
    return () => {
      if (div && document.body.contains(div)) {
        document.body.removeChild(div);
      }
    };
  }, []);

  const Portal = ({ children }: { children: React.ReactNode }) => {
    if (!portalContainer) return null;
    return createPortal(children, portalContainer);
  };

  return Portal;
}
