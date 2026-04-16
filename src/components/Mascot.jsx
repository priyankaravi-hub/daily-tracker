import React from 'react'

export default function Mascot({ size = 120, className = '' }) {
  return (
    <div className={`inline-block ${className}`} style={{ width: size }}>
      <svg viewBox="0 0 280 310" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: 'auto' }}>
        <defs>
          <radialGradient id="mKnitGrad" cx="45%" cy="38%" r="58%">
            <stop offset="0%" stopColor="#F5ECD7"/>
            <stop offset="60%" stopColor="#E8DFC8"/>
            <stop offset="100%" stopColor="#D9CEAD"/>
          </radialGradient>
          <radialGradient id="mKnitHead" cx="48%" cy="40%" r="55%">
            <stop offset="0%" stopColor="#F5ECD7"/>
            <stop offset="100%" stopColor="#E5DCCA"/>
          </radialGradient>
          <linearGradient id="mHornGrad" x1="30%" y1="0%" x2="70%" y2="100%">
            <stop offset="0%" stopColor="#E8E8EE"/>
            <stop offset="30%" stopColor="#C8C8D4"/>
            <stop offset="60%" stopColor="#D8D8E2"/>
            <stop offset="100%" stopColor="#B0B0BE"/>
          </linearGradient>
          <radialGradient id="mShirtGrad" cx="50%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#1E2A4A"/>
            <stop offset="100%" stopColor="#141E36"/>
          </radialGradient>
          <linearGradient id="mLogoGold" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#D4B96A"/>
            <stop offset="50%" stopColor="#C9A96A"/>
            <stop offset="100%" stopColor="#B89D5A"/>
          </linearGradient>
          <pattern id="mKnitTex" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
            <circle cx="4" cy="4" r="3.2" fill="none" stroke="#D6CCB4" strokeWidth=".5" opacity=".3"/>
          </pattern>
          <pattern id="mKnitTexH" x="0" y="0" width="7" height="7" patternUnits="userSpaceOnUse">
            <circle cx="3.5" cy="3.5" r="2.8" fill="none" stroke="#D6CCB4" strokeWidth=".45" opacity=".25"/>
          </pattern>
          <radialGradient id="mHornSpk" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="white" stopOpacity=".7"/>
            <stop offset="100%" stopColor="white" stopOpacity="0"/>
          </radialGradient>
        </defs>

        {/* Body */}
        <ellipse cx="140" cy="200" rx="82" ry="85" fill="url(#mKnitGrad)"/>
        <ellipse cx="140" cy="200" rx="82" ry="85" fill="url(#mKnitTex)"/>

        {/* Legs */}
        <ellipse cx="100" cy="278" rx="34" ry="20" fill="url(#mKnitGrad)"/>
        <ellipse cx="100" cy="278" rx="34" ry="20" fill="url(#mKnitTex)"/>
        <ellipse cx="180" cy="278" rx="34" ry="20" fill="url(#mKnitGrad)"/>
        <ellipse cx="180" cy="278" rx="34" ry="20" fill="url(#mKnitTex)"/>

        {/* Dark navy t-shirt */}
        <path d="M68 158 Q72 132 100 127 Q118 142 140 142 Q162 142 180 127 Q208 132 212 158 L214 238 Q214 255 196 258 L84 258 Q66 255 66 238 Z" fill="url(#mShirtGrad)"/>
        <path d="M100 127 Q118 144 140 144 Q162 144 180 127" stroke="#0D1526" strokeWidth="1.5" fill="none"/>
        <path d="M78 252 Q140 248 202 252" stroke="#0D1526" strokeWidth="1" fill="none" opacity=".4"/>

        {/* Logo */}
        <rect x="96" y="178" width="18" height="14" rx="2" fill="none" stroke="url(#mLogoGold)" strokeWidth="1.3"/>
        <text x="105" y="189" textAnchor="middle" fontFamily="Inter,system-ui,sans-serif" fontWeight="700" fontSize="8" fill="url(#mLogoGold)">UP</text>
        <text x="122" y="189.5" fontFamily="Inter,system-ui,sans-serif" fontWeight="600" fontSize="11" fill="url(#mLogoGold)">upscale ai</text>

        {/* Head */}
        <ellipse cx="140" cy="98" rx="68" ry="62" fill="url(#mKnitHead)"/>
        <ellipse cx="140" cy="98" rx="68" ry="62" fill="url(#mKnitTexH)"/>
        <ellipse cx="140" cy="135" rx="40" ry="10" fill="#D2C8B2" opacity=".2"/>

        {/* Ears */}
        <path d="M82 62 Q68 28 78 20 Q88 28 95 55 Z" fill="url(#mKnitGrad)"/>
        <path d="M85 55 Q74 32 80 26 Q87 32 92 50 Z" fill="#E8DFC8" opacity=".5"/>
        <path d="M198 62 Q212 28 202 20 Q192 28 185 55 Z" fill="url(#mKnitGrad)"/>
        <path d="M195 55 Q206 32 200 26 Q193 32 188 50 Z" fill="#E8DFC8" opacity=".5"/>

        {/* Silver horn */}
        <path d="M140 5 L128 52 Q140 46 152 52 Z" fill="url(#mHornGrad)"/>
        <circle cx="136" cy="18" r="2" fill="url(#mHornSpk)"/>
        <circle cx="142" cy="28" r="1.5" fill="url(#mHornSpk)"/>
        <circle cx="135" cy="36" r="1.8" fill="url(#mHornSpk)"/>
        <circle cx="144" cy="14" r="1.2" fill="url(#mHornSpk)"/>
        <path d="M133 40 Q140 36 147 40" stroke="#A8A8B6" strokeWidth=".8" fill="none" opacity=".4"/>
        <path d="M134 32 Q140 28 146 32" stroke="#A8A8B6" strokeWidth=".8" fill="none" opacity=".4"/>
        <path d="M136 24 Q140 20 144 24" stroke="#A8A8B6" strokeWidth=".8" fill="none" opacity=".4"/>

        {/* Bead eyes */}
        <circle cx="118" cy="95" r="5" fill="#1a1a1a"/>
        <circle cx="162" cy="95" r="5" fill="#1a1a1a"/>
        <circle cx="120" cy="93" r="1.5" fill="white" opacity=".6"/>
        <circle cx="164" cy="93" r="1.5" fill="white" opacity=".6"/>

        {/* Nose */}
        <ellipse cx="140" cy="106" rx="5" ry="3" fill="#DDD4BE" opacity=".5"/>

        {/* Left arm */}
        <ellipse cx="58" cy="190" rx="24" ry="35" fill="url(#mKnitGrad)" transform="rotate(25 58 190)"/>
        <ellipse cx="58" cy="190" rx="24" ry="35" fill="url(#mKnitTex)" transform="rotate(25 58 190)"/>
        <path d="M70 158 Q60 168 55 162" stroke="#0D1526" strokeWidth="1.5" fill="none" opacity=".5"/>

        {/* Right arm (waving) */}
        <g>
          <ellipse cx="222" cy="190" rx="24" ry="35" fill="url(#mKnitGrad)" transform="rotate(-25 222 190)">
            <animateTransform
              attributeName="transform" type="rotate"
              values="-25 222 190;-60 212 168;-25 222 190;-65 210 165;-25 222 190"
              dur="1.6s" repeatCount="indefinite"
              keyTimes="0;0.2;0.5;0.7;1"
              calcMode="spline"
              keySplines="0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1"
            />
          </ellipse>
          <ellipse cx="222" cy="190" rx="24" ry="35" fill="url(#mKnitTex)" transform="rotate(-25 222 190)">
            <animateTransform
              attributeName="transform" type="rotate"
              values="-25 222 190;-60 212 168;-25 222 190;-65 210 165;-25 222 190"
              dur="1.6s" repeatCount="indefinite"
              keyTimes="0;0.2;0.5;0.7;1"
              calcMode="spline"
              keySplines="0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1;0.42 0 0.58 1"
            />
          </ellipse>
          <path d="M210 158 Q220 168 225 162" stroke="#0D1526" strokeWidth="1.5" fill="none" opacity=".5"/>
        </g>
      </svg>
    </div>
  )
}
