/**
 * Leak Detail Page Component
 * Detailed breakdown for an individual leak:
 * - Title, category, amount lost with 'Simulated'
 * - Compact stats
 * - Sticky header table of up to 20 affected orders
 * - AI Explanation panel (Nemotron or Rule-based) with shimmer loading
 * - Highlighted Recommended Action box with 'Add to action plan' button
 */

import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Cpu,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  PlusCircle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatINR, formatDate } from '../utils/formatters';
import { AIExplanation, Leak } from '../types';
import { generateRuleBasedExplanation } from '../services/ruleBasedExplainer';

export const LeakDetailPage: React.FC = () => {
  const {
    analysisResults,
    selectedLeakId,
    selectLeak,
    setCurrentView,
    addToActionPlan,
    actionPlan,
    fetchLeakExplanation,
  } = useApp();

  const [explanation, setExplanation] = useState<AIExplanation | null>(null);
  const [loading, setLoading] = useState(false);

  // Active leak
  const activeLeak: Leak | undefined = React.useMemo(() => {
    if (!analysisResults || analysisResults.leaks.length === 0) return undefined;
    if (selectedLeakId) {
      const found = analysisResults.leaks.find((l) => l.id === selectedLeakId);
      if (found) return found;
    }
    return analysisResults.leaks[0];
  }, [analysisResults, selectedLeakId]);

  // Load explanation whenever active leak changes
  useEffect(() => {
    if (!activeLeak) return;

    let isMounted = true;
    setLoading(true);

    fetchLeakExplanation(activeLeak)
      .then((res) => {
        if (isMounted) {
          setExplanation(res);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setExplanation(generateRuleBasedExplanation(activeLeak));
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [activeLeak, fetchLeakExplanation]);

  if (!analysisResults || !activeLeak) {
    return (
      <div className="bg-[#1E293B] border border-[#334155] rounded-[12px] p-12 text-center max-w-xl mx-auto my-12 shadow-md">
        <AlertCircle className="w-10 h-10 text-[#818CF8] mx-auto mb-4" />
        <h2 className="font-heading text-[22px] text-[#F1F5F9] font-semibold">
          No Leak Selected
        </h2>
        <p className="text-[14px] text-[#94A3B8] mt-2">
          Run an analysis on the Upload page or select a detected leak from the Dashboard.
        </p>
        <button
          onClick={() => setCurrentView('dashboard')}
          className="mt-6 px-5 py-2.5 bg-[#818CF8] hover:bg-[#818CF8]/90 text-[#0F172A] font-semibold text-[14px] rounded-[6px] transition-colors"
        >
          View Dashboard
        </button>
      </div>
    );
  }

  // Navigation between leaks
  const leakIndex = analysisResults.leaks.findIndex((l) => l.id === activeLeak.id);
  const prevLeak = leakIndex > 0 ? analysisResults.leaks[leakIndex - 1] : null;
  const nextLeak = leakIndex < analysisResults.leaks.length - 1 ? analysisResults.leaks[leakIndex + 1] : null;

  // Check if already in action plan
  const isAlreadyInPlan = actionPlan.some((item) => item.leakId === activeLeak.id);

  // Orders table (up to 20 orders)
  const displayOrders = activeLeak.evidence.orders.slice(0, 20);

  return (
    <div className="space-y-6">
      {/* Top Header & Breadcrumb Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#334155] pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentView('dashboard')}
            className="p-1.5 text-[#94A3B8] hover:text-[#F1F5F9] bg-[#1E293B] hover:bg-[#26344A] border border-[#334155] rounded-[6px] transition-colors"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[12px] bg-[#0F172A] border border-[#334155] text-[#818CF8] font-mono px-2 py-0.5 rounded">
                {activeLeak.category}
              </span>
              <span className="text-[11px] text-[#94A3B8] font-mono bg-[#0F172A] border border-[#334155] px-1.5 py-0.5 rounded">
                Simulated
              </span>
            </div>
            <h1 className="font-heading text-[24px] sm:text-[28px] font-semibold text-[#F1F5F9] tracking-tight mt-1">
              {activeLeak.title}
            </h1>
          </div>
        </div>

        {/* Next / Previous Leak Switcher */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            onClick={() => prevLeak && selectLeak(prevLeak.id)}
            disabled={!prevLeak}
            className={`p-2 rounded-[6px] border border-[#334155] text-[#94A3B8] transition-colors ${
              prevLeak ? 'hover:bg-[#1E293B] hover:text-[#F1F5F9]' : 'opacity-40 cursor-not-allowed'
            }`}
            aria-label="Previous leak"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-[12px] text-[#94A3B8] font-mono">
            {leakIndex + 1} of {analysisResults.leaks.length}
          </span>
          <button
            onClick={() => nextLeak && selectLeak(nextLeak.id)}
            disabled={!nextLeak}
            className={`p-2 rounded-[6px] border border-[#334155] text-[#94A3B8] transition-colors ${
              nextLeak ? 'hover:bg-[#1E293B] hover:text-[#F1F5F9]' : 'opacity-40 cursor-not-allowed'
            }`}
            aria-label="Next leak"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Top Banner: Loss Summary & Compact Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Loss Hero Card (5 cols) */}
        <div className="lg:col-span-5 bg-[#1E293B] border border-[#334155] rounded-[12px] p-6 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[12px] uppercase tracking-wider font-medium text-[#94A3B8]">
                Identified Potential Loss
              </span>
              <span className="text-[11px] text-[#818CF8] font-mono bg-[#818CF8]/10 border border-[#818CF8]/30 px-2 py-0.5 rounded-[6px]">
                Simulated
              </span>
            </div>
            <p className="text-[32px] font-bold text-[#F1F5F9] tabular-nums mt-3 leading-none">
              {formatINR(activeLeak.total_loss)}
            </p>
            <p className="text-[14px] text-[#94A3B8] mt-3 leading-relaxed">
              {activeLeak.summary}
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-[#334155] flex items-center justify-between text-[13px]">
            <span className="text-[#94A3B8]">Severity Classification:</span>
            <span
              className={`font-medium px-2 py-0.5 rounded text-[12px] ${
                activeLeak.severity === 'High'
                  ? 'text-red-400 bg-red-950/40 border border-red-500/40'
                  : activeLeak.severity === 'Medium'
                  ? 'text-amber-300 bg-[#B45309]/20 border border-[#B45309]/50'
                  : 'text-[#818CF8] bg-[#818CF8]/10 border border-[#818CF8]/30'
              }`}
            >
              {activeLeak.severity} Severity
            </span>
          </div>
        </div>

        {/* Right Compact Stats Grid (7 cols) */}
        <div className="lg:col-span-7 bg-[#1E293B] border border-[#334155] rounded-[12px] p-6 shadow-md flex flex-col justify-between">
          <div className="border-b border-[#334155] pb-3">
            <span className="text-[12px] uppercase tracking-wider font-medium text-[#94A3B8]">
              Operational Evidence Statistics
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 my-4">
            {Object.entries(activeLeak.evidence.stats).map(([label, val]) => (
              <div key={label} className="p-3 rounded-[6px] bg-[#0F172A] border border-[#334155]">
                <p className="text-[11px] text-[#94A3B8] uppercase tracking-wider">{label}</p>
                <p className="text-[16px] font-semibold text-[#F1F5F9] font-mono tabular-nums mt-1 truncate">
                  {typeof val === 'number' && label.includes('Loss') ? formatINR(val) : String(val)}
                </p>
              </div>
            ))}
          </div>

          <p className="text-[12px] text-[#94A3B8] italic">
            Metrics aggregated exclusively from matching transactional line items.
          </p>
        </div>
      </div>

      {/* AI Explanation Panel */}
      <div className="bg-[#1E293B] border border-[#334155] rounded-[12px] p-6 shadow-lg space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#334155] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[6px] bg-[#818CF8]/10 border border-[#818CF8]/30 flex items-center justify-center text-[#818CF8]">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-heading text-[18px] text-[#F1F5F9] font-semibold">
                Root Cause Explanation & Recommendation
              </h2>
              <p className="text-[12px] text-[#94A3B8]">
                Ground truth analysis derived strictly from transaction numbers
              </p>
            </div>
          </div>

          {/* Model / Rule-based Badge */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono px-2.5 py-1 rounded-[6px] bg-[#0F172A] border border-[#334155] text-[#818CF8]">
              {explanation?.isRuleBased
                ? 'Rule-based Engine'
                : (explanation?.modelName || 'Nemotron 70B')}
            </span>
          </div>
        </div>

        {/* Shimmer Skeleton during loading */}
        {loading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-4 bg-[#334155]/60 rounded w-1/3" />
            <div className="h-6 bg-[#334155]/40 rounded w-3/4" />
            <div className="h-16 bg-[#334155]/30 rounded w-full" />
            <div className="h-24 bg-[#334155]/50 rounded w-full" />
          </div>
        ) : (
          explanation && (
            <div className="space-y-5">
              {/* Optional Warning Notice if Rule-based fallback active */}
              {explanation.isRuleBased && explanation.warning && (
                <div className="p-3 rounded-[6px] bg-[#B45309]/10 border border-[#B45309]/40 text-[#B45309] text-[12px] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{explanation.warning}</span>
                </div>
              )}

              {/* Likely Root Cause */}
              <div className="space-y-1">
                <span className="text-[12px] uppercase tracking-wider font-semibold text-[#818CF8]">
                  Likely Root Cause
                </span>
                <p className="text-[16px] text-[#F1F5F9] font-medium leading-snug">
                  {explanation.rootCause}
                </p>
              </div>

              {/* Reasoning */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] uppercase tracking-wider font-semibold text-[#94A3B8]">
                    Reasoning & Financial Evidence
                  </span>
                  <span className="text-[11px] font-mono text-[#94A3B8] bg-[#0F172A] px-1.5 py-0.5 rounded">
                    Confidence: {explanation.confidence}
                  </span>
                </div>
                <p className="text-[14px] text-[#94A3B8] leading-relaxed">
                  {explanation.reasoning}
                </p>
              </div>

              {/* Highlighted Recommended Action Box */}
              <div className="p-5 rounded-[12px] bg-[#0F172A] border border-[#818CF8]/40 shadow-inner flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[12px] uppercase tracking-wider font-bold text-[#818CF8]">
                    Recommended Action
                  </span>
                  <p className="text-[15px] font-medium text-[#F1F5F9] leading-snug">
                    {explanation.recommendedAction}
                  </p>
                </div>

                <button
                  onClick={() => addToActionPlan(activeLeak)}
                  disabled={isAlreadyInPlan}
                  className={`shrink-0 px-4 py-2.5 rounded-[6px] text-[13px] font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                    isAlreadyInPlan
                      ? 'bg-[#334155]/60 text-[#94A3B8] border border-[#334155] cursor-default'
                      : 'bg-[#818CF8] hover:bg-[#818CF8]/90 text-[#0F172A] shadow-md shadow-[#818CF8]/20'
                  }`}
                >
                  {isAlreadyInPlan ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-[#818CF8]" />
                      <span>Added to action plan</span>
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-4 h-4" />
                      <span>Add to action plan</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )
        )}
      </div>

      {/* Sticky Header Table of Affected Orders (up to 20) */}
      <div className="bg-[#1E293B] border border-[#334155] rounded-[12px] shadow-md overflow-hidden">
        <div className="p-5 border-b border-[#334155] flex items-center justify-between">
          <div>
            <h2 className="font-heading text-[18px] text-[#F1F5F9] font-semibold">
              Sample Affected Orders ({displayOrders.length} of {activeLeak.affected_orders_count})
            </h2>
            <p className="text-[12px] text-[#94A3B8]">
              Detailed transaction records exhibiting this primary leak anomaly
            </p>
          </div>
          <span className="text-[12px] text-[#94A3B8] font-mono">
            Sorted by candidate loss
          </span>
        </div>

        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-[#0F172A] z-10 border-b border-[#334155]">
              <tr className="text-[12px] uppercase tracking-wider text-[#94A3B8] font-medium">
                <th className="p-3 pl-5">Order ID</th>
                <th className="p-3">Date</th>
                <th className="p-3">Channel</th>
                <th className="p-3">SKU</th>
                <th className="p-3 text-right">Gross Rev</th>
                <th className="p-3 text-right">Discount</th>
                <th className="p-3 text-right">Shipping</th>
                <th className="p-3 text-right">Net Profit</th>
                <th className="p-3 text-right pr-5">Leak Loss</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#334155]/60 text-[13px] font-mono">
              {displayOrders.map((ord) => (
                <tr key={ord.order_id} className="hover:bg-[#26344A] transition-colors">
                  <td className="p-3 pl-5 font-semibold text-[#818CF8]">
                    {ord.order_id}
                  </td>
                  <td className="p-3 text-[#94A3B8] font-sans">
                    {formatDate(ord.date)}
                  </td>
                  <td className="p-3 text-[#F1F5F9] font-sans">
                    {ord.channel}
                  </td>
                  <td className="p-3 text-[#94A3B8]">
                    {ord.sku}
                  </td>
                  <td className="p-3 text-right text-[#F1F5F9] tabular-nums">
                    {formatINR(ord.gross)}
                  </td>
                  <td className="p-3 text-right text-[#94A3B8] tabular-nums">
                    {ord.discount > 0 ? formatINR(ord.discount) : '—'}
                  </td>
                  <td className="p-3 text-right text-[#94A3B8] tabular-nums">
                    {formatINR(ord.shipping)}
                  </td>
                  <td className="p-3 text-right tabular-nums text-[#F1F5F9]">
                    {formatINR(ord.profit)}
                  </td>
                  <td className="p-3 pr-5 text-right font-bold text-red-400 tabular-nums">
                    {formatINR(ord.loss)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
