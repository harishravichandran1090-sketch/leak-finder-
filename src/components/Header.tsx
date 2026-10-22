/**
 * Top Header Component
 * Contains breadcrumbs ("LeakFinder / Dashboard"), Command Palette shortcut, and mobile menu toggle.
 */

import React from 'react';
import { Menu, Command, Sparkles } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface HeaderProps {
  onOpenMobileMenu: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenMobileMenu }) => {
  const { currentView, setCommandPaletteOpen, selectedLeakId, analysisResults } = useApp();

  const getBreadcrumbLabel = () => {
    switch (currentView) {
      case 'upload':
        return 'Upload & Quality Checks';
      case 'dashboard':
        return 'Executive Margin Dashboard';
      case 'leak_detail':
        if (selectedLeakId && analysisResults) {
          const leak = analysisResults.leaks.find((l) => l.id === selectedLeakId);
          return `Leak Detail / ${leak ? leak.category : 'Overview'}`;
        }
        return 'Leak Detail Analysis';
      case 'action_plan':
        return 'Recoverable Action Plan';
      case 'simulator':
        return 'Discount Cap Simulator';
      default:
        return 'Overview';
    }
  };

  return (
    <header className="h-16 px-6 border-b border-[#334155] bg-[#0F172A] flex items-center justify-between sticky top-0 z-20">
      {/* Left zone: Mobile toggle + Breadcrumb */}
      <div className="flex items-center gap-4 min-w-0">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden text-[#94A3B8] hover:text-[#F1F5F9] p-1.5 rounded-[6px] hover:bg-[#1E293B] transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[14px] truncate">
          <span className="text-[#94A3B8] font-medium">LeakFinder</span>
          <span className="text-[#94A3B8]/60" aria-hidden="true">/</span>
          <span className="text-[#F1F5F9] font-medium truncate">{getBreadcrumbLabel()}</span>
        </nav>
      </div>

      {/* Right zone: Command Palette Quick Trigger & Status */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-[#1E293B] hover:bg-[#26344A] border border-[#334155] text-[#94A3B8] hover:text-[#F1F5F9] rounded-[6px] text-[12px] font-medium transition-colors"
          aria-label="Open command palette (Ctrl+K or Cmd+K)"
        >
          <Command className="w-3.5 h-3.5 text-[#818CF8]" />
          <span className="hidden sm:inline">Commands</span>
          <kbd className="hidden sm:inline bg-[#0F172A] px-1.5 py-0.5 rounded text-[10px] border border-[#334155] font-mono text-[#94A3B8]">
            ⌘K
          </kbd>
        </button>
      </div>
    </header>
  );
};
