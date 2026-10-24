import React from "react";

export function AiloRibbonMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        {/* Mint to vibrant emerald gradient for the left ribbon arch */}
        <linearGradient id="ailo-ribbon-left" x1="8" y1="32" x2="20" y2="8" gradientUnits="userSpaceOnUse">
          <stop stopColor="#34D399" />
          <stop offset="0.6" stopColor="#10B981" />
          <stop offset="1" stopColor="#059669" />
        </linearGradient>
        {/* Deep emerald shadow gradient for the folded right band */}
        <linearGradient id="ailo-ribbon-right" x1="20" y1="8" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#10B981" />
          <stop offset="0.7" stopColor="#047857" />
          <stop offset="1" stopColor="#065F46" />
        </linearGradient>
      </defs>

      {/* Outer folded ribbon arch 'A' */}
      <path
        d="M10 31L19.2 9.4C19.5 8.7 20.5 8.7 20.8 9.4L30 31"
        stroke="url(#ailo-ribbon-left)"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Layered folded right wing with depth */}
      <path
        d="M20 9.2L30 31"
        stroke="url(#ailo-ribbon-right)"
        strokeWidth="5.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function AiloBrand({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <AiloRibbonMark className="h-8 w-8 shrink-0" />
      <span className="text-xl font-bold tracking-tight text-white font-sans">
        Ailo
      </span>
    </div>
  );
}
