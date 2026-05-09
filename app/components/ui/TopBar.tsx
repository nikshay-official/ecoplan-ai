'use client';

import { useState, useEffect } from 'react';
import { useEcoStore, CITIES } from '@/app/store/useEcoStore';

export default function TopBar() {
  const { cityInput, setCityInput, setCity, selectedCity, isLoading } = useEcoStore();
  const [time, setTime] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const handleInput = (v: string) => {
    setCityInput(v);
    if (v.length > 1) {
      const matches = Object.keys(CITIES).filter(k => k.includes(v.toLowerCase())).slice(0, 4);
      setSuggestions(matches);
    } else {
      setSuggestions([]);
    }
  };

  const submit = (key?: string) => {
    const target = key || cityInput;
    setCity(target);
    setSuggestions([]);
  };

  return (
    <header className="relative z-50 flex items-center justify-between px-6 py-3 border-b border-[rgba(0,200,255,0.2)]"
      style={{ background: 'rgba(0,10,28,0.97)', backdropFilter: 'blur(12px)' }}>

      {/* Logo */}
      <div>
        <h1 className="font-['Orbitron'] text-lg font-black tracking-[0.3em] text-[#00d4ff]"
          style={{ textShadow: '0 0 20px rgba(0,212,255,0.6)' }}>
          ECOPLAN AI
        </h1>
        <p className="text-[10px] tracking-[0.2em] text-[rgba(0,212,255,0.5)] mt-0.5">
          ENVIRONMENTAL SIMULATION PLATFORM v2.4
        </p>
      </div>

      {/* Search */}
      <div className="relative flex gap-2 items-center">
        <div className="relative">
          <input
            type="text"
            value={cityInput}
            onChange={e => handleInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            placeholder="Enter city (e.g. Mumbai)"
            className="bg-[rgba(0,200,255,0.07)] border border-[rgba(0,200,255,0.25)] text-white px-4 py-2 rounded text-sm w-56 outline-none focus:border-[rgba(0,200,255,0.6)] transition-colors placeholder:text-[rgba(150,200,255,0.3)]"
            style={{ fontFamily: 'var(--font-body)' }}
          />
          {suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 border border-[rgba(0,200,255,0.2)] rounded overflow-hidden z-50"
              style={{ background: 'rgba(0,10,30,0.98)' }}>
              {suggestions.map(s => (
                <button key={s} onClick={() => submit(s)}
                  className="block w-full text-left px-4 py-2 text-sm text-[rgba(200,230,255,0.8)] hover:bg-[rgba(0,200,255,0.1)] transition-colors capitalize">
                  {CITIES[s]?.name}, {CITIES[s]?.country}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={() => submit()}
          disabled={isLoading}
          className="px-4 py-2 border border-[rgba(0,200,255,0.35)] text-[#00d4ff] text-sm tracking-widest rounded transition-all hover:bg-[rgba(0,200,255,0.15)] disabled:opacity-50"
          style={{ fontFamily: 'Orbitron, monospace' }}>
          {isLoading ? '...' : 'SCAN'}
        </button>
      </div>

      {/* Right: City + Time */}
      <div className="text-right">
        <div className="text-sm text-[rgba(150,200,255,0.8)] font-semibold tracking-wide">
          📍 {selectedCity.name}, {selectedCity.country}
        </div>
        <div className="font-['Space_Mono'] text-xs text-[rgba(0,212,255,0.5)] mt-0.5 flex items-center justify-end gap-3">
          <span>{selectedCity.lat.toFixed(2)}°N · {selectedCity.lng.toFixed(2)}°E</span>
          <span className="text-[#00d4ff] animate-blink">⬤</span>
          <span>{time}</span>
        </div>
      </div>
    </header>
  );
}
