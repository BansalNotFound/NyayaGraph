"use client";

import React, { useState, useEffect } from 'react';

export const ThreeDetroitCity: React.FC = () => {
  const [beamAngle, setBeamAngle] = useState(0);

  useEffect(() => {
    const anim = setInterval(() => {
      setBeamAngle(a => (a + 2) % 360);
    }, 30);
    return () => clearInterval(anim);
  }, []);

  return (
    <div className="relative w-full h-full min-h-[380px] flex items-center justify-center bg-[#070d18] overflow-hidden">
      {/* Precision Grid Matrix */}
      <div 
        className="absolute inset-0 opacity-15"
        style={{
          backgroundImage: 'linear-gradient(to right, #00d2ff 1px, transparent 1px), linear-gradient(to bottom, #00d2ff 1px, transparent 1px)',
          backgroundSize: '32px 32px'
        }}
      />

      {/* Surveillance Radar Scope SVG */}
      <svg viewBox="0 0 400 400" className="w-[90%] h-[90%] max-w-[380px] max-h-[380px] relative z-10">
        {/* Outer Bearing Ring */}
        <circle cx="200" cy="200" r="180" fill="none" stroke="#00d2ff" strokeWidth="1" strokeDasharray="4 3" opacity="0.4" />
        <circle cx="200" cy="200" r="135" fill="none" stroke="#00d2ff" strokeWidth="0.8" opacity="0.3" />
        <circle cx="200" cy="200" r="90" fill="none" stroke="#00d2ff" strokeWidth="0.8" opacity="0.3" />
        <circle cx="200" cy="200" r="45" fill="none" stroke="#00d2ff" strokeWidth="1" opacity="0.5" />

        {/* Crosshair Axes */}
        <line x1="20" y1="200" x2="380" y2="200" stroke="#00d2ff" strokeWidth="0.8" opacity="0.5" />
        <line x1="200" y1="20" x2="200" y2="380" stroke="#00d2ff" strokeWidth="0.8" opacity="0.5" />

        {/* Radar Sweeping Beam */}
        <g transform={`rotate(${beamAngle} 200 200)`}>
          <line x1="200" y1="200" x2="380" y2="200" stroke="#00d2ff" strokeWidth="2" opacity="0.9" />
          <path
            d="M 200 200 L 380 200 A 180 180 0 0 0 355 125 Z"
            fill="url(#radarSweepGrad)"
            opacity="0.3"
          />
        </g>

        {/* Tactical Waypoint Blips */}
        <circle cx="270" cy="140" r="4" fill="#00d2ff" className="animate-ping" />
        <circle cx="270" cy="140" r="2.5" fill="#ffffff" />
        <text x="280" y="145" fill="#00d2ff" fontSize="9" fontFamily="monospace">SECTOR-04 // DETROIT TOWER</text>

        <circle cx="130" cy="260" r="3" fill="#ff4b6b" />
        <circle cx="130" cy="260" r="6" fill="none" stroke="#ff4b6b" strokeWidth="1" opacity="0.7" />
        <text x="60" y="275" fill="#ff4b6b" fontSize="9" fontFamily="monospace">ANOMALY // DEVIANCY SPIKE</text>

        <circle cx="220" cy="290" r="3" fill="#00d2ff" />
        <text x="230" y="295" fill="#88a0c0" fontSize="8" fontFamily="monospace">CYBERLIFE LOGISTICS NODE</text>

        {/* Gradients */}
        <defs>
          <linearGradient id="radarSweepGrad" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#00d2ff" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#00d2ff" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>

      {/* HUD Telemetry Labels */}
      <div className="absolute top-4 left-4 font-mono text-[10px] text-[#00d2ff] tracking-widest space-y-0.5">
        <div>ORBITAL TELEMETRY // SAT-09</div>
        <div className="text-gray-400">LAT: 42.3314° N  LON: 83.0458° W</div>
      </div>

      <div className="absolute bottom-4 right-4 font-mono text-[10px] text-gray-400 text-right">
        <div className="text-[#00d2ff] font-bold">GRID CALIBRATION: OPTIMAL</div>
        <div>AZIMUTH: {beamAngle}°</div>
      </div>
    </div>
  );
};
