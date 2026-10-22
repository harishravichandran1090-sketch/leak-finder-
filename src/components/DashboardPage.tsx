/**
 * Dashboard Page Component
 * Four headline cards with 600ms count-up, category filter chips,
 * SVG donut chart & weekly line chart with interactive tooltips,
 * search & sortable leaks table with severity badges (text + outlined icon).
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  AlertCircle,
  Info,
  DollarSign,
  Percent,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  FilterX,
  PieChart as PieIcon,
  LineChart as LineIcon,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatINR, formatPercent } from '../utils/formatters';
import { Leak, LeakCategory, LeakSeverity } from '../types';

// Animated Count-Up Hook respecting prefers-reduced-motion
function useCountUp(targetVal: number, duration: number = 600): number {
  const [val, setVal] = useState(0);

  useEffect(() => {
    // Check prefers-reduced-motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
      setVal(targetVal);
      return;
    }

    if (targetVal === 0) {
      setVal(0);
      return;
    }

    const startTime = performance.now();
    let frameId: number;

    const update = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setVal(Math.round(targetVal * eased));

      if (progress < 1) {
        frameId = requestAnimationFrame(update);
      }
    };

    frameId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frameId);
  }, [targetVal, duration]);

  return val;
}

export const DashboardPage: React.FC = () => {
  const { analysisResults, selectLeak, setCurrentView } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<LeakCategory | null>(null);
  const [sortField, setSortField] = useState<'total_loss' | 'title' | 'category' | 'affected_orders_count'>('total_loss');
  const [sortAsc, setSortAsc] = useState(false);

  // Tooltip states for SVG charts
  const [donutHover, setDonutHover] = useState<{ category: string; value: number; percent: number } | null>(null);
  const [lineHover, setLineHover] = useState<{ week: string; gross: number; leakage: number; profit: number } | null>(null);

  // If no analysis is loaded, guide user to upload
  if (!analysisResults) {
    return (
      <div className="bg-[#1E293B] border border-[#334155] rounded-[12px] p-12 text-center max-w-xl mx-auto my-12 shadow-md">
        <AlertCircle className="w-10 h-10 text-[#818CF8] mx-auto mb-4" />
        <h2 className="font-heading text-[22px] text-[#F1F5F9] font-semibold">
          No Analysis Data Loaded
        </h2>
        <p className="text-[14px] text-[#94A3B8] mt-2">
          Upload your transactional CSV files or load the seeded 120-order benchmark to run margin detection.
        </p>
        <button
          onClick={() => setCurrentView('upload')}
          className="mt-6 px-5 py-2.5 bg-[#818CF8] hover:bg-[#818CF8]/90 text-[#0F172A] font-semibold text-[14px] rounded-[6px] transition-colors"
        >
          Go to Upload Page
        </button>
      </div>
    );
  }

  // Count-up values
  const countGross = useCountUp(analysisResults.grossRevenue);
  const countProfit = useCountUp(analysisResults.estimatedProfit);
  const countLeakage = useCountUp(analysisResults.potentialLeakage);

  // Filter & sort leaks
  const filteredLeaks = useMemo(() => {
    let list = [...analysisResults.leaks];

    if (activeCategoryFilter) {
      list = list.filter((l) => l.category === activeCategoryFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          l.category.toLowerCase().includes(q) ||
          l.summary.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'total_loss') {
        cmp = a.total_loss - b.total_loss;
      } else if (sortField === 'affected_orders_count') {
        cmp = a.affected_orders_count - b.affected_orders_count;
      } else if (sortField === 'title') {
        cmp = a.title.localeCompare(b.title);
      } else if (sortField === 'category') {
        cmp = a.category.localeCompare(b.category);
      }
      return sortAsc ? cmp : -cmp;
    });

    return list;
  }, [analysisResults.leaks, activeCategoryFilter, searchQuery, sortField, sortAsc]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false); // default descending for financial metrics
    }
  };

  const categories: LeakCategory[] = ['Discount', 'Pricing', 'Returns', 'Refunds', 'Delivery'];

  // Donut chart calculations
  const totalLeakage = analysisResults.potentialLeakage || 1;
  const categorySegments = useMemo(() => {
    let cumulative = 0;
    return categories.map((cat, idx) => {
      const value = analysisResults.categoryTotals[cat] || 0;
      const percent = (value / totalLeakage) * 100;
      const startAngle = (cumulative / totalLeakage) * 360;
      cumulative += value;
      const endAngle = (cumulative / totalLeakage) * 360;
      return {
        category: cat,
        value,
        percent,
        startAngle,
        endAngle,
      };
    });
  }, [analysisResults, totalLeakage]);

  // Donut SVG path generator
  const getSectorPath = (startAngle: number, endAngle: number, innerR = 48, outerR = 75) => {
    if (endAngle - startAngle >= 359.99) {
      return `M 0 -${outerR} A ${outerR} ${outerR} 0 1 1 0 ${outerR} A ${outerR} ${outerR} 0 1 1 0 -${outerR} M 0 -${innerR} A ${innerR} ${innerR} 0 1 0 0 ${innerR} A ${innerR} ${innerR} 0 1 0 0 -${innerR} Z`;
    }
    const toRad = (deg: number) => ((deg - 90) * Math.PI) / 180;
    const x1 = Math.cos(toRad(startAngle)) * outerR;
    const y1 = Math.sin(toRad(startAngle)) * outerR;
    const x2 = Math.cos(toRad(endAngle)) * outerR;
    const y2 = Math.sin(toRad(endAngle)) * outerR;

    const x3 = Math.cos(toRad(endAngle)) * innerR;
    const y3 = Math.sin(toRad(endAngle)) * innerR;
    const x4 = Math.cos(toRad(startAngle)) * innerR;
    const y4 = Math.sin(toRad(startAngle)) * innerR;

    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 ${largeArc} 0 ${x4} ${y4} Z`;
  };

  // Category Colors (monochrome/indigo tones)
  const categoryColors: Record<LeakCategory, string> = {
    Discount: '#818CF8', // primary accent indigo
    Pricing: '#6366F1',
    Returns: '#4F46E5',
    Refunds: '#3730A3',
    Delivery: '#A5B4FC',
  };

  return (
    <div className="space-y-6">
      {/* Top Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#334155] pb-4">
        <div>
          <h1 className="font-heading text-[28px] font-semibold text-[#F1F5F9] tracking-tight">
            Margin Leakage Dashboard
          </h1>
          <p className="text-[14px] text-[#94A3B8]">
            Cross-dataset analysis covering 120 customer orders over 4 weeks.
          </p>
        </div>
      </div>

      {/* Four Headline Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Gross Revenue */}
        <div className="bg-[#1E293B] border border-[#334155] rounded-[12px] p-5 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[12px] uppercase tracking-wider font-medium text-[#94A3B8]">
              Gross Revenue
            </span>
            <span className="text-[10px] text-[#94A3B8] font-mono bg-[#0F172A] border border-[#334155] px-1.5 py-0.5 rounded">
              Simulated
            </span>
          </div>
          <div className="mt-3">
            <p className="text-[32px] font-bold text-[#F1F5F9] tabular-nums leading-none">
              {formatINR(countGross)}
            </p>
            <p className="text-[12px] text-[#94A3B8] mt-1.5">Total unadjusted sales value</p>
          </div>
        </div>

        {/* 2. Estimated Profit */}
        <div className="bg-[#1E293B] border border-[#334155] rounded-[12px] p-5 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[12px] uppercase tracking-wider font-medium text-[#94A3B8]">
              Estimated Profit
            </span>
            <span className="text-[10px] text-[#94A3B8] font-mono bg-[#0F172A] border border-[#334155] px-1.5 py-0.5 rounded">
              Simulated
            </span>
          </div>
          <div className="mt-3">
            <p className="text-[32px] font-bold text-[#F1F5F9] tabular-nums leading-none">
              {formatINR(countProfit)}
            </p>
            <p className="text-[12px] text-[#94A3B8] mt-1.5">Net realized operating margin</p>
          </div>
        </div>

        {/* 3. Potential Leakage (THE LARGEST with accent top border & subtitle) */}
        <div className="bg-[#1E293B] border border-[#334155] border-t-2 border-t-[#818CF8] rounded-[12px] p-5 shadow-lg flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[12px] uppercase tracking-wider font-bold text-[#818CF8]">
              Potential Leakage
            </span>
            <span className="text-[10px] text-[#818CF8] font-mono bg-[#818CF8]/10 border border-[#818CF8]/30 px-1.5 py-0.5 rounded">
              Simulated
            </span>
          </div>
          <div className="mt-3">
            <p className="text-[32px] font-bold text-[#F1F5F9] tabular-nums leading-none">
              {formatINR(countLeakage)}
            </p>
            <p className="text-[12px] text-[#818CF8] mt-1.5 font-medium leading-snug">
              Deduplicated candidate loss across 5 operational rules
            </p>
          </div>
        </div>

        {/* 4. Discount Rate */}
        <div className="bg-[#1E293B] border border-[#334155] rounded-[12px] p-5 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[12px] uppercase tracking-wider font-medium text-[#94A3B8]">
              Discount Rate
            </span>
            <span className="text-[10px] text-[#94A3B8] font-mono bg-[#0F172A] border border-[#334155] px-1.5 py-0.5 rounded">
              Simulated
            </span>
          </div>
          <div className="mt-3">
            <p className="text-[32px] font-bold text-[#F1F5F9] tabular-nums leading-none">
              {formatPercent(analysisResults.discountRate)}
            </p>
            <p className="text-[12px] text-[#94A3B8] mt-1.5">Total deductions / Gross sales</p>
          </div>
        </div>
      </div>

      {/* Category Bars & Filter Controls */}
      <div className="bg-[#1E293B] border border-[#334155] rounded-[12px] p-5 shadow-md space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[12px] uppercase tracking-wider font-medium text-[#94A3B8]">
            Leakage Breakdown by Category (Click bar to filter)
          </span>
          {activeCategoryFilter && (
            <button
              onClick={() => setActiveCategoryFilter(null)}
              className="flex items-center gap-1.5 text-[12px] text-[#818CF8] hover:text-[#F1F5F9] transition-colors"
            >
              <FilterX className="w-3.5 h-3.5" />
              <span>Clear filter ({activeCategoryFilter})</span>
            </button>
          )}
        </div>

        {/* Interactive Category Bars */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {categories.map((cat) => {
            const amount = analysisResults.categoryTotals[cat] || 0;
            const pct = totalLeakage > 0 ? (amount / totalLeakage) * 100 : 0;
            const isSelected = activeCategoryFilter === cat;

            return (
              <button
                key={cat}
                onClick={() => setActiveCategoryFilter(isSelected ? null : cat)}
                className={`p-3 rounded-[6px] border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'border-[#818CF8] bg-[#818CF8]/15 ring-1 ring-[#818CF8]'
                    : 'border-[#334155] bg-[#0F172A]/70 hover:bg-[#26344A]'
                }`}
              >
                <div className="flex items-center justify-between text-[13px] font-medium text-[#F1F5F9]">
                  <span>{cat}</span>
                  <span className="text-[12px] font-mono text-[#94A3B8] tabular-nums">
                    {pct.toFixed(0)}%
                  </span>
                </div>
                <p className="text-[14px] font-semibold text-[#818CF8] mt-1 tabular-nums">
                  {formatINR(amount)}
                </p>
                {/* Progress Mini Bar */}
                <div className="w-full bg-[#334155] h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full bg-[#818CF8] rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(5, pct)}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Two Visual Charts: Donut Chart & Weekly Line Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Donut Chart (5 cols) */}
        <div className="lg:col-span-5 bg-[#1E293B] border border-[#334155] rounded-[12px] p-5 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-[#334155] pb-3 mb-4">
            <span className="text-[12px] uppercase tracking-wider font-medium text-[#94A3B8] flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-[#818CF8]" />
              Leakage Category Distribution
            </span>
          </div>

          <div className="relative flex flex-col items-center justify-center my-2">
            <svg width="220" height="220" viewBox="-100 -100 200 200" className="overflow-visible">
              {categorySegments.map((seg) => {
                const isHovered = donutHover?.category === seg.category;
                const path = getSectorPath(
                  seg.startAngle,
                  seg.endAngle,
                  isHovered ? 45 : 48,
                  isHovered ? 80 : 75
                );
                return (
                  <path
                    key={seg.category}
                    d={path}
                    fill={categoryColors[seg.category as LeakCategory]}
                    className="cursor-pointer transition-all duration-200 hover:opacity-90"
                    onMouseEnter={() =>
                      setDonutHover({
                        category: seg.category,
                        value: seg.value,
                        percent: seg.percent,
                      })
                    }
                    onMouseLeave={() => setDonutHover(null)}
                  />
                );
              })}
              {/* Inner Label */}
              <text
                x="0"
                y="-4"
                textAnchor="middle"
                className="fill-[#F1F5F9] text-[15px] font-bold font-mono"
              >
                {donutHover ? formatINR(donutHover.value) : formatINR(totalLeakage)}
              </text>
              <text
                x="0"
                y="14"
                textAnchor="middle"
                className="fill-[#94A3B8] text-[10px] uppercase tracking-wider font-medium"
              >
                {donutHover ? donutHover.category : 'Total Leaks'}
              </text>
            </svg>

            {/* Hover Tooltip display */}
            {donutHover && (
              <div className="mt-2 text-center text-[12px] text-[#F1F5F9] bg-[#0F172A] border border-[#334155] px-3 py-1 rounded-[6px]">
                <strong>{donutHover.category}:</strong> {formatINR(donutHover.value)} ({donutHover.percent.toFixed(1)}%)
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-[#334155] text-[12px]">
            {categories.map((cat) => (
              <div key={cat} className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: categoryColors[cat] }}
                />
                <span className="text-[#94A3B8] truncate">{cat}</span>
                <span className="ml-auto font-mono text-[#F1F5F9] tabular-nums">
                  {formatINR(analysisResults.categoryTotals[cat])}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Weekly Line Chart (7 cols) */}
        <div className="lg:col-span-7 bg-[#1E293B] border border-[#334155] rounded-[12px] p-5 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-[#334155] pb-3 mb-4">
            <span className="text-[12px] uppercase tracking-wider font-medium text-[#94A3B8] flex items-center gap-2">
              <LineIcon className="w-4 h-4 text-[#818CF8]" />
              Weekly Margin Trajectory (4-Week Trend)
            </span>
            <div className="flex items-center gap-4 text-[12px]">
              <span className="flex items-center gap-1.5 text-[#94A3B8]">
                <span className="w-3 h-0.5 bg-[#818CF8]" /> Gross Revenue
              </span>
              <span className="flex items-center gap-1.5 text-[#94A3B8]">
                <span className="w-3 h-0.5 bg-[#F87171]" /> Leakage
              </span>
            </div>
          </div>

          {/* SVG Line Chart */}
          <div className="relative h-56 w-full flex items-center">
            {/* Compute SVG coordinates */}
            {(() => {
              const trends = analysisResults.weeklyTrends;
              const maxVal = Math.max(...trends.map((t) => t.grossRevenue), 1);
              const paddingX = 40;
              const paddingY = 30;
              const width = 500;
              const height = 180;

              const getX = (idx: number) => paddingX + (idx / (trends.length - 1)) * (width - 2 * paddingX);
              const getY = (val: number) => height - paddingY - (val / maxVal) * (height - 2 * paddingY);

              const revenuePoints = trends.map((t, idx) => `${getX(idx)},${getY(t.grossRevenue)}`).join(' ');
              const leakagePoints = trends.map((t, idx) => `${getX(idx)},${getY(t.leakage)}`).join(' ');

              return (
                <svg
                  viewBox={`0 0 ${width} ${height}`}
                  className="w-full h-full overflow-visible select-none"
                >
                  {/* Grid Lines */}
                  {[0.25, 0.5, 0.75, 1].map((ratio) => {
                    const y = height - paddingY - ratio * (height - 2 * paddingY);
                    return (
                      <g key={ratio}>
                        <line
                          x1={paddingX}
                          y1={y}
                          x2={width - paddingX}
                          y2={y}
                          stroke="#334155"
                          strokeDasharray="4 4"
                          strokeWidth="1"
                        />
                      </g>
                    );
                  })}

                  {/* Revenue Line */}
                  <polyline
                    fill="none"
                    stroke="#818CF8"
                    strokeWidth="2.5"
                    points={revenuePoints}
                  />

                  {/* Leakage Line */}
                  <polyline
                    fill="none"
                    stroke="#F87171"
                    strokeWidth="2"
                    points={leakagePoints}
                  />

                  {/* Interactive Points */}
                  {trends.map((t, idx) => {
                    const cx = getX(idx);
                    const cyRev = getY(t.grossRevenue);
                    const cyLeak = getY(t.leakage);

                    return (
                      <g key={t.week}>
                        {/* Revenue dot */}
                        <circle
                          cx={cx}
                          cy={cyRev}
                          r="4"
                          fill="#0F172A"
                          stroke="#818CF8"
                          strokeWidth="2"
                          className="cursor-pointer hover:r-6 transition-all"
                          onMouseEnter={() =>
                            setLineHover({
                              week: t.week,
                              gross: t.grossRevenue,
                              leakage: t.leakage,
                              profit: t.profit,
                            })
                          }
                          onMouseLeave={() => setLineHover(null)}
                        />
                        {/* Leak dot */}
                        <circle
                          cx={cx}
                          cy={cyLeak}
                          r="4"
                          fill="#0F172A"
                          stroke="#F87171"
                          strokeWidth="2"
                          className="cursor-pointer hover:r-6 transition-all"
                          onMouseEnter={() =>
                            setLineHover({
                              week: t.week,
                              gross: t.grossRevenue,
                              leakage: t.leakage,
                              profit: t.profit,
                            })
                          }
                          onMouseLeave={() => setLineHover(null)}
                        />
                        {/* X-axis labels */}
                        <text
                          x={cx}
                          y={height - 8}
                          textAnchor="middle"
                          className="fill-[#94A3B8] text-[11px] font-mono"
                        >
                          {t.week}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              );
            })()}

            {/* Hover Tooltip Overlay */}
            {lineHover && (
              <div className="absolute top-2 right-4 bg-[#0F172A] border border-[#334155] p-2.5 rounded-[6px] shadow-lg text-[12px] space-y-1">
                <p className="font-semibold text-[#F1F5F9]">{lineHover.week}</p>
                <p className="text-[#818CF8]">
                  Revenue: {formatINR(lineHover.gross)}
                </p>
                <p className="text-red-400">
                  Leakage: {formatINR(lineHover.leakage)} (
                  {((lineHover.leakage / (lineHover.gross || 1)) * 100).toFixed(1)}%)
                </p>
                <p className="text-[#94A3B8]">Profit: {formatINR(lineHover.profit)}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detected Leaks Table */}
      <div className="bg-[#1E293B] border border-[#334155] rounded-[12px] shadow-md overflow-hidden">
        {/* Table Controls Header */}
        <div className="p-5 border-b border-[#334155] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-heading text-[18px] text-[#F1F5F9] font-semibold">
              Detected Leaks & Anomalies
            </h2>
            <p className="text-[12px] text-[#94A3B8]">
              {filteredLeaks.length} candidate leak areas flagged for operational review
            </p>
          </div>

          {/* Search Box */}
          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by title, category, summary..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0F172A] border border-[#334155] text-[#F1F5F9] placeholder-[#94A3B8] text-[13px] pl-9 pr-3 py-1.5 rounded-[6px] focus-visible:outline-[#818CF8]"
            />
          </div>
        </div>

        {/* Leaks Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#334155] bg-[#0F172A]/50 text-[12px] uppercase tracking-wider text-[#94A3B8] font-medium">
                <th
                  onClick={() => handleSort('title')}
                  className="p-3.5 pl-5 cursor-pointer hover:text-[#F1F5F9] select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Leak Title & Root Anomaly</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-[#94A3B8]" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('category')}
                  className="p-3.5 cursor-pointer hover:text-[#F1F5F9] select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Category</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-[#94A3B8]" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('affected_orders_count')}
                  className="p-3.5 cursor-pointer hover:text-[#F1F5F9] select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Affected Orders</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-[#94A3B8]" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('total_loss')}
                  className="p-3.5 cursor-pointer hover:text-[#F1F5F9] select-none text-right"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Loss Amount</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-[#94A3B8]" />
                  </div>
                </th>
                <th className="p-3.5">Severity</th>
                <th className="p-3.5 pr-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#334155] text-[14px]">
              {filteredLeaks.map((leak) => {
                const getSeverityBadge = (sev: LeakSeverity) => {
                  if (sev === 'High') {
                    return (
                      <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-red-400 bg-red-950/40 border border-red-500/40 px-2.5 py-0.5 rounded-[6px]">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>High Severity</span>
                      </span>
                    );
                  }
                  if (sev === 'Medium') {
                    return (
                      <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-amber-300 bg-[#B45309]/20 border border-[#B45309]/50 px-2.5 py-0.5 rounded-[6px]">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Medium Severity</span>
                      </span>
                    );
                  }
                  return (
                    <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#818CF8] bg-[#818CF8]/10 border border-[#818CF8]/30 px-2.5 py-0.5 rounded-[6px]">
                      <Info className="w-3.5 h-3.5" />
                      <span>Low Severity</span>
                    </span>
                  );
                };

                return (
                  <tr
                    key={leak.id}
                    tabIndex={0}
                    role="button"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        selectLeak(leak.id);
                      }
                    }}
                    onClick={() => selectLeak(leak.id)}
                    className="hover:bg-[#26344A] cursor-pointer transition-colors group focus-visible:outline-[#818CF8]"
                  >
                    <td className="p-3.5 pl-5">
                      <p className="font-medium text-[#F1F5F9] group-hover:text-[#818CF8] transition-colors">
                        {leak.title}
                      </p>
                      <p className="text-[12px] text-[#94A3B8] line-clamp-1 mt-0.5">
                        {leak.summary}
                      </p>
                    </td>

                    <td className="p-3.5 text-[#94A3B8] text-[13px]">
                      <span className="bg-[#0F172A] border border-[#334155] px-2 py-0.5 rounded text-[12px]">
                        {leak.category}
                      </span>
                    </td>

                    <td className="p-3.5 text-[#F1F5F9] font-mono tabular-nums text-[13px]">
                      {leak.affected_orders_count} orders
                    </td>

                    <td className="p-3.5 text-right font-mono font-semibold text-[#F1F5F9] tabular-nums">
                      {formatINR(leak.total_loss)}
                    </td>

                    <td className="p-3.5 whitespace-nowrap">
                      {getSeverityBadge(leak.severity)}
                    </td>

                    <td className="p-3.5 pr-5 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          selectLeak(leak.id);
                        }}
                        className="px-3 py-1 bg-[#818CF8]/15 hover:bg-[#818CF8] text-[#818CF8] hover:text-[#0F172A] border border-[#818CF8]/30 rounded-[6px] text-[12px] font-medium transition-colors inline-flex items-center gap-1.5"
                      >
                        <span>View</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mandatory Footer Notice */}
      <footer className="pt-4 pb-2 border-t border-[#334155]/60 text-center text-[12px] text-[#94A3B8]">
        All financial figures are simulated from the dataset provided. Detection rules and thresholds are documented in the README.
      </footer>
    </div>
  );
};
