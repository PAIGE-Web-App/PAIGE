"use client";
import { useEffect } from "react";

export default function ToastOffsetSetter() {
  useEffect(() => {
    function setToastOffset() {
      // For bottom-center positioning, we don't need to offset from nav
      // Just ensure toasts are positioned at bottom with proper spacing
      document.documentElement.style.setProperty('--toast-bottom', '20px');
    }
    setToastOffset();
    window.addEventListener('resize', setToastOffset);
    return () => window.removeEventListener('resize', setToastOffset);
  }, []);
  return null;
} 