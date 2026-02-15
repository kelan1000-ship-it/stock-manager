
import React from 'react';

const Logo = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 600 280" 
    xmlns="http://www.w3.org/2000/svg" 
    xmlnsXlink="http://www.w3.org/1999/xlink"
    className={className}
  >
    <image 
      width="600" 
      height="280" 
      preserveAspectRatio="xMidYMid meet" 
      xlinkHref="https://i.postimg.cc/9F0JcWHq/Greenchem-Logo-Official.png"
    />
  </svg>
);

export default Logo;
