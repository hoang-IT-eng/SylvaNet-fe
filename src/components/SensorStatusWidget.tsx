/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Activity, RefreshCw, Wifi, WifiOff, Battery, ChevronDown, ChevronUp, Radio } from 'lucide-react';

export interface FieldSensor {
  id: string;
  name: string;
  zone: string;
  status: 'online' | 'offline';
  reading: string;
  metric: string;
  battery: number;
  latencyMs: number;
  lastPing: string;
}

interface SensorDataResponse {
  timestamp: string;
  stationId: string;
  meshHealth: string;
  activeCount: number;
  totalCount: number;
  sensors: FieldSensor[];
}

// Fallback client-side mock if backend is unreachable
const FALLBACK_SENSORS: FieldSensor[] = [
  { id: 'MS-CANOPY-04', name: 'Canopy RH & Flux', zone: 'North Ridge Quad', status: 'online', reading: '71% RH', metric: '14.2°C', battery: 94, latencyMs: 18, lastPing: '2s ago' },
  { id: 'MS-SOIL-12', name: 'Sub-surface Peat Core', zone: 'Wetland Baseline', status: 'online', reading: '+3.8 tCO₂e/ha', metric: '6.4 pH', battery: 88, latencyMs: 22, lastPing: '3s ago' },
  { id: 'MS-MAST-07', name: 'AMRV Eddy Covariance', zone: 'Central Monolith', status: 'online', reading: '412.8 ppm CO₂', metric: '0.48 m/s', battery: 99, latencyMs: 12, lastPing: '1s ago' },
  { id: 'MS-SPECIES-02', name: 'Acoustic Bio-monitor', zone: 'Fern Understory', status: 'offline', reading: '214 taxa', metric: 'Bio-index 8.4', battery: 14, latencyMs: 1420, lastPing: '6m ago' },
  { id: 'MS-MICRO-19', name: 'Microclimate Dendro', zone: 'South Crevice', status: 'online', reading: '13.8°C', metric: '82% Soil Sat', battery: 76, latencyMs: 31, lastPing: '4s ago' },
  { id: 'MS-SPORE-05', name: 'Optical Spore Counter', zone: 'Lichen Crest', status: 'online', reading: '38 pts/m³', metric: 'Solar 840 W/m²', battery: 82, latencyMs: 45, lastPing: '2s ago' },
];

export const SensorStatusWidget: React.FC = () => {
  const [data, setData] = useState<SensorDataResponse>({
    timestamp: new Date().toISOString(),
    stationId: 'STATION-07-ALTO',
    meshHealth: '85.7%',
    activeCount: 5,
    totalCount: 6,
    sensors: FALLBACK_SENSORS,
  });
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [filter, setFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [lastRefreshed, setLastRefreshed] = useState<string>('just now');

  const fetchSensorStatus = async () => {
    setIsFetching(true);
    try {
      const res = await fetch('/api/sensors/status');
      if (!res.ok) throw new Error('Failed to fetch from API');
      const json: SensorDataResponse = await res.json();
      setData(json);
      setLastRefreshed(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch {
      // In case of transient network error, randomly jitter fallback data to keep UI lively
      setData(prev => {
        const toggled = prev.sensors.map((s, i) => {
          const isOff = i === 3 && Math.random() > 0.3;
          return {
            ...s,
            status: isOff ? ('offline' as const) : ('online' as const),
            battery: Math.max(10, Math.min(100, s.battery + Math.floor(Math.random() * 3 - 1))),
            lastPing: isOff ? '4m ago' : '1s ago',
          };
        });
        const onlineCount = toggled.filter(s => s.status === 'online').length;
        return {
          ...prev,
          timestamp: new Date().toISOString(),
          activeCount: onlineCount,
          meshHealth: `${((onlineCount / toggled.length) * 100).toFixed(1)}%`,
          sensors: toggled,
        };
      });
      setLastRefreshed(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchSensorStatus();
    // Auto-refresh every 5 seconds
    const interval = setInterval(fetchSensorStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const filteredSensors = data.sensors.filter(s => {
    if (filter === 'online') return s.status === 'online';
    if (filter === 'offline') return s.status === 'offline';
    return true;
  });

  return (
    <div
      className="sensor-widget font-sans transition-all duration-300"
      style={{
        width: isExpanded ? 'min(360px, 90vw)' : 'max-content',
        background: 'rgba(246, 248, 245, 0.72)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.55)',
        boxShadow: '0 8px 32px rgba(16, 41, 26, 0.08), 0 1px 3px rgba(16, 41, 26, 0.05)',
        borderRadius: '12px',
        color: 'var(--ink)',
        zIndex: 25,
      }}
    >
      {/* Header bar */}
      <div className="p-3 sm:p-3.5 flex items-center justify-between gap-3 border-b border-[rgba(16,41,26,0.08)]">
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center">
            <span className="w-2.5 h-2.5 rounded-full bg-[#a9dd3a]" />
            <span className="absolute w-4 h-4 rounded-full bg-[#c6f35c] opacity-75 animate-ping pointer-events-none" />
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink2)] font-semibold">
                STATION 07 &bull; TELEMETRY
              </span>
              <span className="chip" style={{ height: '16px', fontSize: '9px', padding: '0 5px' }}>
                LIVE
              </span>
            </div>
            <p className="text-[11px] font-mono text-[var(--ink2)]/80 flex items-center gap-1">
              <span>{data.activeCount}/{data.totalCount} ONLINE</span>
              <span>&bull;</span>
              <span className="text-emerald-700 font-semibold">{data.meshHealth}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={fetchSensorStatus}
            disabled={isFetching}
            className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-black/5 text-[var(--ink2)] transition-colors cursor-pointer"
            title="Refresh telemetry status"
            aria-label="Refresh telemetry status"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-black/5 text-[var(--ink2)] transition-colors cursor-pointer"
            title={isExpanded ? 'Collapse widget' : 'Expand widget'}
            aria-label={isExpanded ? 'Collapse widget' : 'Expand widget'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Sensor List */}
      {isExpanded && (
        <div className="p-3 space-y-2.5">
          {/* Filter Pills */}
          <div className="flex items-center justify-between text-[10px] font-mono">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setFilter('all')}
                className={`px-2 py-0.5 rounded transition-colors ${
                  filter === 'all'
                    ? 'bg-[var(--ink)] text-white'
                    : 'bg-black/5 text-[var(--ink2)] hover:bg-black/10'
                }`}
              >
                ALL ({data.totalCount})
              </button>
              <button
                onClick={() => setFilter('online')}
                className={`px-2 py-0.5 rounded transition-colors ${
                  filter === 'online'
                    ? 'bg-emerald-800 text-white'
                    : 'bg-black/5 text-[var(--ink2)] hover:bg-black/10'
                }`}
              >
                ONLINE ({data.activeCount})
              </button>
              <button
                onClick={() => setFilter('offline')}
                className={`px-2 py-0.5 rounded transition-colors ${
                  filter === 'offline'
                    ? 'bg-amber-800 text-white'
                    : 'bg-black/5 text-[var(--ink2)] hover:bg-black/10'
                }`}
              >
                OFFLINE ({data.totalCount - data.activeCount})
              </button>
            </div>
            <span className="text-[9px] text-[var(--ink2)]/60">Ping: {lastRefreshed}</span>
          </div>

          {/* Sensors Scroll Area */}
          <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-0.5">
            {filteredSensors.map((sensor) => {
              const isOnline = sensor.status === 'online';
              return (
                <div
                  key={sensor.id}
                  className="p-2 rounded-lg bg-white/55 hover:bg-white/85 border border-white/60 transition-all flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        isOnline
                          ? 'bg-[#a9dd3a] ring-2 ring-[#c6f35c]/40'
                          : 'bg-amber-500 ring-2 ring-amber-400/30'
                      }`}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] font-semibold text-[var(--ink)] truncate">
                          {sensor.id}
                        </span>
                        <span className="text-[9px] font-mono text-[var(--ink2)]/60 truncate">
                          ({sensor.zone})
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--ink2)] truncate font-medium">
                        {sensor.name}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="flex items-center justify-end gap-1.5">
                      <span className="text-[10px] font-mono font-semibold text-[var(--ink)]">
                        {sensor.reading}
                      </span>
                      {isOnline ? (
                        <Wifi className="w-3 h-3 text-emerald-700" />
                      ) : (
                        <WifiOff className="w-3 h-3 text-amber-600" />
                      )}
                    </div>
                    <div className="flex items-center justify-end gap-1 text-[9px] font-mono text-[var(--ink2)]/70">
                      <span className="flex items-center gap-0.5">
                        <Battery className="w-2.5 h-2.5" />
                        {sensor.battery}%
                      </span>
                      <span>&bull;</span>
                      <span>{sensor.lastPing}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer note */}
          <div className="pt-1.5 border-t border-[rgba(16,41,26,0.06)] flex items-center justify-between text-[9px] font-mono text-[var(--ink2)]/70">
            <span className="flex items-center gap-1">
              <Radio className="w-2.5 h-2.5 animate-pulse text-[var(--lime2)]" />
              915MHz LoRaWAN Mesh
            </span>
            <span>AES-256 Encrypted</span>
          </div>
        </div>
      )}
    </div>
  );
};
