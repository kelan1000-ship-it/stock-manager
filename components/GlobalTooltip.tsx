import React, { useEffect, useState, useRef } from 'react';
import { Tooltip } from './SharedUI';

export const GlobalTooltip = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [text, setText] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleMouseOver = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('[data-tooltip]');
      if (target) {
        const tooltipText = target.getAttribute('data-tooltip');
        if (tooltipText && tooltipText !== 'undefined' && tooltipText !== 'null') {
          setCoords({ x: e.clientX, y: e.clientY });
          setText(tooltipText);
          
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          timeoutRef.current = setTimeout(() => {
            setIsVisible(true);
          }, 300); // 300ms delay
        }
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isVisible || timeoutRef.current) {
         setCoords({ x: e.clientX, y: e.clientY });
      }
    };

    const handleMouseOut = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setIsVisible(false);
      setText(null);
    };

    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseout', handleMouseOut);

    return () => {
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseout', handleMouseOut);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isVisible]);

  if (!text) return null;

  return (
    <Tooltip x={coords.x} y={coords.y} isVisible={isVisible}>
      {text}
    </Tooltip>
  );
};
