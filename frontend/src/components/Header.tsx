"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { soundFx } from '@/lib/audio';

interface HeaderProps {
  currentView: string;
  onSelectView: (view: string) => void;
  blueprintActive: boolean;
  onToggleBlueprint: () => void;
  onSearchClick: () => void;
  onProfileClick: () => void;
}

const LED_STATES = [
  { class: '', label: 'COMPLIANT' },
  { class: 'warning', label: 'WARNING' },
  { class: 'deviant', label: 'DEVIANT' }
];

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onSelectView,
  blueprintActive,
  onToggleBlueprint,
  onSearchClick,
  onProfileClick
}) => {
  const [ledIdx, setLedIdx] = useState(0);

  const handleLedClick = () => {
    const next = (ledIdx + 1) % LED_STATES.length;
    setLedIdx(next);
    if (LED_STATES[next].class === 'deviant') {
      soundFx.play('alert');
    } else {
      soundFx.play('click');
    }
  };

  const navItems = [
    { id: 'lore', label: 'Lore' },
    { id: 'characters', label: 'Characters' },
    { id: 'flowchart', label: 'Flowchart' }
  ];

  return (
    <header className="cyber-header">
      <div 
        className="cyber-brand" 
        onClick={() => {
          soundFx.play('click');
          onSelectView('characters');
        }}
        title="Return to Core Interface"
      >
        <div className="brand-main-title">DETROIT</div>
        <div className="brand-sub-title">BECOME HUMAN</div>
        <div className="brand-home-tag">HOME</div>
      </div>

      {/* Nav Links - Exact 3 functional reference sections */}
      <nav className="cyber-nav">
        {navItems.map(item => (
          <button
            key={item.id}
            className={`cyber-nav-item ${currentView === item.id ? 'active' : ''}`}
            onClick={() => {
              soundFx.play('click');
              onSelectView(item.id);
            }}
            onMouseEnter={() => soundFx.play('hover')}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {/* Tools: Search, Profile, Detroit Temple LED */}
      <div className="cyber-header-tools">
        <Link 
          href="/dashboard"
          className="hud-tool-btn px-2.5 py-1 text-[10px] font-mono font-bold tracking-widest text-[#00d2ff] bg-[#00d2ff]/10 hover:bg-[#00d2ff]/20 border border-[#00d2ff]/40 rounded-sm flex items-center gap-1.5 transition-all text-decoration-none"
          title="Open NyayaGraph CBI Criminal Profiler & Force Workbench"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#00d2ff] animate-pulse" />
          CBI PROFILER
        </Link>

        <button 
          className="hud-tool-btn" 
          onClick={() => {
            soundFx.play('click');
            onSearchClick();
          }}
          title="Search CyberLife Records"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="18" height="18">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </button>

        <button 
          className="hud-tool-btn" 
          onClick={() => {
            soundFx.play('chime');
            onProfileClick();
          }}
          title="Operator Profile"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="18" height="18">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
        </button>

        {/* Detroit Temple LED Ring */}
        <div 
          className={`android-temple-led ${LED_STATES[ledIdx].class}`} 
          onClick={handleLedClick}
          title={`CyberLife Thirium LED: ${LED_STATES[ledIdx].label} (Click to toggle deviation)`}
        />
      </div>
    </header>
  );
};
