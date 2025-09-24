import React from 'react';

export const MonsterIcon: React.FC<{ color: string }> = ({ color }) => (
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id={`grad-${color.replace('#','')}`} cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
          <stop offset="0%" style={{stopColor: '#ffffff', stopOpacity: 0.3}} />
          <stop offset="100%" style={{stopColor: color, stopOpacity: 1}} />
        </radialGradient>
      </defs>
      <path
        d="M 50,10 C 20,10 10,40 10,60 C 10,90 30,100 50,90 C 70,100 90,90 90,60 C 90,40 80,10 50,10 Z"
        fill={`url(#grad-${color.replace('#','')})`}
        filter="url(#glow)"
      />
      <circle cx="38" cy="45" r="5" fill="white" />
      <circle cx="62" cy="45" r="5" fill="white" />
      <circle cx="39" cy="46" r="2" fill="black" />
      <circle cx="63" cy="46" r="2" fill="black" />
      <path d="M 45,65 Q 50,75 55,65" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round"/>
    </svg>
);