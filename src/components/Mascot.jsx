import React from 'react'

export default function Mascot({ size = 120, className = '' }) {
  return (
    <div className={`inline-block ${className}`} style={{ width: size }}>
      <svg viewBox="0 0 260 300" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: 'auto' }}>
        <defs>
          <radialGradient id="mBodyGrad" cx="50%" cy="40%" r="55%">
            <stop offset="0%" stopColor="#FFFFFF"/>
            <stop offset="100%" stopColor="#E8EAF0"/>
          </radialGradient>
          <radialGradient id="mHeadGrad" cx="50%" cy="40%" r="55%">
            <stop offset="0%" stopColor="#FFFFFF"/>
            <stop offset="100%" stopColor="#F0F1F5"/>
          </radialGradient>
          <linearGradient id="mHornGrad" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#FFD97D"/>
            <stop offset="50%" stopColor="#C9A96A"/>
            <stop offset="100%" stopColor="#E8C55A"/>
          </linearGradient>
          <linearGradient id="mManeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#C9A96A"/>
            <stop offset="100%" stopColor="#E8D5A0"/>
          </linearGradient>
          <radialGradient id="mCheekGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFB8C6"/>
            <stop offset="100%" stopColor="#FF8FAA" stopOpacity="0.4"/>
          </radialGradient>
          <radialGradient id="mEarInner" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFDDE5"/>
            <stop offset="100%" stopColor="#FFB8C6" stopOpacity="0.5"/>
          </radialGradient>
          <radialGradient id="mShirtGrad" cx="50%" cy="30%" r="65%">
            <stop offset="0%" stopColor="#5C7CFA"/>
            <stop offset="100%" stopColor="#3B5BDB"/>
          </radialGradient>
          <linearGradient id="mLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFD97D"/>
            <stop offset="50%" stopColor="#C9A96A"/>
            <stop offset="100%" stopColor="#E8C55A"/>
          </linearGradient>
        </defs>

        {/* Body */}
        <ellipse cx="130" cy="190" rx="90" ry="95" fill="url(#mBodyGrad)"/>

        {/* T-shirt */}
        <path d="M52 155 Q55 130 90 125 Q110 140 130 140 Q150 140 170 125 Q205 130 208 155 L210 230 Q210 250 190 255 L70 255 Q50 250 50 230 Z" fill="url(#mShirtGrad)"/>
        <path d="M90 125 Q110 142 130 142 Q150 142 170 125" stroke="#4A6CF7" strokeWidth="2" fill="none"/>
        <path d="M65 240 Q130 235 195 240" stroke="#4A6CF7" strokeWidth="1" fill="none" strokeDasharray="4 3" opacity=".4"/>

        {/* Logo text */}
        <text x="130" y="185" textAnchor="middle" fontFamily="Inter,system-ui,sans-serif" fontWeight="800" fontSize="16" fill="url(#mLogoGrad)">Upscale AI</text>
        <line x1="95" y1="190" x2="165" y2="190" stroke="url(#mLogoGrad)" strokeWidth="1.5" opacity=".5"/>

        <path d="M130 145 L130 165" stroke="#4A6CF7" strokeWidth="1" fill="none" strokeDasharray="3 3" opacity=".25"/>

        {/* Head */}
        <ellipse cx="130" cy="100" rx="72" ry="65" fill="url(#mHeadGrad)"/>
        <ellipse cx="130" cy="100" rx="72" ry="65" fill="none" stroke="#D5D8E0" strokeWidth="1" opacity=".4"/>

        {/* Ears */}
        <ellipse cx="72" cy="55" rx="22" ry="30" fill="#F0F1F5" transform="rotate(-15 72 55)"/>
        <ellipse cx="72" cy="58" rx="12" ry="18" fill="url(#mEarInner)" transform="rotate(-15 72 58)" opacity=".6"/>
        <ellipse cx="188" cy="55" rx="22" ry="30" fill="#F0F1F5" transform="rotate(15 188 55)"/>
        <ellipse cx="188" cy="58" rx="12" ry="18" fill="url(#mEarInner)" transform="rotate(15 188 58)" opacity=".6"/>

        {/* Horn */}
        <path d="M130 8 L116 55 Q130 47 144 55 Z" fill="url(#mHornGrad)"/>
        <path d="M123 40 Q130 35 137 40" stroke="#B5955A" strokeWidth="1.2" fill="none" opacity=".5"/>
        <path d="M121 30 Q130 25 139 30" stroke="#B5955A" strokeWidth="1.2" fill="none" opacity=".5"/>
        <path d="M125 19 Q130 15 135 19" stroke="#B5955A" strokeWidth="1.2" fill="none" opacity=".5"/>
        <circle cx="128" cy="18" r="2.5" fill="#FFF5D4" opacity=".9"/>

        {/* Mane */}
        <path d="M90 38 Q72 58 80 88 Q87 70 95 60 Q84 52 90 38Z" fill="url(#mManeGrad)" opacity=".9"/>
        <path d="M80 55 Q62 78 72 108 Q80 90 88 80 Q78 70 80 55Z" fill="url(#mManeGrad)" opacity=".7"/>
        <path d="M72 78 Q56 100 68 128 Q76 110 84 100 Q74 90 72 78Z" fill="url(#mManeGrad)" opacity=".5"/>

        {/* Eyes */}
        <ellipse cx="108" cy="95" rx="12" ry="14" fill="#1a1a2e"/>
        <ellipse cx="152" cy="95" rx="12" ry="14" fill="#1a1a2e"/>
        <circle cx="113" cy="89" r="5" fill="white" opacity=".9"/>
        <circle cx="157" cy="89" r="5" fill="white" opacity=".9"/>
        <circle cx="105" cy="97" r="2.5" fill="white" opacity=".5"/>
        <circle cx="149" cy="97" r="2.5" fill="white" opacity=".5"/>

        {/* Smile + nose */}
        <path d="M118 113 Q130 124 142 113" stroke="#555" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
        <ellipse cx="130" cy="106" rx="3" ry="2" fill="#D5D8E0"/>

        {/* Blush */}
        <ellipse cx="86" cy="108" rx="12" ry="7" fill="url(#mCheekGrad)" opacity=".45"/>
        <ellipse cx="174" cy="108" rx="12" ry="7" fill="url(#mCheekGrad)" opacity=".45"/>

        {/* Left arm (static) */}
        <ellipse cx="42" cy="178" rx="20" ry="30" fill="#F0F1F5" transform="rotate(22 42 178)"/>
        <path d="M55 155 Q48 162 42 158" stroke="#4A6CF7" strokeWidth="2" fill="none" opacity=".6"/>

        {/* Right arm (waving) */}
        <g>
          <ellipse cx="218" cy="178" rx="20" ry="30" fill="#F0F1F5" transform="rotate(-22 218 178)">
            <animateTransform
              attributeName="transform" type="rotate"
              values="-22 218 178;-55 210 160;-22 218 178;-60 208 158;-22 218 178"
              dur="1.6s" repeatCount="indefinite"
              keyTimes="0;0.2;0.5;0.7;1"
              calcMode="spline"
              keySplines="0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1"
            />
          </ellipse>
          <path d="M205 155 Q212 162 218 158" stroke="#4A6CF7" strokeWidth="2" fill="none" opacity=".6"/>
        </g>

        {/* Legs */}
        <ellipse cx="95" cy="282" rx="30" ry="18" fill="#F0F1F5"/>
        <ellipse cx="165" cy="282" rx="30" ry="18" fill="#F0F1F5"/>
        <ellipse cx="95" cy="287" rx="20" ry="9" fill="#C9A96A" opacity=".65"/>
        <ellipse cx="165" cy="287" rx="20" ry="9" fill="#C9A96A" opacity=".65"/>

        {/* Tail */}
        <path d="M220 215 Q248 198 242 168 Q238 185 228 190 Q246 172 242 152" stroke="url(#mManeGrad)" strokeWidth="7" fill="none" strokeLinecap="round" opacity=".8"/>
        <path d="M242 152 Q238 140 244 130" stroke="url(#mManeGrad)" strokeWidth="4.5" fill="none" strokeLinecap="round" opacity=".6"/>
      </svg>
    </div>
  )
}
