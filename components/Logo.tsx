import React, { useState } from 'react';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
  showIcon?: boolean;
  theme?: 'light' | 'dark';
  className?: string;
}

const primaryRed = '#E10600';
const darkGray = '#1E293B';
const white = '#FFFFFF';

const Logo: React.FC<LogoProps> = ({
  size = 'medium',
  showText = true,
  showIcon = true,
  theme = 'light',
  className = '',
}) => {
  const [imgFailed, setImgFailed] = useState(false);
  const dimensions = {
    small: { w: 88, h: 32, barH: 'h-8', text: 'text-lg' },
    medium: { w: 120, h: 44, barH: 'h-10 sm:h-12', text: 'text-2xl' },
    large: { w: 180, h: 64, barH: 'h-12 sm:h-14', text: 'text-4xl' },
  }[size];

  const useRealImage = showIcon && !imgFailed;

  return (
    <div className={`flex items-center gap-2 sm:gap-3 ${className}`}>
      {showIcon && (
        <>
          {useRealImage ? (
            <span className={`flex items-center shrink-0 ${dimensions.barH}`}>
              <img
                src="/logo.png"
                alt="Palma"
                className="h-full w-auto max-w-[200px] object-contain object-center drop-shadow-sm"
                onError={() => setImgFailed(true)}
              />
            </span>
          ) : (
            <svg
              width={dimensions.w}
              height={dimensions.h}
              viewBox="0 0 200 70"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="shrink-0 drop-shadow-sm"
            >
              <g transform="translate(0, 2)">
                <path
                  d="M12 8h22c2 0 4 1.5 4 4v28c0 2.5-2 4-4 4H12c-2 0-4-1.5-4-4V12c0-2.5 2-4 4-4z"
                  fill={primaryRed}
                  stroke={primaryRed}
                  strokeWidth="0.5"
                />
                <path
                  d="M14 8v-2c0-2 1.5-4 4-4h12c2.5 0 4 2 4 4v2"
                  fill="none"
                  stroke={primaryRed}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <text
                  x="23"
                  y="32"
                  fill={white}
                  fontSize="18"
                  fontWeight="800"
                  fontFamily="system-ui, sans-serif"
                  textAnchor="middle"
                >
                  P
                </text>
              </g>
              <text x="48" y="32" fill={primaryRed} fontSize="22" fontWeight="800" fontFamily="system-ui, sans-serif">
                A
              </text>
              <g fill={theme === 'light' ? darkGray : 'rgba(255,255,255,0.9)'}>
                <text x="72" y="32" fontSize="22" fontWeight="700" fontFamily="system-ui, sans-serif">
                  L
                </text>
                <line x1="72" y1="34" x2="82" y2="34" stroke="currentColor" strokeWidth="0.8" opacity="0.7" />
                <text x="88" y="32" fontSize="22" fontWeight="700" fontFamily="system-ui, sans-serif">
                  M
                </text>
                <line x1="88" y1="34" x2="102" y2="34" stroke="currentColor" strokeWidth="0.8" opacity="0.7" />
                <text x="108" y="32" fontSize="22" fontWeight="700" fontFamily="system-ui, sans-serif">
                  A
                </text>
              </g>
              <g transform="translate(38, 42)" stroke={primaryRed} strokeWidth="2" fill="none">
                <path d="M8 4h60l-8 24H20L8 4z" strokeLinejoin="round" />
                <path d="M68 28h8l4 12H16" strokeLinecap="round" />
                <circle cx="24" cy="48" r="4" />
                <circle cx="56" cy="48" r="4" />
                <path d="M12 48h8M52 48h8" strokeLinecap="round" />
              </g>
              <g transform="translate(52, 52)">
                <path d="M0 0h14v10H0V0z" fill={primaryRed} stroke={primaryRed} strokeWidth="0.5" />
                <text
                  x="7"
                  y="8"
                  fill={white}
                  fontSize="7"
                  fontWeight="800"
                  fontFamily="system-ui, sans-serif"
                  textAnchor="middle"
                >
                  $
                </text>
              </g>
            </svg>
          )}
        </>
      )}
      {showText && (
        <span
          className={`text-[10px] font-bold uppercase tracking-[0.2em] opacity-90 self-center ${theme === 'light' ? 'text-palma-muted' : 'text-white/80'}`}
        >
          Marketplace
        </span>
      )}
    </div>
  );
};

export default Logo;
