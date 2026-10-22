/**
 * Sidebar Navigation Component
 * Desktop sidebar (>= 900px) and slide-in mobile/tablet drawer (< 900px).
 */

import React, { useEffect } from 'react';
import {
  UploadCloud,
  LayoutDashboard,
  Search,
  ListTodo,
  Sliders,
  X,
  Database,
  TrendingDown,
} from 'lucide-react';
import { useApp, AppView } from '../context/AppContext';

interface SidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, setMobileOpen }) => {
  const { currentView, setCurrentView, analysisResults, selectedLeakId } = useApp();

  const navItems: Array<{ view: AppView; label: string; icon: React.FC<{ className?: string }> }> = [
    { view: 'upload', label: 'Upload', icon: UploadCloud },
    { view: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { view: 'leak_detail', label: 'Leak Detail', icon: Search },
    { view: 'action_plan', label: 'Action Plan', icon: ListTodo },
    { view: 'simulator', label: 'Simulator', icon: Sliders },
  ];

  // Close drawer on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileOpen) {
        setMobileOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen, setMobileOpen]);

  const handleNavClick = (view: AppView) => {
    setCurrentView(view);
    setMobileOpen(false);
  };

  const navContent = (
    <div className="flex flex-col h-full bg-[#1E293B] border-r border-[#334155] w-64 select-none">
      {/* Brand Header */}
      <div className="h-16 px-6 flex items-center justify-between border-b border-[#334155]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[6px] bg-[#818CF8]/10 border border-[#818CF8]/30 flex items-center justify-center text-[#818CF8]">
            <TrendingDown className="w-5 h-5" />
          </div>
          <span className="font-heading text-[18px] font-semibold text-[#F1F5F9] tracking-tight">
            LeakFinder AI
          </span>
        </div>
        {/* Mobile close button */}
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden text-[#94A3B8] hover:text-[#F1F5F9] p-1.5 rounded-[6px] transition-colors"
          aria-label="Close navigation drawer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Nav List */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto" aria-label="Main Navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            currentView === item.view ||
            (item.view === 'leak_detail' && currentView === 'leak_detail');

          return (
            <button
              key={item.view}
              onClick={() => handleNavClick(item.view)}
              className={`w-full relative flex items-center gap-3 px-3.5 py-2.5 rounded-[6px] text-[14px] font-medium transition-all group ${
                isActive
                  ? 'bg-[#26344A] text-[#F1F5F9]'
                  : 'text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#26344A]/60'
              }`}
            >
              {/* Accent bar on active item */}
              {isActive && (
                <span
                  className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#818CF8] rounded-r"
                  aria-hidden="true"
                />
              )}
              <Icon
                className={`w-5 h-5 shrink-0 transition-colors ${
                  isActive ? 'text-[#818CF8]' : 'text-[#94A3B8] group-hover:text-[#F1F5F9]'
                }`}
              />
              <span className="truncate">{item.label}</span>
              {item.view === 'leak_detail' && !selectedLeakId && (
                <span className="ml-auto text-[11px] text-[#94A3B8] bg-[#0F172A] px-1.5 py-0.5 rounded">
                  auto
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Info Badge */}
      <div className="p-4 border-t border-[#334155] space-y-3">
        {/* Data Status Indicator */}
        <div className="flex items-center gap-2 text-[12px] text-[#94A3B8] px-2 py-1.5 rounded-[6px] bg-[#0F172A]/80 border border-[#334155]/60">
          <Database className="w-4 h-4 text-[#818CF8] shrink-0" />
          <span className="truncate">
            {analysisResults ? 'Analysis loaded (120 orders)' : 'Awaiting data ingest'}
          </span>
        </div>

        {/* Mandatory Simulated data badge */}
        <div className="flex items-center justify-between text-[11px] text-[#94A3B8] px-2">
          <span className="uppercase tracking-wider font-medium">Environment</span>
          <span className="text-[#818CF8] bg-[#818CF8]/10 border border-[#818CF8]/30 px-2 py-0.5 rounded-[6px] font-mono text-[11px]">
            Simulated data
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (visible >= 900px) */}
      <aside className="hidden lg:block h-screen shrink-0 sticky top-0 z-30">
        {navContent}
      </aside>

      {/* Mobile Drawer Backdrop & Drawer (< 900px) */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-50 transform lg:hidden transition-transform duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {navContent}
      </div>
    </>
  );
};
