/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ToastProvider } from './context/ToastContext';
import { AppProvider, useApp } from './context/AppContext';
import { WelcomeScreen } from './components/WelcomeScreen';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { UploadPage } from './components/UploadPage';
import { DashboardPage } from './components/DashboardPage';
import { LeakDetailPage } from './components/LeakDetailPage';
import { ActionPlanPage } from './components/ActionPlanPage';
import { SimulatorPage } from './components/SimulatorPage';
import { ChatAssistant } from './components/ChatAssistant';
import { CommandPalette } from './components/CommandPalette';

function AppContent() {
  const { currentView } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Welcome Screen is shown first on load with NO sidebar
  if (currentView === 'welcome') {
    return (
      <>
        <WelcomeScreen />
        <CommandPalette />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F172A] text-[#F1F5F9] flex flex-row">
      {/* Sidebar (Desktop + Mobile slide-in drawer) */}
      <Sidebar mobileOpen={mobileMenuOpen} setMobileOpen={setMobileMenuOpen} />

      {/* Main Viewport */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Header with Breadcrumb and Commands trigger */}
        <Header onOpenMobileMenu={() => setMobileMenuOpen(true)} />

        {/* Page Content: 24px padding (p-6) & 16px gaps */}
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
          {currentView === 'upload' && <UploadPage />}
          {currentView === 'dashboard' && <DashboardPage />}
          {currentView === 'leak_detail' && <LeakDetailPage />}
          {currentView === 'action_plan' && <ActionPlanPage />}
          {currentView === 'simulator' && <SimulatorPage />}
        </main>
      </div>

      {/* Fixed Chat Assistant Button & Panel */}
      <ChatAssistant />

      {/* Command Palette (Ctrl+K or Cmd+K) */}
      <CommandPalette />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ToastProvider>
  );
}
