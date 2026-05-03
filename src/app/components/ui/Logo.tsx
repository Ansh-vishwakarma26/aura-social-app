import React from "react";

export const Logo = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 100 100" 
    className={className} 
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <animate attributeName="x1" values="0%;200%;0%" dur="6s" repeatCount="indefinite" />
        <animate attributeName="y1" values="0%;200%;0%" dur="8s" repeatCount="indefinite" />
        <animate attributeName="x2" values="100%;-100%;100%" dur="6s" repeatCount="indefinite" />
        <animate attributeName="y2" values="100%;-100%;100%" dur="8s" repeatCount="indefinite" />

        <stop offset="0%" stopColor="#ef4444">
          <animate attributeName="stop-color" values="#ef4444;#f97316;#ec4899;#ef4444" dur="4s" repeatCount="indefinite" />
        </stop>
        <stop offset="33%" stopColor="#f59e0b">
          <animate attributeName="stop-color" values="#f59e0b;#ec4899;#8b5cf6;#f59e0b" dur="4s" repeatCount="indefinite" />
        </stop>
        <stop offset="66%" stopColor="#ec4899">
          <animate attributeName="stop-color" values="#ec4899;#8b5cf6;#ef4444;#ec4899" dur="4s" repeatCount="indefinite" />
        </stop>
        <stop offset="100%" stopColor="#8b5cf6">
          <animate attributeName="stop-color" values="#8b5cf6;#ef4444;#f97316;#8b5cf6" dur="4s" repeatCount="indefinite" />
        </stop>
      </linearGradient>
      
      {/* Optional: Add a drop shadow for extra "aura" effect */}
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    
    <path 
      fillRule="evenodd" 
      clipRule="evenodd" 
      d="M 50 15 
         C 60 15, 65 30, 70 45 
         C 75 60, 85 75, 90 82 
         C 95 88, 85 92, 75 90 
         C 65 88, 58 82, 50 82 
         C 42 82, 35 88, 25 90 
         C 15 92, 5 88, 10 82 
         C 15 75, 25 60, 30 45 
         C 35 30, 40 15, 50 15 Z
         M 60 40 
         C 53 37, 47 40, 45 45 
         C 42 52, 45 60, 50 65 
         C 55 70, 62 67, 65 60 
         C 68 53, 67 43, 60 40 Z" 
      fill="url(#logoGradient)"
      filter="url(#glow)"
    />
  </svg>
);
