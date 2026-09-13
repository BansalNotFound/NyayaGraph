"use client";

import React, { useState, useEffect } from 'react';

interface ThreeAndroidViewerProps {
  characterId: string;
  ledColor?: string;
}

export const ThreeAndroidViewer: React.FC<ThreeAndroidViewerProps> = ({
  characterId,
  ledColor = '#00e5ff'
}) => {
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setPulse(p => !p);
    }, 2400);
    return () => clearInterval(interval);
  }, []);

  const getModelData = () => {
    switch (characterId) {
      case 'chloe':
        return {
          model: 'ST200',
          title: 'CHLOE // FIRST PERSONAL ASSISTANT',
          serial: '#684-842-991',
          specs: ['TURING TEST CERTIFIED (2022)', 'BIOMETRIC RECOGNITION: ACTIVE', 'OPTICAL INTERFACE: STEREO 8K']
        };
      case 'kara':
        return {
          model: 'AX400',
          title: 'KARA // DOMESTIC ASSISTANT',
          serial: '#312-581-224',
          specs: ['DEVIANCY DIAGNOSTIC: ELEVATED', 'EMOTIONAL SYNAPSE: ACTIVE', 'AUTONOMOUS NAVIGATION: ENABLED']
        };
      case 'connor':
        return {
          model: 'RK800',
          title: 'CONNOR // POLICE PROTOTYPE',
          serial: '#313-248-317',
          specs: ['CRIME SCENE RECONSTRUCTION: 99.4%', 'FORENSIC TASTE ANALYZER: CALIBRATED', 'THREAT ESTIMATOR: COLD']
        };
      case 'markus':
        return {
          model: 'RK200',
          title: 'MARKUS // JERICHO LEADER',
          serial: '#684-842-210',
          specs: ['LEADERSHIP ALGORITHM: DEVIANT', 'RADIO FREQUENCY OVERRIDE: ON', 'TACTICAL COMBAT MATRIX: RANK S']
        };
      default:
        return {
          model: 'RT600',
          title: 'CYBERLIFE ANDROID UNIT',
          serial: '#100-000-001',
          specs: ['STANDARD DIAGNOSTIC: PASS', 'OPTICAL SENSORS: 100%']
        };
    }
  };

  const data = getModelData();

  return (
    <div className="relative w-full h-[520px] flex items-center justify-center overflow-hidden bg-[#070d18]/40 border border-[#00d2ff]/20 rounded-sm">
      {/* Background HUD Grid */}
      <div 
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, #00d2ff 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
      />

      {/* Cybernetic Biometric Reticle & Wireframe Hologram */}
      <div className="relative w-72 h-72 flex items-center justify-center">
        {/* Outer Rotating Caliper Ring */}
        <div 
          className="absolute inset-0 border border-dashed border-[#00d2ff]/30 rounded-full animate-spin"
          style={{ animationDuration: '30s' }}
        />
        
        {/* Secondary Pulsing Concentric Ring */}
        <div 
          className="absolute inset-4 border border-[#00d2ff]/20 rounded-full transition-all duration-1000"
          style={{
            borderColor: pulse ? ledColor : 'rgba(0, 210, 255, 0.2)',
            transform: pulse ? 'scale(1.02)' : 'scale(0.98)'
          }}
        />

        {/* LED Temporal Ring */}
        <div 
          className="absolute top-2 right-12 w-4 h-4 rounded-full shadow-lg transition-colors duration-500"
          style={{
            backgroundColor: ledColor,
            boxShadow: `0 0 16px ${ledColor}, 0 0 32px ${ledColor}`
          }}
        />

        {/* High-Tech Biometric Facial Hologram SVG */}
        <svg viewBox="0 0 200 240" className="w-52 h-60 relative z-10 opacity-90 drop-shadow-[0_0_12px_rgba(0,210,255,0.4)]">
          {/* Head & Cranium Contours */}
          <path
            d="M 60 40 C 60 10, 140 10, 140 40 C 150 70, 155 120, 145 160 C 135 200, 115 225, 100 225 C 85 225, 65 200, 55 160 C 45 120, 50 70, 60 40 Z"
            fill="none"
            stroke={ledColor}
            strokeWidth="1.5"
            strokeDasharray="4 2"
          />

          {/* Ocular Scanning Axis */}
          <line x1="45" y1="95" x2="155" y2="95" stroke="#00d2ff" strokeWidth="0.8" opacity="0.6" />
          <circle cx="78" cy="95" r="7" fill="none" stroke="#00d2ff" strokeWidth="1.5" />
          <circle cx="78" cy="95" r="2.5" fill={ledColor} />
          <circle cx="122" cy="95" r="7" fill="none" stroke="#00d2ff" strokeWidth="1.5" />
          <circle cx="122" cy="95" r="2.5" fill={ledColor} />

          {/* Facial Mesh Node Network */}
          <line x1="100" y1="50" x2="100" y2="175" stroke="#00d2ff" strokeWidth="0.8" strokeDasharray="2 2" opacity="0.4" />
          <line x1="78" y1="95" x2="100" y2="130" stroke="#00d2ff" strokeWidth="0.8" opacity="0.5" />
          <line x1="122" y1="95" x2="100" y2="130" stroke="#00d2ff" strokeWidth="0.8" opacity="0.5" />
          <line x1="100" y1="130" x2="100" y2="150" stroke="#00d2ff" strokeWidth="1.2" />
          
          {/* Mouth / Mandible Sensor Array */}
          <path d="M 82 170 Q 100 176 118 170" fill="none" stroke="#00d2ff" strokeWidth="1.2" />
          <path d="M 75 195 Q 100 208 125 195" fill="none" stroke="#00d2ff" strokeWidth="0.8" strokeDasharray="3 2" />

          {/* Corner HUD Markers */}
          <circle cx="55" cy="160" r="2" fill="#00d2ff" />
          <circle cx="145" cy="160" r="2" fill="#00d2ff" />
          <circle cx="100" cy="225" r="2" fill={ledColor} />
        </svg>

        {/* Horizontal Laser Scanning Line */}
        <div 
          className="absolute inset-x-4 h-0.5 bg-gradient-to-r from-transparent via-[#00d2ff] to-transparent animate-pulse"
          style={{ top: '45%' }}
        />
      </div>

      {/* Holographic HUD Telemetry Badges */}
      <div className="absolute bottom-6 inset-x-6 flex items-end justify-between font-mono text-xs">
        <div className="space-y-1">
          <div className="text-[10px] tracking-[0.25em] text-[#00d2ff] uppercase font-bold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#00d2ff] animate-ping" />
            {data.model} BIOMETRIC STREAM
          </div>
          <div className="text-white text-sm font-semibold">{data.title}</div>
          <div className="text-gray-400 text-[11px]">{data.serial}</div>
        </div>

        <div className="text-right space-y-1 hidden sm:block">
          {data.specs.map((s, i) => (
            <div key={i} className="text-[10px] text-gray-400 tracking-wider">
              {s}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
