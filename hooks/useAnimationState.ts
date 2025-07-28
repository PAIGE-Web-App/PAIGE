import { useState, useCallback, useEffect } from 'react';

interface UseAnimationStateProps {
  duration?: number;
  initialValue?: boolean;
}

export const useAnimationState = ({ 
  duration = 1000, 
  initialValue = false 
}: UseAnimationStateProps = {}) => {
  const [isAnimating, setIsAnimating] = useState(initialValue);

  const triggerAnimation = useCallback(() => {
    setIsAnimating(true);
    const timer = setTimeout(() => setIsAnimating(false), duration);
    return () => clearTimeout(timer);
  }, [duration]);

  const startAnimation = useCallback(() => {
    setIsAnimating(true);
  }, []);

  const stopAnimation = useCallback(() => {
    setIsAnimating(false);
  }, []);

  const resetAnimation = useCallback(() => {
    setIsAnimating(false);
  }, []);

  return {
    isAnimating,
    triggerAnimation,
    startAnimation,
    stopAnimation,
    resetAnimation
  };
}; 