"use client";
import { useEffect } from "react";

export default function ToastOffsetSetter() {
  useEffect(() => {
    function setToastOffset() {
      const nav = document.querySelector('nav');
      if (nav) {
        const navRect = nav.getBoundingClientRect();
        document.documentElement.style.setProperty('--toast-top', `${navRect.bottom + 12}px`);
      }
    }
    setToastOffset();
    window.addEventListener('resize', setToastOffset);
    return () => window.removeEventListener('resize', setToastOffset);
  }, []);
  return null;
} 