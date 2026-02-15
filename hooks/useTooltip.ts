
import React, { useState, useRef, useCallback } from 'react';

/**
 * useTooltip - Handles intelligent hover states for UI tooltips
 * @param delay The hover duration required (ms) before showing (default 500ms)
 */
export function useTooltip(delay: number = 500) {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = useCallback((e: React.MouseEvent) => {
    const { clientX, clientY } = e;
    // Set initial coords on entry
    setCoords({ x: clientX, y: clientY });
    
    // Start the "is this an intentional hover?" timer
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  }, [delay]);

  const handleMouseLeave = useCallback(() => {
    // Clear timer if mouse leaves early
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsVisible(false);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    // Update coords as user moves within the element
    setCoords({ x: e.clientX, y: e.clientY });
  }, []);

  return {
    isVisible,
    coords,
    tooltipHandlers: {
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
      onMouseMove: handleMouseMove,
    },
  };
}
