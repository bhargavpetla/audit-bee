'use client';

interface Props {
  size?: number;
  className?: string;
}

export default function BeeLogo({ size = 32, className = '' }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Body */}
      <ellipse cx="32" cy="36" rx="16" ry="18" fill="#FCD34D" />
      {/* Stripes */}
      <rect x="16" y="30" width="32" height="4" rx="2" fill="#1E1B2E" />
      <rect x="18" y="38" width="28" height="4" rx="2" fill="#1E1B2E" />
      <rect x="20" y="46" width="24" height="3" rx="1.5" fill="#1E1B2E" />
      {/* Head */}
      <circle cx="32" cy="20" r="10" fill="#FCD34D" />
      {/* Eyes */}
      <circle cx="28" cy="19" r="2.5" fill="#1E1B2E" />
      <circle cx="36" cy="19" r="2.5" fill="#1E1B2E" />
      {/* Eye highlights */}
      <circle cx="29" cy="18" r="0.8" fill="white" />
      <circle cx="37" cy="18" r="0.8" fill="white" />
      {/* Smile */}
      <path
        d="M28 23 Q32 27 36 23"
        stroke="#1E1B2E"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Antennae */}
      <line
        x1="28"
        y1="12"
        x2="24"
        y2="5"
        stroke="#1E1B2E"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="36"
        y1="12"
        x2="40"
        y2="5"
        stroke="#1E1B2E"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Antenna tips */}
      <circle cx="24" cy="4" r="2" fill="#7C3AED" />
      <circle cx="40" cy="4" r="2" fill="#7C3AED" />
      {/* Wings */}
      <ellipse
        cx="14"
        cy="28"
        rx="8"
        ry="5"
        fill="#7C3AED"
        fillOpacity="0.25"
        transform="rotate(-20 14 28)"
      />
      <ellipse
        cx="50"
        cy="28"
        rx="8"
        ry="5"
        fill="#7C3AED"
        fillOpacity="0.25"
        transform="rotate(20 50 28)"
      />
      {/* Wing outlines */}
      <ellipse
        cx="14"
        cy="28"
        rx="8"
        ry="5"
        stroke="#7C3AED"
        strokeWidth="1"
        fill="none"
        transform="rotate(-20 14 28)"
      />
      <ellipse
        cx="50"
        cy="28"
        rx="8"
        ry="5"
        stroke="#7C3AED"
        strokeWidth="1"
        fill="none"
        transform="rotate(20 50 28)"
      />
      {/* Stinger */}
      <path d="M32 54 L30 58 L34 58 Z" fill="#1E1B2E" />
    </svg>
  );
}
