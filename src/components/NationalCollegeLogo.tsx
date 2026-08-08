import React from 'react';
import { NATIONAL_COLLEGE_LOGO_SVG } from '../assets/collegeAssets';

interface NationalCollegeLogoProps {
  className?: string;
  size?: number;
}

export const NationalCollegeLogo: React.FC<NationalCollegeLogoProps> = ({ 
  className = "w-10 h-10", 
}) => {
  return (
    <div 
      className={`relative flex items-center justify-center shrink-0 ${className}`}
      dangerouslySetInnerHTML={{ __html: NATIONAL_COLLEGE_LOGO_SVG }}
    />
  );
};
