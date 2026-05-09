'use client';

import { useEffect, useState } from 'react';
import { useEcoStore } from '@/app/store/useEcoStore';

interface Recommendation {
  text: string;
  impact: 'high' | 'medium' | 'low';
}

const IMPACT_STYLES = {
  high:   { color: '#ff4444', label: 'HIGH' },
  medium: { color: '#ffaa00', label: 'MED' },
  low:    { color: '#00ff88', label: 'LOW' },
};

export default function AIPanel() {
  const { currentAQI, improvementPct, placedObjects, selectedCity } = useEcoStore();
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    const baseRecs: Recommendation[] = currentAQI > 200 ? [
      { text: `Deploy 12+ trees in the industrial hotspot zones — reduces PM2.5 by ~22%`, impact: 'high' },
      { text: `Two large parks in the northern sector could cut AQI by 34 points`, impact: 'high' },
      { text: `EV charging stations along the main corridor reduce traffic NOx`, impact: 'medium' },
      { text: `Green walls on the east arterial road filter fine particles`, impact: 'medium' },
      { text: `Water bodies near factories cool microclimate & trap dust`, impact: 'low' },
    ] : currentAQI > 100 ? [
      { text: `Strategic tree placement along Highway 8 reduces AQI 12–18%`, impact: 'high' },
      { text: `Rooftop solar on commercial district reduces grid emissions`, impact: 'medium' },
      { text: `Urban parks near schools: critical for children's respiratory health`, impact: 'high' },
      { text: `EV hubs replace emissions-heavy ride-hailing stops`, impact: 'low' },
    ] : [
      { text: `Maintain existing green infrastructure — city is performing well`, impact: 'low' },
      { text: `Expand cycling lanes to reduce last-mile vehicle emissions`, impact: 'low' },
      { text: `Urban gardens improve biodiversity and local air quality`, impact: 'low' },
    ];

    if (improvementPct > 15) {
      baseRecs.unshift({ text: `🎉 Excellent! You've improved air quality by ${improvementPct}%`, impact: 'low' });
    }
    setRecs(baseRecs);
  }, [currentAQI, improvementPct, selectedCity]);

  return (
    <div className="border-t border-[rgba(0,200,255,0.12)] flex-shrink-0"
      style={{ background: 'rgba(0,8,22,0.97)' }}>
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-5 py-2.5 text-left hover:bg-[rgba(0,200,255,0.04)] transition-colors">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-['Orbitron'] tracking-[0.2em] text-[rgba(0,200,255,0.7)]">
            🤖 AI RECOMMENDATIONS
          </span>
          <span className="text-[8px] px-1.5 py-0.5 rounded-full text-[#00ff88] border border-[rgba(0,255,136,0.3)] bg-[rgba(0,255,136,0.05)]">
            {recs.length} ACTIONS
          </span>
        </div>
        <span className="text-[rgba(0,200,255,0.4)] text-xs transition-transform duration-200"
          style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>▲</span>
      </button>

      {expanded && (
        <div className="px-5 pb-3 grid grid-cols-1 md:grid-cols-3 gap-2">
          {recs.map((r, i) => {
            const style = IMPACT_STYLES[r.impact];
            return (
              <div key={i} className="flex gap-2 items-start p-2 rounded text-xs"
                style={{ background: 'rgba(0,200,255,0.03)', border: '1px solid rgba(0,200,255,0.08)' }}>
                <span className="text-[8px] font-['Orbitron'] px-1 py-0.5 rounded mt-0.5 flex-shrink-0"
                  style={{ color: style.color, background: style.color + '15', border: `1px solid ${style.color}33` }}>
                  {style.label}
                </span>
                <span className="text-[rgba(200,220,255,0.65)] leading-relaxed">{r.text}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
