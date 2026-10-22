/**
 * Action Plan Page Component
 * Ranked list of operational recovery initiatives.
 * Features:
 * - Summary strip (Total recoverable, Open actions, Done actions)
 * - Progress bar ("X of Y actions completed")
 * - Ranked list with checkbox, Move up/down, Remove
 * - Download CSV with BOM, quotation, Excel-ready
 * - Empty state with outlined icon
 */

import React from 'react';
import {
  ListTodo,
  Download,
  ArrowUp,
  ArrowDown,
  Trash2,
  CheckCircle2,
  Circle,
  AlertCircle,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatINR } from '../utils/formatters';

export const ActionPlanPage: React.FC = () => {
  const {
    actionPlan,
    toggleActionStatus,
    moveAction,
    removeAction,
    downloadActionPlanCSV,
    setCurrentView,
    selectLeak,
  } = useApp();

  const totalRecoverable = actionPlan.reduce((sum, item) => sum + item.estimatedRecoverable, 0);
  const doneCount = actionPlan.filter((item) => item.status === 'Done').length;
  const openCount = actionPlan.length - doneCount;
  const progressPercent = actionPlan.length > 0 ? (doneCount / actionPlan.length) * 100 : 0;

  if (actionPlan.length === 0) {
    return (
      <div className="space-y-6">
        <div className="border-b border-[#334155] pb-4">
          <h1 className="font-heading text-[28px] font-semibold text-[#F1F5F9] tracking-tight">
            Recoverable Action Plan
          </h1>
          <p className="text-[14px] text-[#94A3B8]">
            Prioritize and track operational initiatives to recover leaked margin.
          </p>
        </div>

        {/* Empty State */}
        <div className="bg-[#1E293B] border border-[#334155] rounded-[12px] p-12 text-center max-w-lg mx-auto my-12 shadow-md">
          <div className="w-14 h-14 rounded-full border border-[#334155] bg-[#0F172A] flex items-center justify-center mx-auto mb-4 text-[#818CF8]">
            <ListTodo className="w-7 h-7" />
          </div>
          <h2 className="font-heading text-[20px] text-[#F1F5F9] font-semibold">
            No actions yet
          </h2>
          <p className="text-[14px] text-[#94A3B8] mt-2 leading-relaxed">
            Review your detected leaks and add recommended actions to build your recovery plan.
          </p>
          <button
            onClick={() => setCurrentView('dashboard')}
            className="mt-6 px-5 py-2.5 bg-[#818CF8] hover:bg-[#818CF8]/90 text-[#0F172A] font-semibold text-[14px] rounded-[6px] transition-colors cursor-pointer"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header & CSV Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#334155] pb-4">
        <div>
          <h1 className="font-heading text-[28px] font-semibold text-[#F1F5F9] tracking-tight">
            Recoverable Action Plan
          </h1>
          <p className="text-[14px] text-[#94A3B8]">
            Ranked by estimated recoverable amount across identified leakage areas.
          </p>
        </div>

        <button
          onClick={downloadActionPlanCSV}
          className="self-start sm:self-center px-4 py-2 bg-[#1E293B] hover:bg-[#26344A] border border-[#334155] hover:border-[#818CF8]/50 text-[#F1F5F9] text-[13px] font-medium rounded-[6px] transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
          aria-label="Download action plan as CSV"
        >
          <Download className="w-4 h-4 text-[#818CF8]" />
          <span>Download CSV</span>
        </button>
      </div>

      {/* Summary Strip (Total recoverable, Open, Done) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#1E293B] border border-[#334155] rounded-[12px] p-5 shadow-md">
          <span className="text-[12px] uppercase tracking-wider font-medium text-[#94A3B8]">
            Total Estimated Recoverable
          </span>
          <p className="text-[28px] font-bold text-[#818CF8] tabular-nums mt-1 leading-tight">
            {formatINR(totalRecoverable)}
          </p>
          <p className="text-[12px] text-[#94A3B8] mt-1">Sum of actions in this plan</p>
        </div>

        <div className="bg-[#1E293B] border border-[#334155] rounded-[12px] p-5 shadow-md">
          <span className="text-[12px] uppercase tracking-wider font-medium text-[#94A3B8]">
            Open Initiatives
          </span>
          <p className="text-[28px] font-bold text-[#F1F5F9] tabular-nums mt-1 leading-tight">
            {openCount} <span className="text-[14px] font-normal text-[#94A3B8]">actions</span>
          </p>
          <p className="text-[12px] text-[#94A3B8] mt-1">Pending implementation</p>
        </div>

        <div className="bg-[#1E293B] border border-[#334155] rounded-[12px] p-5 shadow-md">
          <span className="text-[12px] uppercase tracking-wider font-medium text-[#94A3B8]">
            Completed Initiatives
          </span>
          <p className="text-[28px] font-bold text-[#F1F5F9] tabular-nums mt-1 leading-tight">
            {doneCount} <span className="text-[14px] font-normal text-[#94A3B8]">actions</span>
          </p>
          <p className="text-[12px] text-[#94A3B8] mt-1">Marked as resolved</p>
        </div>
      </div>

      {/* Progress Bar Card */}
      <div className="bg-[#1E293B] border border-[#334155] rounded-[12px] p-5 shadow-md space-y-3">
        <div className="flex items-center justify-between text-[13px]">
          <span className="font-medium text-[#F1F5F9]">
            {doneCount} of {actionPlan.length} actions completed
          </span>
          <span className="font-mono text-[#818CF8] font-semibold tabular-nums">
            {progressPercent.toFixed(0)}%
          </span>
        </div>

        <div className="w-full bg-[#0F172A] border border-[#334155] h-2.5 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#818CF8] rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Ranked Action List */}
      <div className="bg-[#1E293B] border border-[#334155] rounded-[12px] shadow-md overflow-hidden">
        <div className="px-5 py-4 border-b border-[#334155] flex items-center justify-between">
          <span className="text-[12px] uppercase tracking-wider font-medium text-[#94A3B8]">
            Ranked Action Items
          </span>
          <span className="text-[12px] text-[#94A3B8]">
            Use arrows to reorder priority
          </span>
        </div>

        <div className="divide-y divide-[#334155]">
          {actionPlan.map((item, idx) => {
            const isDone = item.status === 'Done';
            return (
              <div
                key={item.id}
                className={`p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                  isDone ? 'bg-[#0F172A]/40 opacity-70' : 'hover:bg-[#26344A]/50'
                }`}
              >
                {/* Left zone: Rank, Checkbox, Text */}
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  {/* Rank Badge */}
                  <span className="w-7 h-7 rounded-[6px] bg-[#0F172A] border border-[#334155] text-[#818CF8] font-mono text-[13px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    #{item.rank}
                  </span>

                  {/* Checkbox toggle */}
                  <button
                    onClick={() => toggleActionStatus(item.id)}
                    className="mt-1 text-[#94A3B8] hover:text-[#818CF8] transition-colors shrink-0"
                    aria-label={`Mark action #${item.rank} as ${isDone ? 'Open' : 'Done'}`}
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-5 h-5 text-[#818CF8]" />
                    ) : (
                      <Circle className="w-5 h-5" />
                    )}
                  </button>

                  {/* Action content */}
                  <div className="space-y-1 min-w-0">
                    <p
                      className={`text-[15px] font-medium leading-snug ${
                        isDone ? 'line-through text-[#94A3B8]' : 'text-[#F1F5F9]'
                      }`}
                    >
                      {item.action}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-[12px] text-[#94A3B8]">
                      <span className="bg-[#0F172A] border border-[#334155] px-2 py-0.5 rounded text-[11px] font-mono">
                        {item.category}
                      </span>
                      <span>·</span>
                      <button
                        onClick={() => selectLeak(item.leakId)}
                        className="hover:text-[#818CF8] underline truncate max-w-xs text-left"
                      >
                        {item.leakTitle}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right zone: Recoverable amount + Controls */}
                <div className="flex items-center justify-between sm:justify-end gap-5 shrink-0 pl-11 sm:pl-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-[#334155]">
                  <div className="text-left sm:text-right">
                    <p className="text-[11px] text-[#94A3B8] uppercase tracking-wider">
                      Recoverable
                    </p>
                    <p className="text-[16px] font-mono font-bold text-[#F1F5F9] tabular-nums">
                      {formatINR(item.estimatedRecoverable)}
                    </p>
                  </div>

                  {/* Reorder and Delete Buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => moveAction(item.id, 'up')}
                      disabled={idx === 0}
                      className={`p-1.5 rounded-[6px] border border-[#334155] text-[#94A3B8] transition-colors ${
                        idx === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-[#0F172A] hover:text-[#F1F5F9]'
                      }`}
                      aria-label="Move action up"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => moveAction(item.id, 'down')}
                      disabled={idx === actionPlan.length - 1}
                      className={`p-1.5 rounded-[6px] border border-[#334155] text-[#94A3B8] transition-colors ${
                        idx === actionPlan.length - 1
                          ? 'opacity-30 cursor-not-allowed'
                          : 'hover:bg-[#0F172A] hover:text-[#F1F5F9]'
                      }`}
                      aria-label="Move action down"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => removeAction(item.id)}
                      className="p-1.5 rounded-[6px] border border-[#334155] text-[#94A3B8] hover:text-red-400 hover:bg-[#0F172A] transition-colors ml-1"
                      aria-label="Remove action"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
