/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  RefreshCw,
  Wifi,
  WifiOff,
  Battery,
  ChevronDown,
  ChevronUp,
  Radio,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  LineChart as ChartIcon,
  Maximize2,
} from 'lucide-react';
import { ComparativeTelemetryDashboard } from './ComparativeTelemetryDashboard';

export interface HistoryPoint {
  minute: number;
  timeLabel: string;
  clock: string;
  value: number;
}

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
  unit?: string;
  history?: HistoryPoint[];
}

interface SensorDataResponse {
  timestamp: string;
  stationId: string;
  meshHealth: string;
  activeCount: number;
  totalCount: number;
  sensors: FieldSensor[];
}

interface StatusTransition {
  from: 'online' | 'offline';
  to: 'online' | 'offline';
  timestamp: number;
}

// Generate fallback 10m history points
function generateMockHistory(baseVal: number, variance: number, unit?: string): HistoryPoint[] {
  const points: HistoryPoint[] = [];
  const now = new Date();
  let walk = baseVal - variance * 0.5;
  for (let m = 10; m >= 0; m--) {
    walk += (Math.random() - 0.48) * (variance * 0.4);
    const pointTime = new Date(now.getTime() - m * 60 * 1000);
    const valFormatted = unit === 'taxa' ? Math.round(walk) : parseFloat(Math.max(0, walk).toFixed(2));
    points.push({
      minute: -m,
      timeLabel: m === 0 ? 'Now' : `-${m}m`,
      clock: pointTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      value: valFormatted,
    });
  }
  return points;
}

// Fallback client-side mock if backend is unreachable
const FALLBACK_SENSORS: FieldSensor[] = [
  {
    id: 'MS-CANOPY-04',
    name: 'Canopy RH & Flux',
    zone: 'North Ridge Quad',
    status: 'online',
    reading: '71.2% RH',
    metric: '14.2°C',
    battery: 94,
    latencyMs: 18,
    lastPing: '2s ago',
    unit: '% RH',
    history: generateMockHistory(71.0, 1.8, '% RH'),
  },
  {
    id: 'MS-SOIL-12',
    name: 'Sub-surface Peat Core',
    zone: 'Wetland Baseline',
    status: 'online',
    reading: '+3.84 tCO₂e/ha',
    metric: '6.4 pH',
    battery: 88,
    latencyMs: 22,
    lastPing: '3s ago',
    unit: 'tCO₂e/ha',
    history: generateMockHistory(3.8, 0.15, 'tCO₂e/ha'),
  },
  {
    id: 'MS-MAST-07',
    name: 'AMRV Eddy Covariance',
    zone: 'Central Monolith',
    status: 'online',
    reading: '412.8 ppm CO₂',
    metric: '0.48 m/s',
    battery: 99,
    latencyMs: 12,
    lastPing: '1s ago',
    unit: 'ppm CO₂',
    history: generateMockHistory(412.8, 6.5, 'ppm CO₂'),
  },
  {
    id: 'MS-SPECIES-02',
    name: 'Acoustic Bio-monitor',
    zone: 'Fern Understory',
    status: 'offline',
    reading: '214 taxa',
    metric: 'Bio-index 8.4',
    battery: 14,
    latencyMs: 1420,
    lastPing: '6m ago',
    unit: 'taxa',
    history: generateMockHistory(214, 12, 'taxa'),
  },
  {
    id: 'MS-MICRO-19',
    name: 'Microclimate Dendro',
    zone: 'South Crevice',
    status: 'online',
    reading: '13.8°C',
    metric: '82% Soil Sat',
    battery: 76,
    latencyMs: 31,
    lastPing: '4s ago',
    unit: '°C',
    history: generateMockHistory(13.8, 0.8, '°C'),
  },
  {
    id: 'MS-SPORE-05',
    name: 'Optical Spore Counter',
    zone: 'Lichen Crest',
    status: 'online',
    reading: '38.4 pts/m³',
    metric: 'Solar 840 W/m²',
    battery: 82,
    latencyMs: 45,
    lastPing: '2s ago',
    unit: 'pts/m³',
    history: generateMockHistory(38, 4, 'pts/m³'),
  },
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
  const [statusTransitions, setStatusTransitions] = useState<Record<string, StatusTransition>>({});
  const [selectedSensorId, setSelectedSensorId] = useState<string>('MS-CANOPY-04');
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);
  const [isFullDashboardOpen, setIsFullDashboardOpen] = useState<boolean>(false);

  const prevStatusesRef = useRef<Record<string, 'online' | 'offline'>>({});
  const initialMountRef = useRef<boolean>(true);

  const processStatusChanges = (newSensors: FieldSensor[]) => {
    const transitions: Record<string, StatusTransition> = {};
    const now = Date.now();

    newSensors.forEach((s) => {
      const prev = prevStatusesRef.current[s.id];
      if (prev && prev !== s.status && !initialMountRef.current) {
        transitions[s.id] = {
          from: prev,
          to: s.status,
          timestamp: now,
        };
      }
      prevStatusesRef.current[s.id] = s.status;
    });

    initialMountRef.current = false;

    if (Object.keys(transitions).length > 0) {
      setStatusTransitions((curr) => ({ ...curr, ...transitions }));

      setTimeout(() => {
        setStatusTransitions((curr) => {
          const next = { ...curr };
          Object.keys(transitions).forEach((id) => {
            delete next[id];
          });
          return next;
        });
      }, 4500);
    }
  };

  const fetchSensorStatus = async () => {
    setIsFetching(true);
    try {
      const res = await fetch('/api/sensors/status');
      if (!res.ok) throw new Error('Failed to fetch from API');
      const json: SensorDataResponse = await res.json();
      processStatusChanges(json.sensors);
      setData(json);
      setLastRefreshed(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch {
      // Jitter fallback if network is offline
      setData((prev) => {
        const toggled = prev.sensors.map((s, i) => {
          const isOff = (i === 3 && Math.random() > 0.4) || (i === 5 && Math.random() > 0.8);
          const history = s.history ? [...s.history] : generateMockHistory(70, 2);
          // Append new point
          const lastVal = history[history.length - 1]?.value ?? 70;
          const drift = (Math.random() - 0.49) * 0.4;
          const newVal = s.unit === 'taxa' ? Math.round(lastVal + drift) : parseFloat((lastVal + drift).toFixed(2));
          history.shift();
          history.push({
            minute: 0,
            timeLabel: 'Now',
            clock: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            value: newVal,
          });

          return {
            ...s,
            status: isOff ? ('offline' as const) : ('online' as const),
            battery: Math.max(10, Math.min(100, s.battery + Math.floor(Math.random() * 3 - 1))),
            lastPing: isOff ? '4m ago' : '1s ago',
            history,
          };
        });
        const onlineCount = toggled.filter((s) => s.status === 'online').length;
        processStatusChanges(toggled);
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
    const interval = setInterval(fetchSensorStatus, 4500);
    return () => clearInterval(interval);
  }, []);

  const filteredSensors = data.sensors.filter((s) => {
    if (filter === 'online') return s.status === 'online';
    if (filter === 'offline') return s.status === 'offline';
    return true;
  });

  // Selected sensor for the 10-minute chart
  const selectedSensor = useMemo(() => {
    return (
      data.sensors.find((s) => s.id === selectedSensorId) ||
      data.sensors[0] ||
      FALLBACK_SENSORS[0]
    );
  }, [data.sensors, selectedSensorId]);

  // Chart coordinate calculations
  const chartPoints = useMemo(() => {
    const history = selectedSensor?.history || [];
    if (!history || history.length === 0) {
      return { path: '', area: '', points: [], min: 0, max: 0, delta: 0, width: 310, height: 75 };
    }

    const values = history.map((h) => h.value);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal || 1;
    const paddingVal = range * 0.15;
    const chartMin = minVal - paddingVal;
    const chartMax = maxVal + paddingVal;
    const totalRange = chartMax - chartMin || 1;

    const width = 310;
    const height = 75;
    const padX = 12;
    const padY = 8;
    const plotW = width - padX * 2;
    const plotH = height - padY * 2;

    const coords = history.map((h, i) => {
      const x = padX + (i / (history.length - 1)) * plotW;
      const normalizedY = (h.value - chartMin) / totalRange;
      const y = padY + (1 - normalizedY) * plotH;
      return { x, y, ...h };
    });

    const pathD = coords.reduce((acc, pt, i) => {
      return i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
    }, '');

    const lastX = coords[coords.length - 1]?.x ?? width - padX;
    const firstX = coords[0]?.x ?? padX;
    const areaD = `${pathD} L ${lastX} ${height} L ${firstX} ${height} Z`;

    const delta = coords.length >= 2 ? coords[coords.length - 1].value - coords[0].value : 0;

    return {
      path: pathD,
      area: areaD,
      points: coords,
      min: minVal,
      max: maxVal,
      delta: parseFloat(delta.toFixed(2)),
      height,
      width,
    };
  }, [selectedSensor]);

  return (
    <div
      className="sensor-widget font-sans transition-all duration-300"
      style={{
        width: isExpanded ? 'min(380px, 92vw)' : 'max-content',
        background: 'rgba(246, 248, 245, 0.78)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.65)',
        boxShadow: '0 8px 32px rgba(16, 41, 26, 0.12), 0 1px 3px rgba(16, 41, 26, 0.05)',
        borderRadius: '12px',
        color: 'var(--ink)',
        zIndex: 25,
      }}
    >
      {/* Header bar */}
      <div className="p-3 sm:p-3.5 flex items-center justify-between gap-3 border-b border-[rgba(16,41,26,0.08)]">
        <div className="flex items-center gap-2.5">
          {/* Main live mesh indicator */}
          <div className="relative flex items-center justify-center w-3.5 h-3.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#8dc63f] shadow-[0_0_8px_#c6f35c] transition-all duration-700 ease-in-out" />
            <span className="absolute inset-0 rounded-full bg-[#c6f35c] opacity-60 animate-ping pointer-events-none" />
            <span className="absolute w-4 h-4 rounded-full bg-[#a9dd3a]/25 animate-pulse pointer-events-none" />
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
            onClick={() => setIsFullDashboardOpen(true)}
            className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-[var(--lime)] text-[var(--ink2)] hover:text-[var(--ink)] transition-colors cursor-pointer"
            title="Expand to Full Comparative Dashboard"
            aria-label="Expand to Full Comparative Dashboard"
          >
            <Maximize2 className="w-3.5 h-3.5" />
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

      {/* Expanded Body */}
      {isExpanded && (
        <div className="p-3 space-y-3">
          {/* Mini Chart Section: 10-Minute Telemetry Stream */}
          <div className="rounded-xl p-3 bg-white/70 border border-white/80 shadow-sm relative overflow-hidden">
            {/* Chart Title and Header */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <div className="flex items-center gap-1.5">
                  <ChartIcon className="w-3 h-3 text-emerald-800" />
                  <span className="font-mono text-[9.5px] uppercase tracking-wider text-[var(--ink2)] font-semibold">
                    10-MIN TELEMETRY STREAM
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="font-mono text-[11px] font-semibold text-[var(--ink)]">
                    {selectedSensor.id}
                  </span>
                  <span className="text-[10.5px] text-[var(--ink2)]/80 font-medium">
                    &bull; {selectedSensor.name}
                  </span>
                </div>
              </div>

              {/* Stat Callout */}
              <div className="text-right">
                <span className="font-mono text-xs font-semibold text-[var(--ink)] block">
                  {selectedSensor.reading}
                </span>
                <span
                  className={`text-[9px] font-mono flex items-center justify-end gap-0.5 font-medium ${
                    chartPoints.delta > 0
                      ? 'text-emerald-700'
                      : chartPoints.delta < 0
                      ? 'text-amber-700'
                      : 'text-neutral-500'
                  }`}
                >
                  {chartPoints.delta > 0 ? (
                    <TrendingUp className="w-2.5 h-2.5" />
                  ) : (
                    <TrendingDown className="w-2.5 h-2.5" />
                  )}
                  {chartPoints.delta > 0 ? `+${chartPoints.delta}` : chartPoints.delta} / 10m
                </span>
              </div>
            </div>

            {/* SVG Mini Chart Area */}
            <div className="relative w-full overflow-hidden bg-black/[0.02] rounded-lg border border-[rgba(16,41,26,0.06)] p-1">
              <svg
                viewBox={`0 0 ${chartPoints.width} ${chartPoints.height}`}
                className="w-full h-[72px] overflow-visible"
              >
                <defs>
                  <linearGradient id="sensorAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#c6f35c" stopOpacity="0.45" />
                    <stop offset="60%" stopColor="#a9dd3a" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#c6f35c" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Subtle horizontal reference lines */}
                <line
                  x1="12"
                  y1={chartPoints.height * 0.25}
                  x2={chartPoints.width - 12}
                  y2={chartPoints.height * 0.25}
                  stroke="rgba(16,41,26,0.08)"
                  strokeDasharray="2 3"
                />
                <line
                  x1="12"
                  y1={chartPoints.height * 0.75}
                  x2={chartPoints.width - 12}
                  y2={chartPoints.height * 0.75}
                  stroke="rgba(16,41,26,0.08)"
                  strokeDasharray="2 3"
                />

                {/* Filled gradient area */}
                {chartPoints.area && (
                  <path d={chartPoints.area} fill="url(#sensorAreaGrad)" />
                )}

                {/* Smooth sparkline stroke */}
                {chartPoints.path && (
                  <path
                    d={chartPoints.path}
                    fill="none"
                    stroke="#4f8a12"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Data point circles */}
                {chartPoints.points.map((pt, i) => {
                  const isLatest = i === chartPoints.points.length - 1;
                  const isHovered = hoveredPointIndex === i;

                  return (
                    <g
                      key={i}
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredPointIndex(i)}
                      onMouseLeave={() => setHoveredPointIndex(null)}
                    >
                      {/* Active ping on the newest reading */}
                      {isLatest && (
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r="6"
                          fill="#c6f35c"
                          opacity="0.6"
                          className="animate-ping"
                        />
                      )}

                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={isHovered ? 4.5 : isLatest ? 3.5 : 2}
                        fill={isLatest ? '#4f8a12' : '#ffffff'}
                        stroke={isLatest ? '#c6f35c' : '#4f8a12'}
                        strokeWidth={isHovered ? 2 : 1.2}
                      />
                    </g>
                  );
                })}
              </svg>

              {/* Hover Tooltip Overlay */}
              {hoveredPointIndex !== null && chartPoints.points[hoveredPointIndex] && (
                <div
                  className="absolute pointer-events-none text-[9px] font-mono px-2 py-0.5 rounded bg-[var(--ink)] text-white shadow-md -translate-x-1/2 z-10"
                  style={{
                    left: `${(chartPoints.points[hoveredPointIndex].x / chartPoints.width) * 100}%`,
                    top: '4px',
                  }}
                >
                  <span>
                    {chartPoints.points[hoveredPointIndex].clock}:{' '}
                    <strong>{chartPoints.points[hoveredPointIndex].value}</strong>{' '}
                    {selectedSensor.unit || ''}
                  </span>
                </div>
              )}

              {/* X-axis time markers */}
              <div className="flex items-center justify-between text-[8px] font-mono text-[var(--ink2)]/70 px-2 pt-0.5">
                <span>-10m</span>
                <span>-8m</span>
                <span>-6m</span>
                <span>-4m</span>
                <span>-2m</span>
                <span className="font-semibold text-emerald-800">NOW</span>
              </div>
            </div>

            {/* Min / Max Range Bar */}
            <div className="mt-1.5 flex items-center justify-between text-[8.5px] font-mono text-[var(--ink2)]/70">
              <span>Min: {chartPoints.min} {selectedSensor.unit}</span>
              <span className="text-[8px] text-[var(--ink2)]/50">Click any sensor below to inspect</span>
              <span>Max: {chartPoints.max} {selectedSensor.unit}</span>
            </div>
          </div>

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
          <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-0.5">
            {filteredSensors.map((sensor) => {
              const isOnline = sensor.status === 'online';
              const isSelected = sensor.id === selectedSensorId;
              const transition = statusTransitions[sensor.id];
              const isDroppingOffline = transition?.from === 'online' && transition?.to === 'offline';
              const isComingOnline = transition?.from === 'offline' && transition?.to === 'online';

              return (
                <div
                  key={sensor.id}
                  onClick={() => setSelectedSensorId(sensor.id)}
                  className={`p-2 rounded-lg border transition-all duration-700 ease-in-out flex items-center justify-between gap-2 relative overflow-hidden cursor-pointer ${
                    isSelected
                      ? 'ring-2 ring-[var(--ink)] bg-white shadow-md'
                      : isDroppingOffline
                      ? 'bg-amber-500/20 border-amber-500/60 ring-2 ring-amber-400/50 shadow-[0_0_14px_rgba(245,158,11,0.35)]'
                      : isComingOnline
                      ? 'bg-[#c6f35c]/25 border-[#a9dd3a]/60 ring-2 ring-[#c6f35c]/60 shadow-[0_0_14px_rgba(198,243,92,0.4)]'
                      : isOnline
                      ? 'bg-white/60 hover:bg-white/95 border-white/70'
                      : 'bg-amber-50/70 hover:bg-amber-50/90 border-amber-200/60'
                  }`}
                  title="Click to view 10-minute telemetry graph"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {/* Status Dot with subtle pulse animation and color transition */}
                    <div className="relative flex items-center justify-center shrink-0 w-3.5 h-3.5">
                      <span
                        className={`w-2 h-2 rounded-full transition-all duration-700 ease-in-out ${
                          isOnline
                            ? 'bg-[#8dc63f] ring-2 ring-[#c6f35c]/60 shadow-[0_0_8px_rgba(198,243,92,0.8)]'
                            : 'bg-amber-500 ring-2 ring-amber-400/50 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                        }`}
                      />
                      {isOnline && (
                        <>
                          <span className="absolute inset-0 rounded-full bg-[#c6f35c] opacity-60 animate-ping pointer-events-none" />
                          <span className="absolute w-3.5 h-3.5 rounded-full bg-[#a9dd3a]/30 animate-pulse pointer-events-none" />
                        </>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-[10px] font-semibold text-[var(--ink)] truncate">
                          {sensor.id}
                        </span>
                        <span className="text-[9px] font-mono text-[var(--ink2)]/60 truncate">
                          ({sensor.zone})
                        </span>

                        {isSelected && (
                          <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-[var(--lime)] text-[var(--ink)] font-semibold uppercase tracking-tight">
                            Viewing
                          </span>
                        )}

                        {isDroppingOffline && (
                          <span className="inline-flex items-center gap-0.5 text-[8.5px] font-mono px-1.5 py-0.2 rounded bg-amber-600 text-white font-semibold animate-pulse tracking-tight shadow-sm">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            DROPPED
                          </span>
                        )}
                        {isComingOnline && (
                          <span className="inline-flex items-center text-[8.5px] font-mono px-1.5 py-0.2 rounded bg-emerald-700 text-white font-semibold animate-pulse tracking-tight shadow-sm">
                            SYNCED
                          </span>
                        )}
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
                        <Wifi className="w-3 h-3 text-emerald-700 transition-colors duration-700 ease-in-out" />
                      ) : (
                        <WifiOff className="w-3 h-3 text-amber-600 transition-colors duration-700 ease-in-out" />
                      )}
                    </div>
                    <div className="flex items-center justify-end gap-1 text-[9px] font-mono text-[var(--ink2)]/70">
                      <span className="flex items-center gap-0.5">
                        <Battery className="w-2.5 h-2.5" />
                        {sensor.battery}%
                      </span>
                      <span>&bull;</span>
                      <span className="transition-colors duration-700 ease-in-out">{sensor.lastPing}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action to Expand Full Matrix */}
          <button
            onClick={() => setIsFullDashboardOpen(true)}
            className="w-full py-2 px-3 rounded-lg bg-[var(--ink)] text-white hover:bg-[var(--ink2)] font-mono text-[10px] uppercase tracking-wider font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm hover:shadow"
          >
            <Maximize2 className="w-3.5 h-3.5 text-[var(--lime)]" />
            <span>Open Comparative Node Matrix ({data.totalCount} Nodes)</span>
          </button>

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

      {/* Full-width Comparative Telemetry Dashboard Overlay */}
      <ComparativeTelemetryDashboard
        isOpen={isFullDashboardOpen}
        onClose={() => setIsFullDashboardOpen(false)}
        sensors={data.sensors}
        stationId={data.stationId}
        meshHealth={data.meshHealth}
        activeCount={data.activeCount}
        totalCount={data.totalCount}
        lastRefreshed={lastRefreshed}
        onRefresh={fetchSensorStatus}
        isFetching={isFetching}
        onSelectSensor={(sensorId) => setSelectedSensorId(sensorId)}
        selectedSensorId={selectedSensorId}
      />
    </div>
  );
};
