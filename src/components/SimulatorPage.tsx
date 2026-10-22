/**
 * What-If Discount Policy Simulator
 * Calculates order-level capped discounts and profit impact.
 * Features:
 * - Slider & number input kept in sync (0% to 30%, default 15%)
 * - Side-by-side cards: Current vs With a [X]% cap
 * - Profit change with arrow and +/-
 * - Mandatory disclaimer notice
 */

import React from 'react';
import {
  Sliders,
  TrendingUp,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
  AlertCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatINR } from '../utils/formatters';

export const SimulatorPage: React.FC = () => {
  const { analysisResults, discountCap, setDiscountCap, simulatorStats, setCurrentView } = useApp();

  if (!analysisResults) {
    return (
      <div className="bg-[#1E293B] border border-[#334155] rounded-[12px] p-12 text-center max-w-xl mx-auto my-12 shadow-md">
        <AlertCircle className="w-10 h-10 text-[#818CF8] mx-auto mb-4" />
        <h2 className="font-heading text-[22px] text-[#F1F5F9] font-semibold">
          Analysis Required for Simulation
        </h2>
        <p className="text-[14px] text-[#94A3B8] mt-2">
          The simulator evaluates order-level transactional data. Please run an analysis first.
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

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setDiscountCap(Math.max(0, Math.min(30, val)));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    if (!isNaN(val)) {
      setDiscountCap(Math.max(0, Math.min(30, val)));
    }
  };

  const isProfitIncrease = simulatorStats.profitDifference > 0;
  const isProfitDecrease = simulatorStats.profitDifference < 0;

  return (
    <div className="space-y-6">
      {/* Title & Introduction */}
      <div className="border-b border-[#334155] pb-4">
        <h1 className="font-heading text-[28px] font-semibold text-[#F1F5F9] tracking-tight">
          What if we change the discount policy?
        </h1>
        <p className="text-[14px] text-[#94A3B8] mt-1">
          Model how applying a mandatory discount cap across all sales channels reshapes net operating profit.
        </p>
      </div>

      {/* Control Card: Slider & Number Input kept in sync */}
      <div className="bg-[#1E293B] border border-[#334155] rounded-[12px] p-6 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <label htmlFor="cap-slider" className="text-[12px] uppercase tracking-wider font-medium text-[#94A3B8]">
              Maximum Allowed Discount Cap (%)
            </label>
            <p className="text-[13px] text-[#F1F5F9] mt-0.5">
              Every order with a discount exceeding this ceiling is clipped to this percentage.
            </p>
          </div>

          {/* Synced Number Input */}
          <div className="flex items-center gap-2 self-start sm:self-center">
            <div className="relative">
              <input
                id="cap-number"
                type="number"
                min="0"
                max="30"
                value={discountCap}
                onChange={handleNumberChange}
                aria-label="Maximum discount cap percentage"
                className="w-24 bg-[#0F172A] border border-[#334155] text-[#F1F5F9] text-[16px] font-mono font-bold px-3 py-1.5 rounded-[6px] focus-visible:outline-[#818CF8] text-center tabular-nums"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] font-bold">
                %
              </span>
            </div>
          </div>
        </div>

        {/* Synced Slider */}
        <div className="space-y-2 pt-2">
          <input
            id="cap-slider"
            type="range"
            min="0"
            max="30"
            step="1"
            value={discountCap}
            onChange={handleSliderChange}
            aria-label="Discount cap slider"
            className="w-full accent-[#818CF8] bg-[#0F172A] h-2 rounded-lg cursor-pointer focus-visible:outline-[#818CF8]"
          />
          <div className="flex justify-between text-[11px] font-mono text-[#94A3B8]">
            <span>0% (No discounts permitted)</span>
            <span>15% (Recommended baseline)</span>
            <span>30% (High concession ceiling)</span>
          </div>
        </div>
      </div>

      {/* Two Side-by-Side Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Current */}
        <div className="bg-[#1E293B] border border-[#334155] rounded-[12px] p-6 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#334155] pb-3 mb-4">
              <span className="font-heading text-[18px] font-semibold text-[#F1F5F9]">
                Current Policy
              </span>
              <span className="text-[11px] text-[#94A3B8] font-mono bg-[#0F172A] border border-[#334155] px-2 py-0.5 rounded">
                Simulated
              </span>
            </div>

            <div className="space-y-5">
              <div>
                <p className="text-[12px] uppercase tracking-wider text-[#94A3B8] font-medium">
                  Operating Profit
                </p>
                <p className="text-[32px] font-bold text-[#F1F5F9] font-mono tabular-nums leading-none mt-1">
                  {formatINR(simulatorStats.currentProfit)}
                </p>
                <p className="text-[12px] text-[#94A3B8] mt-1">Net margin from existing transactions</p>
              </div>

              <div className="pt-4 border-t border-[#334155]">
                <p className="text-[12px] uppercase tracking-wider text-[#94A3B8] font-medium">
                  Total Discount Concessions
                </p>
                <p className="text-[22px] font-bold text-[#F1F5F9] font-mono tabular-nums mt-1">
                  {formatINR(simulatorStats.currentDiscount)}
                </p>
                <p className="text-[12px] text-[#94A3B8] mt-1">Aggregate promotional markdown</p>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: With [X]% Cap */}
        <div className="bg-[#1E293B] border border-[#818CF8]/50 rounded-[12px] p-6 shadow-lg flex flex-col justify-between relative overflow-hidden">
          <div>
            <div className="flex items-center justify-between border-b border-[#334155] pb-3 mb-4">
              <span className="font-heading text-[18px] font-semibold text-[#818CF8]">
                With a {discountCap}% Cap
              </span>
              <span className="text-[11px] text-[#818CF8] font-mono bg-[#818CF8]/10 border border-[#818CF8]/30 px-2 py-0.5 rounded">
                Projected Model
              </span>
            </div>

            <div className="space-y-5">
              <div>
                <p className="text-[12px] uppercase tracking-wider text-[#94A3B8] font-medium">
                  Projected Operating Profit
                </p>
                <div className="flex items-baseline gap-3 mt-1">
                  <p className="text-[32px] font-bold text-[#F1F5F9] font-mono tabular-nums leading-none">
                    {formatINR(simulatorStats.cappedProfit)}
                  </p>
                  {/* Profit change with arrow and +/- */}
                  <div
                    className={`flex items-center text-[14px] font-mono font-bold px-2 py-0.5 rounded-[4px] ${
                      isProfitIncrease
                        ? 'text-emerald-300 bg-emerald-950/40 border border-emerald-500/40'
                        : isProfitDecrease
                        ? 'text-red-400 bg-red-950/40 border border-red-500/40'
                        : 'text-[#94A3B8] bg-[#0F172A]'
                    }`}
                  >
                    {isProfitIncrease ? (
                      <ArrowUpRight className="w-4 h-4 mr-0.5" />
                    ) : isProfitDecrease ? (
                      <ArrowDownRight className="w-4 h-4 mr-0.5" />
                    ) : null}
                    <span>
                      {isProfitIncrease ? '+' : ''}
                      {formatINR(simulatorStats.profitDifference)}
                    </span>
                  </div>
                </div>
                <p className="text-[12px] text-[#818CF8] mt-1 font-medium">
                  Recovered profit direct to bottom line
                </p>
              </div>

              <div className="pt-4 border-t border-[#334155]">
                <p className="text-[12px] uppercase tracking-wider text-[#94A3B8] font-medium">
                  New Total Discount Concessions
                </p>
                <p className="text-[22px] font-bold text-[#F1F5F9] font-mono tabular-nums mt-1">
                  {formatINR(simulatorStats.cappedDiscount)}
                </p>
                <p className="text-[12px] text-[#94A3B8] mt-1">
                  Capped at {discountCap}% per individual transaction
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mandatory Simulator Notice */}
      <div className="p-4 rounded-[6px] bg-[#0F172A] border border-[#334155] text-center text-[13px] text-[#94A3B8]">
        Assumes sales volume stays constant. Projected figures are simulated.
      </div>
    </div>
  );
};
