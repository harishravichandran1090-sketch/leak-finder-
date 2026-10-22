/**
 * Welcome Screen Component
 * Displayed on initial visit before entering the main workspace.
 * Features dark aesthetic, full-screen background image with >= 70% dark overlay.
 */

import React, { useState } from 'react';
import { ArrowRight, ShieldCheck, Cpu, SlidersHorizontal } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const WelcomeScreen: React.FC = () => {
  const { setCurrentView, loadDemoData, runAnalysisPipeline } = useApp();
  const [imageLoaded, setImageLoaded] = useState(false);

  const bgImageUrl = '/src/assets/images/welcome_hero_bg_1792650180192.jpg';

  const handleGetStarted = () => {
    setCurrentView('upload');
  };

  const handleQuickDemo = () => {
    loadDemoData();
    setCurrentView('upload');
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between overflow-hidden bg-[#0F172A]">
      {/* Background Image Layer (Welcome Screen Only) */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-opacity duration-700 pointer-events-none"
        style={{
          backgroundImage: `url(${bgImageUrl})`,
          opacity: imageLoaded ? 1 : 0.8,
        }}
      >
        <img
          src={bgImageUrl}
          alt="Corporate architecture background"
          className="hidden"
          onLoad={() => setImageLoaded(true)}
          referrerPolicy="no-referrer"
        />
      </div>

      {/* Dark Overlay: Minimum 70% dark behind center of screen */}
      <div
        className="absolute inset-0 bg-[#0F172A]/80 backdrop-blur-[2px] pointer-events-none"
        aria-hidden="true"
      />

      {/* Subtle top subtle brand lockup */}
      <header className="relative z-10 w-full px-8 py-6 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-[6px] bg-[#818CF8]/15 border border-[#818CF8]/30 flex items-center justify-center text-[#818CF8]">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <span className="font-heading text-[20px] font-semibold text-[#F1F5F9] tracking-tight">
            LeakFinder AI
          </span>
        </div>

        <button
          onClick={handleQuickDemo}
          className="text-[13px] text-[#94A3B8] hover:text-[#F1F5F9] transition-colors font-medium px-3 py-1.5 rounded-[6px] hover:bg-[#1E293B]/70 border border-transparent hover:border-[#334155]"
        >
          Load 120-Order Benchmark
        </button>
      </header>

      {/* Hero Body */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12 text-center max-w-3xl mx-auto">
        <h1 className="font-heading text-[36px] sm:text-[46px] font-semibold text-[#F1F5F9] tracking-tight leading-[1.15] text-balance">
          LeakFinder AI
        </h1>

        <p className="mt-5 text-[18px] sm:text-[20px] text-[#94A3B8] leading-relaxed max-w-2xl font-normal">
          Find where your business is losing money, why it happens, and what to do about it.
        </p>

        {/* Action Button Strip */}
        <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
          <button
            onClick={handleGetStarted}
            className="w-full sm:w-auto px-7 py-3.5 bg-[#818CF8] hover:bg-[#818CF8]/90 text-[#0F172A] font-semibold text-[15px] rounded-[6px] transition-all shadow-lg shadow-[#818CF8]/20 flex items-center justify-center gap-2 group cursor-pointer"
          >
            <span>Get started</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>

        {/* Feature summary markers */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left w-full border-t border-[#334155]/60 pt-8">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-[#F1F5F9] font-medium text-[14px]">
              <ShieldCheck className="w-4 h-4 text-[#818CF8]" />
              <span>5 Cross-Dataset Rules</span>
            </div>
            <p className="text-[13px] text-[#94A3B8] leading-normal">
              Reconciles sales, orders, discounts, returns, and catalog costs.
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-[#F1F5F9] font-medium text-[14px]">
              <Cpu className="w-4 h-4 text-[#818CF8]" />
              <span>Nemotron Root Cause</span>
            </div>
            <p className="text-[13px] text-[#94A3B8] leading-normal">
              Extracts precise financial drivers without hallucinating numbers.
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-[#F1F5F9] font-medium text-[14px]">
              <SlidersHorizontal className="w-4 h-4 text-[#818CF8]" />
              <span>Policy Simulator</span>
            </div>
            <p className="text-[13px] text-[#94A3B8] leading-normal">
              Test discount caps across all channels to project recovered margin.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full px-8 py-5 text-center text-[12px] text-[#94A3B8]/70 border-t border-[#334155]/40">
        LeakFinder AI · Enterprise Margin Intelligence · Results are candidates for review, not proof of loss.
      </footer>
    </div>
  );
};
