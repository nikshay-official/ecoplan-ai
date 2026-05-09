'use client';

import { useEcoStore, OBJECT_CONFIG, ObjectType } from '@/app/store/useEcoStore';

const AQI_LABELS = [
  { max: 50,  label: 'Good',       color: '#00ff88' },
  { max: 100, label: 'Moderate',   color: '#ffdd00' },
  { max: 150, label: 'Unhealthy',  color: '#ff8800' },
  { max: 200, label: 'Very High',  color: '#ff4400' },
  { max: 999, label: 'Hazardous',  color: '#ff2200' },
];

function aqiInfo(aqi: number) {
  return AQI_LABELS.find(l => aqi <= l.max) || AQI_LABELS[AQI_LABELS.length - 1];
}

function ScoreRing({ score, max = 100 }: { score: number; max?: number }) {
  const pct = Math.min(1, score / max);
  const r = 32, circ = 2 * Math.PI * r;
  const dash = circ * pct;
  const color = pct < 0.35 ? '#00ff88' : pct < 0.65 ? '#ffaa00' : '#ff4444';
  return (
    <div className="relative w-20 h-20 mx-auto my-3">
      <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(0,200,255,0.08)" strokeWidth="6" />
        <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1.5s ease, stroke 1s ease' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-['Orbitron'] text-lg font-bold text-[#00d4ff]">{score}</span>
        <span className="text-[9px] text-[rgba(150,200,255,0.5)] tracking-wider">SCORE</span>
      </div>
    </div>
  );
}

function StatRow({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-[rgba(0,200,255,0.07)]">
      <span className="text-xs tracking-widest text-[rgba(150,200,255,0.5)]">{label}</span>
      <span className="font-['Space_Mono'] text-base font-bold" style={{ color }}>
        {value} <span className="text-xs opacity-60">{unit}</span>
      </span>
    </div>
  );
}

export default function Sidebar() {
  const {
    setDragItem, dragItem, placedObjects, resetAll, removeObject,
    currentAQI, currentCO2, currentPM25, improvementPct,
    selectedCity, vizMode, setVizMode, radiusKm, setRadiusKm,
  } = useEcoStore();

  const pollScore = Math.round(Math.min(100, (currentAQI / 350) * 100));
  const info = aqiInfo(currentAQI);

  const handleDragStart = (type: ObjectType) => {
    setDragItem(type);
  };

  return (
    <aside className="w-56 flex-shrink-0 overflow-y-auto border-r border-[rgba(0,200,255,0.12)] flex flex-col"
      style={{ background: 'rgba(0,8,22,0.98)' }}>
      <div className="p-4 space-y-5">

        {/* Pollution index */}
        <section>
          <SectionHeader>📊 POLLUTION INDEX</SectionHeader>
          <ScoreRing score={pollScore} />
          <div className="text-center mb-3">
            <span className="text-xs px-3 py-0.5 rounded-full border"
              style={{ color: info.color, borderColor: info.color + '44', background: info.color + '11' }}>
              {info.label}
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-[rgba(255,255,255,0.05)] overflow-hidden mb-1">
            <div className="h-full rounded-full transition-all duration-1000"
              style={{ width: pollScore + '%', background: info.color }} />
          </div>
          <div className="flex justify-between text-[9px] text-[rgba(150,200,255,0.3)] tracking-wider">
            <span>CLEAN</span><span>HAZARDOUS</span>
          </div>
          <div className="mt-3 space-y-0">
            <StatRow label="AQI" value={currentAQI} unit="" color={info.color} />
            <StatRow label="CO₂ PPM" value={currentCO2} unit="ppm" color="#ffaa00" />
            <StatRow label="PM2.5" value={currentPM25} unit="μg" color={pollScore > 60 ? '#ff4444' : '#ffaa00'} />
            <StatRow label="IMPROVED" value={improvementPct} unit="%" color="#00ff88" />
            <StatRow label="OBJECTS" value={placedObjects.length} unit="" color="#00d4ff" />
          </div>
        </section>

        {/* Drop Objects */}
        <section>
          <SectionHeader>🌿 DRAG TO MAP</SectionHeader>
          <p className="text-[10px] text-[rgba(150,200,255,0.4)] mb-2 tracking-wide">
            Drag any item onto the 3D terrain
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {(Object.entries(OBJECT_CONFIG) as [ObjectType, typeof OBJECT_CONFIG[ObjectType]][]).map(([type, cfg]) => (
              <div
                key={type}
                draggable
                onDragStart={() => handleDragStart(type)}
                onDragEnd={() => setDragItem(null)}
                className="flex flex-col items-center p-2 rounded cursor-grab active:cursor-grabbing select-none transition-all hover:-translate-y-0.5"
                style={{
                  background: dragItem === type ? 'rgba(0,200,255,0.15)' : 'rgba(0,200,255,0.04)',
                  border: `1px solid ${dragItem === type ? 'rgba(0,200,255,0.5)' : 'rgba(0,200,255,0.15)'}`,
                }}>
                <span className="text-xl mb-0.5">{cfg.icon}</span>
                <span className="text-[9px] tracking-wider text-[rgba(200,230,255,0.6)]">{cfg.label.toUpperCase()}</span>
                <span className="text-[8px] mt-0.5" style={{ color: cfg.color }}>-{cfg.reduction}% CO₂</span>
              </div>
            ))}
          </div>
        </section>

        {/* Viz mode */}
        <section>
          <SectionHeader>🎨 VISUALIZATION</SectionHeader>
          <div className="flex gap-1">
            {(['heatmap', 'waves', 'particles'] as const).map(m => (
              <button key={m} onClick={() => setVizMode(m)}
                className="flex-1 py-1.5 text-[9px] tracking-wider rounded transition-all uppercase"
                style={{
                  background: vizMode === m ? 'rgba(0,200,255,0.2)' : 'rgba(0,200,255,0.04)',
                  border: `1px solid ${vizMode === m ? '#00d4ff' : 'rgba(0,200,255,0.15)'}`,
                  color: vizMode === m ? '#00d4ff' : 'rgba(150,200,255,0.5)',
                }}>
                {m === 'heatmap' ? 'HEAT' : m === 'waves' ? 'WAVE' : 'PCLS'}
              </button>
            ))}
          </div>
        </section>

        {/* Scan radius */}
        <section>
          <SectionHeader>📡 SCAN RADIUS</SectionHeader>
          <div className="flex gap-1">
            {([1, 3, 5] as const).map(r => (
              <button key={r} onClick={() => setRadiusKm(r)}
                className="flex-1 py-1.5 text-[9px] tracking-wider rounded transition-all"
                style={{
                  background: radiusKm === r ? 'rgba(0,200,255,0.2)' : 'rgba(0,200,255,0.04)',
                  border: `1px solid ${radiusKm === r ? '#00d4ff' : 'rgba(0,200,255,0.15)'}`,
                  color: radiusKm === r ? '#00d4ff' : 'rgba(150,200,255,0.5)',
                }}>
                {r}KM
              </button>
            ))}
          </div>
        </section>

        {/* Placed items */}
        {placedObjects.length > 0 && (
          <section>
            <SectionHeader>✅ PLACED ({placedObjects.length})</SectionHeader>
            <div className="space-y-1 max-h-36 overflow-y-auto">
              {[...placedObjects].reverse().map(obj => (
                <div key={obj.id}
                  className="flex justify-between items-center text-[10px] px-2 py-1 rounded"
                  style={{ background: 'rgba(0,255,136,0.05)', border: '1px solid rgba(0,255,136,0.1)' }}>
                  <span>{OBJECT_CONFIG[obj.type].icon} {obj.type.toUpperCase()}</span>
                  <button onClick={() => removeObject(obj.id)}
                    className="text-[rgba(255,100,100,0.6)] hover:text-[rgba(255,100,100,1)] transition-colors text-xs">
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Legend */}
        <section>
          <SectionHeader>🎨 LEGEND</SectionHeader>
          <div className="space-y-1.5">
            {[
              { color: '#ff2200', label: 'Critical (300+)' },
              { color: '#ff8800', label: 'Severe (200-300)' },
              { color: '#ffdd00', label: 'Moderate (100-200)' },
              { color: '#44ff88', label: 'Good (<100)' },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: l.color, boxShadow: `0 0 6px ${l.color}` }} />
                <span className="text-[10px] text-[rgba(200,220,255,0.5)]">{l.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Reset */}
        <button onClick={resetAll}
          className="w-full py-2 text-xs tracking-[0.2em] rounded transition-all hover:bg-[rgba(255,80,80,0.15)] uppercase"
          style={{ background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.25)', color: 'rgba(255,150,150,0.7)' }}>
          RESET ZONE
        </button>

      </div>
    </aside>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-['Orbitron'] text-[9px] tracking-[0.25em] text-[rgba(0,200,255,0.6)] mb-2 pb-1.5 border-b border-[rgba(0,200,255,0.1)] uppercase">
      {children}
    </h3>
  );
}
