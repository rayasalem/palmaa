
import React from 'react';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
  showIcon?: boolean;
  theme?: 'light' | 'dark';
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ 
  size = 'medium', 
  showText = true, 
  showIcon = true, 
  theme = 'light', 
  className = '' 
}) => {
  const dimensions = {
    small: { icon: 32, text: 'text-lg' },
    medium: { icon: 48, text: 'text-2xl' },
    large: { icon: 80, text: 'text-4xl' },
  }[size];

  const primaryRed = '#E10600';
  const darkGray = '#1E293B';
  
  const textColor = theme === 'light' ? 'text-palma-navy' : 'text-white';

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {showIcon && (
        <svg
          width={dimensions.icon}
          height={dimensions.icon}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-sm shrink-0"
        >
          <rect width="100" height="100" rx="24" fill={theme === 'dark' ? 'white' : 'transparent'} />
          <g transform="translate(10, 10) scale(0.8)">
            <rect x="20" y="10" width="14" height="80" rx="7" fill={primaryRed} />
            <path d="M34 10C65 10 85 25 85 45C85 65 65 80 34 80L34 68C58 68 73 58 73 45C73 32 58 22 34 22V10Z" fill={primaryRed} fillOpacity="0.9" />
            <path d="M34 25C50 25 60 35 60 45C60 55 50 65 34 65" stroke={primaryRed} strokeWidth="2" strokeLinecap="round" opacity="0.3" />
          </g>
        </svg>
      )}
      {showText && (
        <div className="flex flex-col leading-none">
          <span className={`font-extrabold tracking-tight ${dimensions.text} ${textColor}`}>
            Palma
          </span>
          <span className={`text-[10px] font-bold uppercase tracking-[0.2em] opacity-90 mt-0.5 ${theme === 'light' ? 'text-palma-muted' : 'text-white/80'}`}>
            Marketplace
          </span>
        </div>
      )}
    </div>
  );
};

export default Logo;
