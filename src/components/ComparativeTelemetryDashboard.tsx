/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  RefreshCw,
  Search,
  Wifi,
  WifiOff,
  Battery,
  Radio,
  TrendingUp,
  TrendingDown,
  Layers,
  LayoutGrid,
  Table as TableIcon,
  CheckCircle2,
  AlertTriangle,
  ArrowUpDown,
  Download,
} from 'lucide-react';
import { FieldSensor } from './SensorStatusWidget';

interface ComparativeTelemetryDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  sensors: FieldSensor[];
  stationId: string;
  meshHealth: string;
  activeCount: number;
  totalCount: number;
  lastRefreshed: string;
  onRefresh: () => void;
  isFetching: boolean;
  onSelectSensor: (sensorId: string) => void;
  selectedSensorId: string;
}

export const ComparativeTelemetryDashboard: React.FC<ComparativeTelemetryDashboardProps> = ({
  isOpen,
  onClose,
  sensors,
  stationId,
  meshHealth,
  activeCount,
  totalCount,
  lastRefreshed,
  onRefresh,
  isFetching,
  onSelectSensor,
  selectedSensorId,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [sortBy, setSortBy] = useState<'id' | 'name' | 'battery' | 'latency'>('id');
  const [hoveredPoint, setHoveredPoint] = useState<{ sensorId: string; index: number } | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Aggregate KPI Calculations
  const avgBattery = Math.round(
    sensors.reduce((acc, s) => acc + s.battery, 0) / (sensors.length || 1)
  );
  const avgLatency = Math.round(
    sensors.reduce((acc, s) => acc + s.latencyMs, 0) / (sensors.length || 1)
  );

  // Filter & Sort
  const filteredSensors = sensors
    .filter((s) => {
      if (statusFilter === 'online' && s.status !== 'online') return false;
      if (statusFilter === 'offline' && s.status !== 'offline') return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return (
          s.id.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q) ||
          s.zone.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'battery') return b.battery - a.battery;
      if (sortBy === 'latency') return a.latencyMs - b.latencyMs;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return a.id.localeCompare(b.id);
    });

  // Export CSV Helper
  const handleExportCSV = () => {
    const headers = ['Sensor ID', 'Name', 'Zone', 'Status', 'Current Reading', 'Battery %', 'Latency ms', 'Last Ping'];
    const rows = sensors.map((s) => [
      s.id,
      `"${s.name}"`,
      `"${s.zone}"`,
      s.status,
      `"${s.reading}"`,
      s.battery,
      s.latencyMs,
      s.lastPing,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mossline-telemetry-${stationId.toLowerCase()}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 p-3 sm:p-6 md:p-8 bg-black/65 backdrop-blur-md overflow-y-auto flex items-center justify-center font-sans animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dashboard-title"
    >
      <div className="relative w-full max-w-7xl max-h-[92vh] overflow-y-auto bg-[var(--paper)] rounded-2xl border border-[var(--ink)]/20 shadow-2xl flex flex-col text-[var(--ink)]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 border-b border-[var(--ink)]/10 bg-[var(--mist)] sticky top-0 z-20">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="chip flex items-center gap-1.5 font-mono text-[10px]">
                <Radio className="w-3 h-3 text-[var(--ink)] animate-pulse" />
                {stationId} &bull; MESH 07
              </span>
              <span className="text-xs font-mono uppercase tracking-wider text-[var(--ink2)]/80">
                FIELD STATION TELEMETRY MATRIX
              </span>
            </div>
            <h2 id="dashboard-title" className="text-xl sm:text-2xl font-semibold tracking-tight text-[var(--ink)]">
              Comparative Sensor Node Dashboard
            </h2>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 rounded-lg border border-[var(--ink)]/20 bg-white/70 hover:bg-white text-[var(--ink)] text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              title="Download telemetry CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={onRefresh}
              disabled={isFetching}
              className="px-3 py-1.5 rounded-lg bg-[var(--lime)] hover:bg-[var(--lime2)] text-[var(--ink)] text-xs font-mono font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              <span>Refresh Telemetry</span>
            </button>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-black/5 text-[var(--ink2)] hover:text-[var(--ink)] transition-colors cursor-pointer"
              aria-label="Close comparative dashboard"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-6">
          {/* 4 Aggregate Top Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* KPI 1 */}
            <div className="p-4 rounded-xl bg-white/80 border border-[var(--ink)]/10 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-[11px] font-mono text-[var(--ink2)]/80">
                <span>MESH AVAILABILITY</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--ink)] font-mono">
                  {meshHealth}
                </span>
                <span className="text-xs font-mono text-emerald-700 font-medium">
                  {activeCount}/{totalCount} Nodes
                </span>
              </div>
              <p className="text-[10px] text-[var(--ink2)]/70 font-mono">
                915MHz LoRaWAN mesh &bull; Synchronized
              </p>
            </div>

            {/* KPI 2 */}
            <div className="p-4 rounded-xl bg-white/80 border border-[var(--ink)]/10 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-[11px] font-mono text-[var(--ink2)]/80">
                <span>MEAN LATENCY</span>
                <Radio className="w-3.5 h-3.5 text-emerald-700" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--ink)] font-mono">
                  {avgLatency}
                </span>
                <span className="text-xs font-mono text-[var(--ink2)]">ms ping</span>
              </div>
              <p className="text-[10px] text-[var(--ink2)]/70 font-mono">
                Low-jitter packet transport &bull; Ping: {lastRefreshed}
              </p>
            </div>

            {/* KPI 3 */}
            <div className="p-4 rounded-xl bg-white/80 border border-[var(--ink)]/10 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-[11px] font-mono text-[var(--ink2)]/80">
                <span>SOLAR & BATTERY</span>
                <Battery className="w-3.5 h-3.5 text-emerald-700" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--ink)] font-mono">
                  {avgBattery}%
                </span>
                <span className="text-xs font-mono text-emerald-700 font-medium">Nominal</span>
              </div>
              <p className="text-[10px] text-[var(--ink2)]/70 font-mono">
                Photovoltaic micro-harvester active
              </p>
            </div>

            {/* KPI 4 */}
            <div className="p-4 rounded-xl bg-white/80 border border-[var(--ink)]/10 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-[11px] font-mono text-[var(--ink2)]/80">
                <span>CANOPY ACCUMULATION</span>
                <Layers className="w-3.5 h-3.5 text-emerald-700" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--ink)] font-mono">
                  +3.84
                </span>
                <span className="text-xs font-mono text-[var(--ink2)]">tCO₂e/ha</span>
              </div>
              <p className="text-[10px] text-[var(--ink2)]/70 font-mono">
                Plot 07 sub-canopy baseline flux
              </p>
            </div>
          </div>

          {/* Controls Bar: Search, Filters, View Mode, Sort */}
          <div className="p-3.5 rounded-xl bg-white/70 border border-[var(--ink)]/10 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-[var(--ink2)]/60 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search nodes by ID, name, or quadrant zone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs font-mono rounded-lg border border-[var(--ink)]/20 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--lime2)] text-[var(--ink)]"
              />
            </div>

            {/* Filters and View Toggles */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Status Filter Tabs */}
              <div className="flex items-center bg-black/5 p-0.5 rounded-lg text-xs font-mono">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    statusFilter === 'all'
                      ? 'bg-white text-[var(--ink)] shadow-sm font-semibold'
                      : 'text-[var(--ink2)] hover:text-[var(--ink)]'
                  }`}
                >
                  ALL ({sensors.length})
                </button>
                <button
                  onClick={() => setStatusFilter('online')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    statusFilter === 'online'
                      ? 'bg-emerald-800 text-white shadow-sm font-semibold'
                      : 'text-[var(--ink2)] hover:text-[var(--ink)]'
                  }`}
                >
                  ONLINE ({activeCount})
                </button>
                <button
                  onClick={() => setStatusFilter('offline')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    statusFilter === 'offline'
                      ? 'bg-amber-800 text-white shadow-sm font-semibold'
                      : 'text-[var(--ink2)] hover:text-[var(--ink)]'
                  }`}
                >
                  OFFLINE ({totalCount - activeCount})
                </button>
              </div>

              {/* Sort By Dropdown */}
              <div className="flex items-center gap-1.5 text-xs font-mono bg-white px-2.5 py-1.5 rounded-lg border border-[var(--ink)]/20">
                <ArrowUpDown className="w-3.5 h-3.5 text-[var(--ink2)]" />
                <span className="text-[10px] text-[var(--ink2)]/70 uppercase">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-transparent border-none text-xs font-mono focus:outline-none cursor-pointer"
                >
                  <option value="id">Node ID</option>
                  <option value="name">Sensor Name</option>
                  <option value="battery">Battery %</option>
                  <option value="latency">Latency</option>
                </select>
              </div>

              {/* View Mode Toggle: Grid vs Table */}
              <div className="flex items-center bg-black/5 p-0.5 rounded-lg">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-md transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-white text-[var(--ink)] shadow-sm'
                      : 'text-[var(--ink2)] hover:text-[var(--ink)]'
                  }`}
                  title="Grid card view"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-md transition-colors ${
                    viewMode === 'table'
                      ? 'bg-white text-[var(--ink)] shadow-sm'
                      : 'text-[var(--ink2)] hover:text-[var(--ink)]'
                  }`}
                  title="Comparative table view"
                >
                  <TableIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Main Comparative Presentation */}
          {viewMode === 'grid' ? (
            /* Comparative Grid Cards */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredSensors.map((sensor) => {
                const isOnline = sensor.status === 'online';
                const isSelected = sensor.id === selectedSensorId;
                const history = sensor.history || [];
                const values = history.map((h) => h.value);
                const minVal = values.length ? Math.min(...values) : 0;
                const maxVal = values.length ? Math.max(...values) : 0;
                const delta =
                  values.length >= 2
                    ? parseFloat((values[values.length - 1] - values[0]).toFixed(2))
                    : 0;

                // Mini sparkline math for each card
                const w = 240;
                const h = 55;
                const range = maxVal - minVal || 1;
                const pad = range * 0.15;
                const pMin = minVal - pad;
                const pMax = maxVal + pad;
                const pRange = pMax - pMin || 1;
                const coords = history.map((pt, idx) => ({
                  x: 8 + (idx / Math.max(1, history.length - 1)) * (w - 16),
                  y: 6 + (1 - (pt.value - pMin) / pRange) * (h - 12),
                  ...pt,
                }));
                const sparkD = coords.reduce(
                  (acc, pt, idx) => (idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`),
                  ''
                );

                return (
                  <div
                    key={sensor.id}
                    onClick={() => onSelectSensor(sensor.id)}
                    className={`p-4 rounded-xl border transition-all duration-300 flex flex-col justify-between gap-3 cursor-pointer group ${
                      isSelected
                        ? 'bg-white ring-2 ring-[var(--ink)] shadow-md border-transparent'
                        : 'bg-white/80 hover:bg-white border-[var(--ink)]/10 shadow-sm hover:shadow'
                    }`}
                  >
                    {/* Top Row: ID, Status, Zone */}
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className="relative flex items-center justify-center w-3 h-3">
                            <span
                              className={`w-2 h-2 rounded-full transition-all duration-500 ${
                                isOnline
                                  ? 'bg-[#8dc63f] ring-2 ring-[#c6f35c]/60 shadow-[0_0_6px_#c6f35c]'
                                  : 'bg-amber-500 ring-2 ring-amber-400/50'
                              }`}
                            />
                            {isOnline && (
                              <span className="absolute inset-0 rounded-full bg-[#c6f35c] opacity-60 animate-ping pointer-events-none" />
                            )}
                          </div>
                          <span className="font-mono text-xs font-semibold text-[var(--ink)]">
                            {sensor.id}
                          </span>
                        </div>

                        <span
                          className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-semibold uppercase ${
                            isOnline
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {sensor.status}
                        </span>
                      </div>

                      <h3 className="font-semibold text-sm text-[var(--ink)] leading-snug">
                        {sensor.name}
                      </h3>
                      <p className="text-[10px] font-mono text-[var(--ink2)]/70">
                        {sensor.zone}
                      </p>
                    </div>

                    {/* Middle: Current Reading & Delta */}
                    <div className="flex items-baseline justify-between pt-1 border-t border-[var(--ink)]/5">
                      <div>
                        <span className="text-xs font-mono text-[var(--ink2)]/70 block text-[9px] uppercase">
                          Current Metric
                        </span>
                        <span className="text-lg font-semibold font-mono text-[var(--ink)]">
                          {sensor.reading}
                        </span>
                      </div>

                      <div className="text-right">
                        <span
                          className={`text-[10px] font-mono flex items-center justify-end gap-0.5 font-medium ${
                            delta > 0
                              ? 'text-emerald-700'
                              : delta < 0
                              ? 'text-amber-700'
                              : 'text-neutral-500'
                          }`}
                        >
                          {delta > 0 ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : (
                            <TrendingDown className="w-3 h-3" />
                          )}
                          {delta > 0 ? `+${delta}` : delta} (10m)
                        </span>
                        <span className="text-[9px] font-mono text-[var(--ink2)]/60">
                          {sensor.metric}
                        </span>
                      </div>
                    </div>

                    {/* 10-Minute Mini Sparkline for this Node */}
                    <div className="bg-black/[0.02] rounded-lg p-1 border border-[rgba(16,41,26,0.05)] relative">
                      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[46px] overflow-visible">
                        {sparkD && (
                          <path
                            d={sparkD}
                            fill="none"
                            stroke={isOnline ? '#4f8a12' : '#d97706'}
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        )}

                        {coords.map((pt, idx) => {
                          const isLast = idx === coords.length - 1;
                          return (
                            <circle
                              key={idx}
                              cx={pt.x}
                              cy={pt.y}
                              r={isLast ? 3 : 1.5}
                              fill={isLast ? (isOnline ? '#4f8a12' : '#d97706') : '#ffffff'}
                              stroke={isOnline ? '#4f8a12' : '#d97706'}
                              strokeWidth={1}
                            />
                          );
                        })}
                      </svg>
                      <div className="flex justify-between items-center text-[7.5px] font-mono text-[var(--ink2)]/60 px-1">
                        <span>-10m ({minVal})</span>
                        <span>Now ({maxVal})</span>
                      </div>
                    </div>

                    {/* Bottom Row: Battery, Latency, Ping */}
                    <div className="flex items-center justify-between text-[10px] font-mono text-[var(--ink2)]/80 pt-1 border-t border-[var(--ink)]/5">
                      <div className="flex items-center gap-1">
                        <Battery className="w-3 h-3" />
                        <span>{sensor.battery}%</span>
                        <div className="w-8 h-1.5 rounded-full bg-black/10 overflow-hidden ml-0.5">
                          <div
                            className={`h-full rounded-full ${
                              sensor.battery > 50
                                ? 'bg-emerald-600'
                                : sensor.battery > 20
                                ? 'bg-amber-500'
                                : 'bg-red-500'
                            }`}
                            style={{ width: `${sensor.battery}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {isOnline ? (
                          <Wifi className="w-3 h-3 text-emerald-700" />
                        ) : (
                          <WifiOff className="w-3 h-3 text-amber-600" />
                        )}
                        <span>{sensor.latencyMs}ms</span>
                        <span>&bull;</span>
                        <span>{sensor.lastPing}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Comparative Table Matrix */
            <div className="rounded-xl border border-[var(--ink)]/15 bg-white overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[var(--mist)] text-[var(--ink)] uppercase text-[10px] tracking-wider border-b border-[var(--ink)]/10">
                    <tr>
                      <th className="py-3 px-4">Node / ID</th>
                      <th className="py-3 px-4">Deployment Zone</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Latest Reading</th>
                      <th className="py-3 px-4">10m Trend</th>
                      <th className="py-3 px-4">10m Sparkline</th>
                      <th className="py-3 px-4">Battery</th>
                      <th className="py-3 px-4">Latency</th>
                      <th className="py-3 px-4">Last Sync</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--ink)]/10">
                    {filteredSensors.map((sensor) => {
                      const isOnline = sensor.status === 'online';
                      const isSelected = sensor.id === selectedSensorId;
                      const history = sensor.history || [];
                      const values = history.map((h) => h.value);
                      const minVal = values.length ? Math.min(...values) : 0;
                      const maxVal = values.length ? Math.max(...values) : 0;
                      const delta =
                        values.length >= 2
                          ? parseFloat((values[values.length - 1] - values[0]).toFixed(2))
                          : 0;

                      // Table sparkline coords
                      const w = 120;
                      const h = 32;
                      const range = maxVal - minVal || 1;
                      const coords = history.map((pt, idx) => ({
                        x: 4 + (idx / Math.max(1, history.length - 1)) * (w - 8),
                        y: 4 + (1 - (pt.value - minVal) / range) * (h - 8),
                      }));
                      const sparkD = coords.reduce(
                        (acc, pt, idx) => (idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`),
                        ''
                      );

                      return (
                        <tr
                          key={sensor.id}
                          onClick={() => onSelectSensor(sensor.id)}
                          className={`hover:bg-black/5 transition-colors cursor-pointer ${
                            isSelected ? 'bg-[var(--lime)]/15 font-semibold' : ''
                          }`}
                        >
                          <td className="py-3 px-4 font-semibold text-[var(--ink)]">
                            <div>{sensor.id}</div>
                            <div className="text-[10px] text-[var(--ink2)]/80 font-normal">
                              {sensor.name}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-[var(--ink2)]">{sensor.zone}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9.5px] uppercase font-semibold ${
                                isOnline
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isOnline ? 'bg-emerald-600' : 'bg-amber-600'
                                }`}
                              />
                              {sensor.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-bold text-[var(--ink)]">
                            {sensor.reading}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`flex items-center gap-1 font-semibold ${
                                delta > 0
                                  ? 'text-emerald-700'
                                  : delta < 0
                                  ? 'text-amber-700'
                                  : 'text-neutral-500'
                              }`}
                            >
                              {delta > 0 ? (
                                <TrendingUp className="w-3 h-3" />
                              ) : (
                                <TrendingDown className="w-3 h-3" />
                              )}
                              {delta > 0 ? `+${delta}` : delta}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <svg viewBox={`0 0 ${w} ${h}`} className="w-[100px] h-[24px]">
                              {sparkD && (
                                <path
                                  d={sparkD}
                                  fill="none"
                                  stroke={isOnline ? '#4f8a12' : '#d97706'}
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              )}
                            </svg>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              <span>{sensor.battery}%</span>
                              <div className="w-10 h-1.5 rounded-full bg-black/10 overflow-hidden">
                                <div
                                  className={`h-full ${
                                    sensor.battery > 50
                                      ? 'bg-emerald-600'
                                      : sensor.battery > 20
                                      ? 'bg-amber-500'
                                      : 'bg-red-500'
                                  }`}
                                  style={{ width: `${sensor.battery}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-[var(--ink2)]">{sensor.latencyMs} ms</td>
                          <td className="py-3 px-4 text-[var(--ink2)]/80">{sensor.lastPing}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-[var(--ink)]/10 bg-[var(--mist)] text-xs font-mono text-[var(--ink2)]/80 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-emerald-700 animate-pulse" />
            <span>MESH TOPOLOGY: STAR-OF-STARS REPEATERS (ALTO SECTOR 07)</span>
          </div>
          <div className="flex items-center gap-4">
            <span>PRESS ESC TO CLOSE</span>
            <button
              onClick={onClose}
              className="underline hover:text-[var(--ink)] cursor-pointer"
            >
              Back to Station View
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
