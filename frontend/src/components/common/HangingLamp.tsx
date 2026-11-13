import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';

export const HangingLamp: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [isPulling, setIsPulling] = useState(false);
  const isDark = theme === 'dark';

  const handlePullRope = () => {
    if (isPulling) return;
    setIsPulling(true);
    toggleTheme();
    setTimeout(() => {
      setIsPulling(false);
    }, 450);
  };

  return (
    <div className="relative flex flex-col items-center select-none z-20 group">
      {/* Ceiling Mount */}
      <div className="w-8 h-2 bg-gray-600 dark:bg-gray-500 rounded-t-sm shadow-xs" />

      {/* Hanging Black Cord */}
      <div className="w-0.5 h-10 sm:h-14 bg-gray-700 dark:bg-gray-400" />

      {/* Lamp Socket & Shade */}
      <div className="relative flex flex-col items-center">
        {/* Socket cap */}
        <div className="w-5 h-2.5 bg-amber-700 dark:bg-amber-600 rounded-t-xs" />

        {/* Lamp Shade (Trapezoid) */}
        <div
          className={`w-16 sm:w-20 h-9 transition-colors duration-300 rounded-t-md shadow-md flex items-center justify-center ${
            isDark
              ? 'bg-gradient-to-b from-gray-700 to-gray-800 border-t border-gray-600'
              : 'bg-gradient-to-b from-amber-500 to-amber-600 border-t border-amber-400'
          }`}
          style={{
            clipPath: 'polygon(18% 0%, 82% 0%, 100% 100%, 0% 100%)',
          }}
        />

        {/* Bulb */}
        <div
          className={`w-6 h-6 -mt-1 rounded-full transition-all duration-300 relative ${
            isDark
              ? 'bg-gray-400/50 shadow-inner'
              : 'bg-amber-200 shadow-[0_0_25px_8px_rgba(251,191,36,0.85)] animate-pulse'
          }`}
        >
          {/* Bulb Filament highlight */}
          <div
            className={`w-2.5 h-2.5 mx-auto mt-1 rounded-full transition-opacity ${
              isDark ? 'bg-gray-500 opacity-40' : 'bg-white opacity-95'
            }`}
          />
        </div>

        {/* Radial Light Cone under Lamp when Light is ON */}
        {!isDark && (
          <div
            className="absolute top-12 w-48 sm:w-64 h-36 sm:h-44 pointer-events-none opacity-40 transition-opacity duration-500"
            style={{
              background: 'radial-gradient(ellipse at top, rgba(253, 224, 71, 0.45) 0%, rgba(251, 191, 36, 0.15) 50%, transparent 80%)',
            }}
          />
        )}
      </div>

      {/* Pull Cord & Switch Bead */}
      <div
        onClick={handlePullRope}
        className={`cursor-pointer flex flex-col items-center group/cord pt-0.5 transition-transform ${
          isPulling ? 'animate-rope-pull' : 'hover:translate-y-1'
        }`}
        title="Pull rope to toggle Day / Night theme"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handlePullRope();
          }
        }}
      >
        {/* Beaded cord line */}
        <div className="w-0.5 h-12 sm:h-16 bg-gradient-to-b from-amber-600 via-amber-700 to-amber-800 dark:from-amber-400 dark:to-amber-600 relative">
          {/* Small decorative beads */}
          <span className="absolute top-2 -left-0.5 w-1.5 h-1.5 rounded-full bg-amber-500" />
          <span className="absolute top-6 -left-0.5 w-1.5 h-1.5 rounded-full bg-amber-500" />
          <span className="absolute top-10 -left-0.5 w-1.5 h-1.5 rounded-full bg-amber-500" />
        </div>

        {/* Pull Bell / Brass Knob at the bottom */}
        <div className="w-3.5 h-5 rounded-b-full bg-gradient-to-b from-amber-400 to-amber-600 shadow-md border border-amber-300 group-hover/cord:scale-110 group-hover/cord:shadow-lg transition-transform" />

        {/* Small Pull Tag Indicator */}
        <span className="mt-1.5 px-2 py-0.5 text-[10px] font-bold rounded-full bg-gray-900/80 dark:bg-amber-400/90 text-white dark:text-gray-950 shadow-sm opacity-80 group-hover/cord:opacity-100 transition whitespace-nowrap">
          {isDark ? '💡 Pull for Light' : '🌙 Pull for Dark'}
        </span>
      </div>
    </div>
  );
};

export default HangingLamp;

