/**
 * Command Palette Component (Ctrl+K or Cmd+K)
 * Accessible quick navigation across pages and actions.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  UploadCloud,
  LayoutDashboard,
  SearchCode,
  ListTodo,
  Sliders,
  RotateCcw,
  Play,
  Download,
  MessageSquare,
  X,
} from 'lucide-react';
import { useApp, AppView } from '../context/AppContext';

export const CommandPalette: React.FC = () => {
  const {
    commandPaletteOpen,
    setCommandPaletteOpen,
    setCurrentView,
    loadDemoData,
    runAnalysisPipeline,
    hasAllDatasets,
    downloadActionPlanCSV,
    actionPlan,
    setChatOpen,
  } = useApp();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [commandPaletteOpen]);

  if (!commandPaletteOpen) return null;

  interface CommandItem {
    id: string;
    label: string;
    category: string;
    icon: React.FC<{ className?: string }>;
    run: () => void;
  }

  const commands: CommandItem[] = [
    {
      id: 'nav-dashboard',
      label: 'Go to Dashboard',
      category: 'Navigation',
      icon: LayoutDashboard,
      run: () => setCurrentView('dashboard'),
    },
    {
      id: 'nav-upload',
      label: 'Go to Upload & Ingest',
      category: 'Navigation',
      icon: UploadCloud,
      run: () => setCurrentView('upload'),
    },
    {
      id: 'nav-leak-detail',
      label: 'Go to Leak Detail',
      category: 'Navigation',
      icon: SearchCode,
      run: () => setCurrentView('leak_detail'),
    },
    {
      id: 'nav-action-plan',
      label: 'Go to Action Plan',
      category: 'Navigation',
      icon: ListTodo,
      run: () => setCurrentView('action_plan'),
    },
    {
      id: 'nav-simulator',
      label: 'Go to Policy Simulator',
      category: 'Navigation',
      icon: Sliders,
      run: () => setCurrentView('simulator'),
    },
    {
      id: 'act-load-demo',
      label: 'Load 120-Order Benchmark Demo Data',
      category: 'Actions',
      icon: RotateCcw,
      run: () => {
        loadDemoData();
        setCurrentView('upload');
      },
    },
    {
      id: 'act-run-analysis',
      label: 'Run LeakFinder Analysis',
      category: 'Actions',
      icon: Play,
      run: () => {
        if (hasAllDatasets) {
          runAnalysisPipeline();
        } else {
          loadDemoData();
          setTimeout(() => runAnalysisPipeline(), 100);
        }
      },
    },
    {
      id: 'act-download-csv',
      label: 'Download Action Plan CSV',
      category: 'Actions',
      icon: Download,
      run: () => downloadActionPlanCSV(),
    },
    {
      id: 'act-open-assistant',
      label: 'Open LeakFinder Assistant',
      category: 'Actions',
      icon: MessageSquare,
      run: () => setChatOpen(true),
    },
  ];

  const filtered = commands.filter((cmd) =>
    cmd.label.toLowerCase().includes(query.toLowerCase()) ||
    cmd.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + (filtered.length || 1)) % (filtered.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].run();
        setCommandPaletteOpen(false);
      }
    } else if (e.key === 'Escape') {
      setCommandPaletteOpen(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-start justify-center pt-20 px-4"
      onClick={() => setCommandPaletteOpen(false)}
    >
      <div
        className="bg-[#1E293B] border border-[#334155] rounded-[12px] shadow-2xl max-w-lg w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search input header */}
        <div className="p-4 border-b border-[#334155] flex items-center gap-3">
          <Search className="w-5 h-5 text-[#818CF8]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command or jump to page..."
            className="flex-1 bg-transparent text-[#F1F5F9] placeholder-[#94A3B8] text-[15px] outline-none"
          />
          <button
            onClick={() => setCommandPaletteOpen(false)}
            className="text-[#94A3B8] hover:text-[#F1F5F9] p-1 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Command list */}
        <div className="max-h-72 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <p className="p-4 text-center text-[13px] text-[#94A3B8]">
              No commands found matching "{query}"
            </p>
          ) : (
            filtered.map((cmd, idx) => {
              const Icon = cmd.icon;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={cmd.id}
                  onClick={() => {
                    cmd.run();
                    setCommandPaletteOpen(false);
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between p-3 rounded-[6px] cursor-pointer text-[13px] transition-colors ${
                    isSelected ? 'bg-[#818CF8]/15 text-[#818CF8]' : 'text-[#F1F5F9] hover:bg-[#26344A]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="font-medium">{cmd.label}</span>
                  </div>
                  <span className="text-[11px] text-[#94A3B8] font-mono uppercase tracking-wider">
                    {cmd.category}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 border-t border-[#334155] bg-[#0F172A] flex items-center justify-between text-[11px] text-[#94A3B8] font-mono">
          <span>Navigate with ↑ and ↓</span>
          <span>Press Enter to select · Esc to close</span>
        </div>
      </div>
    </div>
  );
};
