/**
 * Main Application Context
 * Coordinates datasets, analysis runs, leaks, action plan, and UI state.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  ActionItem,
  AIExplanation,
  AnalysisResults,
  ChatMessage,
  DatasetKey,
  FileAttachmentStatus,
  JoinedOrder,
  Leak,
  QualityCheckResult,
  RawDatasets,
} from '../types';
import { generateDemoDatasets } from '../data/demoDataGenerator';
import { identifyDataset, parseCSVText, DATASET_SCHEMAS } from '../utils/csvParser';
import { runQualityChecks } from '../utils/qualityChecks';
import { runAnalysis } from '../services/analysisEngine';
import { generateRuleBasedExplanation } from '../services/ruleBasedExplainer';
import { useToast } from './ToastContext';
import { formatINRAmountPlain } from '../utils/formatters';

export type AppView = 'welcome' | 'upload' | 'dashboard' | 'leak_detail' | 'action_plan' | 'simulator';

interface AppContextType {
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  selectedLeakId: string | null;
  selectLeak: (leakId: string) => void;

  rawDatasets: RawDatasets;
  hasAllDatasets: boolean;
  datasetRowCounts: Record<DatasetKey, number>;
  datasetPreviews: Record<DatasetKey, any[]>;
  uploadErrors: Record<string, string>;

  loadDemoData: () => void;
  handleFileUpload: (files: FileList | File[]) => Promise<void>;

  qualityChecks: QualityCheckResult[];
  isAnalyzing: boolean;
  analysisStage: number; // 0 to 5
  runAnalysisPipeline: () => Promise<void>;

  analysisResults: AnalysisResults | null;
  categoryFilter: string | null;
  setCategoryFilter: (cat: string | null) => void;

  actionPlan: ActionItem[];
  addToActionPlan: (leak: Leak) => void;
  toggleActionStatus: (id: string) => void;
  moveAction: (id: string, direction: 'up' | 'down') => void;
  removeAction: (id: string) => void;
  downloadActionPlanCSV: () => void;

  discountCap: number;
  setDiscountCap: (cap: number) => void;
  simulatorStats: {
    currentProfit: number;
    currentDiscount: number;
    cappedProfit: number;
    cappedDiscount: number;
    profitDifference: number;
  };

  chatOpen: boolean;
  setChatOpen: (open: boolean) => void;
  chatMessages: ChatMessage[];
  chatLoading: boolean;
  sendChatMessage: (text: string) => Promise<void>;
  chatAttachments: FileAttachmentStatus[];
  addChatAttachments: (files: FileList | File[]) => Promise<void>;
  removeChatAttachment: (index: number) => void;

  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;

  fetchLeakExplanation: (leak: Leak) => Promise<AIExplanation>;
}

const emptyDatasets: RawDatasets = {
  sales: [],
  orders: [],
  discounts: [],
  returns: [],
  costs: [],
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showSuccess, showError } = useToast();

  const [currentView, setCurrentView] = useState<AppView>('welcome');
  const [selectedLeakId, setSelectedLeakId] = useState<string | null>(null);

  const [rawDatasets, setRawDatasets] = useState<RawDatasets>(emptyDatasets);
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});
  const [qualityChecks, setQualityChecks] = useState<QualityCheckResult[]>([]);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStage, setAnalysisStage] = useState(0);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResults | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const [actionPlan, setActionPlan] = useState<ActionItem[]>([]);
  const [discountCap, setDiscountCap] = useState<number>(15);

  const [chatOpen, setChatOpen] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatAttachments, setChatAttachments] = useState<FileAttachmentStatus[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'greeting',
      sender: 'assistant',
      text: 'Hi, I’m the LeakFinder assistant. Load your data or the demo, then ask me anything about your leaks.',
      timestamp: Date.now(),
    },
  ]);

  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Check which datasets are populated
  const datasetRowCounts: Record<DatasetKey, number> = {
    sales: rawDatasets.sales.length,
    orders: rawDatasets.orders.length,
    discounts: rawDatasets.discounts.length,
    returns: rawDatasets.returns.length,
    costs: rawDatasets.costs.length,
  };

  const hasAllDatasets = Object.values(datasetRowCounts).every((count) => count > 0);

  const datasetPreviews: Record<DatasetKey, any[]> = {
    sales: rawDatasets.sales.slice(0, 5),
    orders: rawDatasets.orders.slice(0, 5),
    discounts: rawDatasets.discounts.slice(0, 5),
    returns: rawDatasets.returns.slice(0, 5),
    costs: rawDatasets.costs.slice(0, 5),
  };

  // Keyboard shortcut listener for Command Palette (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setCommandPaletteOpen(false);
        setChatOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Recalculate quality checks whenever datasets change
  useEffect(() => {
    if (hasAllDatasets) {
      const checks = runQualityChecks(rawDatasets);
      setQualityChecks(checks);
    } else {
      setQualityChecks([]);
    }
  }, [rawDatasets, hasAllDatasets]);

  // Update assistant greeting after analysis
  useEffect(() => {
    if (analysisResults) {
      setChatMessages((prev) => {
        if (prev.length === 1 && prev[0].id === 'greeting') {
          return [
            {
              id: 'greeting-active',
              sender: 'assistant',
              text: 'Hi! I can explain any leak, compare categories, or test a discount cap. What would you like to know?',
              timestamp: Date.now(),
            },
          ];
        }
        return prev;
      });
    }
  }, [analysisResults]);

  // Select leak and switch to Leak Detail view
  const selectLeak = useCallback((leakId: string) => {
    setSelectedLeakId(leakId);
    setCurrentView('leak_detail');
  }, []);

  // Load deterministic demo data
  const loadDemoData = useCallback(() => {
    const demo = generateDemoDatasets();
    setRawDatasets(demo);
    setUploadErrors({});
    showSuccess(
      'Demo Data Loaded',
      'Loaded 120 benchmark orders across 4 weeks with planted margin anomalies.'
    );
  }, [showSuccess]);

  // Handle uploaded CSV files
  const handleFileUpload = useCallback(
    async (fileList: FileList | File[]) => {
      const files = Array.from(fileList);
      const newDatasets: Partial<RawDatasets> = {};
      const newErrors: Record<string, string> = { ...uploadErrors };

      for (const file of files) {
        if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
          newErrors[file.name] = `${file.name} is not a CSV file. Please export your table as comma-separated values.`;
          continue;
        }

        try {
          const text = await file.text();
          const { headers, rows } = parseCSVText(text);

          const { datasetKey, missingColumns, matchedDatasetCandidate } = identifyDataset(headers);

          if (datasetKey) {
            newDatasets[datasetKey] = rows as any;
            delete newErrors[file.name];
            if (matchedDatasetCandidate) {
              delete newErrors[matchedDatasetCandidate];
            }
          } else if (matchedDatasetCandidate && missingColumns && missingColumns.length > 0) {
            newErrors[file.name] = `Missing required column(s) for ${DATASET_SCHEMAS[matchedDatasetCandidate].label}: ${missingColumns.join(', ')}`;
          } else {
            newErrors[file.name] = `Columns in ${file.name} do not match any accepted dataset schema (Sales, Orders, Discounts, Returns, Costs).`;
          }
        } catch (err: any) {
          newErrors[file.name] = `Failed to parse ${file.name}: ${err.message || 'Corrupted file'}`;
        }
      }

      setUploadErrors(newErrors);
      setRawDatasets((prev) => ({
        ...prev,
        ...newDatasets,
      }));

      const loadedCount = Object.keys(newDatasets).length;
      if (loadedCount > 0) {
        showSuccess(`Uploaded ${loadedCount} dataset(s) successfully.`);
      }
    },
    [uploadErrors, showSuccess]
  );

  // Run full analysis pipeline with progressive 5-stage UI ticker
  const runAnalysisPipeline = useCallback(async () => {
    if (!hasAllDatasets) {
      showError('Incomplete Datasets', 'Please upload all 5 datasets before running analysis.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisStage(1); // Ingest

    // Stage 1: Ingest
    await new Promise((r) => setTimeout(r, 220));
    setAnalysisStage(2); // Calculate metrics

    // Stage 2: Calculate metrics
    await new Promise((r) => setTimeout(r, 220));
    setAnalysisStage(3); // Detect leaks

    // Stage 3: Detect leaks
    await new Promise((r) => setTimeout(r, 240));
    const results = runAnalysis(rawDatasets);
    setAnalysisStage(4); // Explain with AI

    // Stage 4: Explain with AI
    await new Promise((r) => setTimeout(r, 250));
    setAnalysisStage(5); // Build action plan

    // Stage 5: Finalize
    await new Promise((r) => setTimeout(r, 200));

    setAnalysisResults(results);
    setIsAnalyzing(false);
    setCurrentView('dashboard');
    showSuccess(
      'Analysis Complete',
      `Identified ${results.leaks.length} margin leakage candidates across 120 orders.`
    );
  }, [hasAllDatasets, rawDatasets, showSuccess, showError]);

  // Fetch explanation for a leak
  const fetchLeakExplanation = useCallback(async (leak: Leak): Promise<AIExplanation> => {
    try {
      const res = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leak }),
      });

      if (!res.ok) {
        return generateRuleBasedExplanation(
          leak,
          `Rule-based explanation active: Remote endpoint returned status ${res.status}.`
        );
      }

      const explanation = await res.json();
      return explanation;
    } catch {
      return generateRuleBasedExplanation(
        leak,
        'Rule-based explanation active: Network request failed or timed out.'
      );
    }
  }, []);

  // Action plan management
  const addToActionPlan = useCallback(
    (leak: Leak) => {
      // Check if already in plan
      const existing = actionPlan.find((item) => item.leakId === leak.id);
      if (existing) {
        showError('Action Already Exists', 'This leak recommendation is already in your action plan.');
        return;
      }

      const actionText =
        leak.explanation?.recommendedAction ||
        generateRuleBasedExplanation(leak).recommendedAction;

      const newItem: ActionItem = {
        id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        rank: actionPlan.length + 1,
        leakId: leak.id,
        action: actionText,
        leakTitle: leak.title,
        category: leak.category,
        estimatedRecoverable: leak.total_loss,
        status: 'Open',
      };

      const updated = [...actionPlan, newItem].sort(
        (a, b) => b.estimatedRecoverable - a.estimatedRecoverable
      );
      // Re-index ranks
      const reindexed = updated.map((item, idx) => ({ ...item, rank: idx + 1 }));

      setActionPlan(reindexed);
      showSuccess('Added to Action Plan', `Ranked by estimated recoverable amount.`);
    },
    [actionPlan, showSuccess, showError]
  );

  const toggleActionStatus = useCallback((id: string) => {
    setActionPlan((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: item.status === 'Open' ? 'Done' : 'Open' } : item
      )
    );
  }, []);

  const moveAction = useCallback((id: string, direction: 'up' | 'down') => {
    setActionPlan((prev) => {
      const index = prev.findIndex((item) => item.id === id);
      if (index === -1) return prev;
      if (direction === 'up' && index === 0) return prev;
      if (direction === 'down' && index === prev.length - 1) return prev;

      const newArr = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      const [moved] = newArr.splice(index, 1);
      newArr.splice(targetIndex, 0, moved);

      return newArr.map((item, idx) => ({ ...item, rank: idx + 1 }));
    });
  }, []);

  const removeAction = useCallback((id: string) => {
    setActionPlan((prev) => {
      const filtered = prev.filter((item) => item.id !== id);
      return filtered.map((item, idx) => ({ ...item, rank: idx + 1 }));
    });
  }, []);

  // Download Action Plan CSV
  const downloadActionPlanCSV = useCallback(() => {
    if (actionPlan.length === 0) return;

    const headers = ['Rank', 'Action', 'Leak', 'Category', 'Estimated recoverable', 'Status'];
    const rows = actionPlan.map((item) => [
      item.rank,
      item.action,
      item.leakTitle,
      item.category,
      formatINRAmountPlain(item.estimatedRecoverable),
      item.status,
    ]);

    const formatCell = (val: any) => {
      const str = String(val ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvContent =
      '\uFEFF' + // UTF-8 BOM
      [headers.map(formatCell).join(','), ...rows.map((r) => r.map(formatCell).join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const today = new Date().toISOString().split('T')[0];
    link.href = url;
    link.setAttribute('download', `leakfinder-action-plan-${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showSuccess('CSV Downloaded', `Saved as leakfinder-action-plan-${today}.csv`);
  }, [actionPlan, showSuccess]);

  // Simulator calculations
  const simulatorStats = React.useMemo(() => {
    if (!analysisResults) {
      return {
        currentProfit: 0,
        currentDiscount: 0,
        cappedProfit: 0,
        cappedDiscount: 0,
        profitDifference: 0,
      };
    }

    const currentProfit = analysisResults.estimatedProfit;
    const currentDiscount = analysisResults.joinedOrders.reduce((sum, o) => sum + o.discount, 0);

    const capFraction = discountCap / 100;
    let cappedDiscount = 0;
    let recoveredMargin = 0;

    analysisResults.joinedOrders.forEach((o) => {
      const allowedDiscount = o.gross * capFraction;
      if (o.discount > allowedDiscount) {
        const excess = o.discount - allowedDiscount;
        recoveredMargin += excess;
        cappedDiscount += allowedDiscount;
      } else {
        cappedDiscount += o.discount;
      }
    });

    const cappedProfit = currentProfit + recoveredMargin;
    const profitDifference = recoveredMargin;

    return {
      currentProfit,
      currentDiscount,
      cappedProfit,
      cappedDiscount,
      profitDifference,
    };
  }, [analysisResults, discountCap]);

  // Chat message sending
  const sendChatMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || chatLoading) return;

      const userMsg: ChatMessage = {
        id: `usr-${Date.now()}`,
        sender: 'user',
        text: trimmed,
        timestamp: Date.now(),
      };

      setChatMessages((prev) => [...prev, userMsg]);
      setChatLoading(true);

      try {
        const res = await fetch('/api/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: trimmed,
            history: [...chatMessages, userMsg],
            summary: analysisResults,
          }),
        });

        const data = await res.json();
        const assistantMsg: ChatMessage = {
          id: `ast-${Date.now()}`,
          sender: 'assistant',
          text: data.reply || 'I was unable to process that question. Please try again.',
          timestamp: Date.now(),
          isRuleBased: data.isRuleBased,
          modelName: data.modelName,
        };

        setChatMessages((prev) => [...prev, assistantMsg]);
      } catch (err: any) {
        const errorMsg: ChatMessage = {
          id: `ast-${Date.now()}`,
          sender: 'assistant',
          text: 'Network connectivity issue. Please try asking again.',
          timestamp: Date.now(),
          isRuleBased: true,
          modelName: 'Rule-based',
        };
        setChatMessages((prev) => [...prev, errorMsg]);
      } finally {
        setChatLoading(false);
      }
    },
    [chatLoading, chatMessages, analysisResults]
  );

  // Chat attachment handling (supports up to 5 CSVs, each under 5MB)
  const addChatAttachments = useCallback(
    async (fileList: FileList | File[]) => {
      const files = Array.from(fileList).slice(0, 5 - chatAttachments.length);
      const newAttachmentStatuses: FileAttachmentStatus[] = [];

      for (const file of files) {
        if (file.size > 5 * 1024 * 1024) {
          newAttachmentStatuses.push({
            file,
            name: file.name,
            size: file.size,
            detectedDataset: null,
            rowCount: 0,
            status: 'Not recognised',
            error: 'File exceeds 5 MB limit.',
          });
          continue;
        }

        if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
          newAttachmentStatuses.push({
            file,
            name: file.name,
            size: file.size,
            detectedDataset: null,
            rowCount: 0,
            status: 'Not recognised',
            error: 'Not a CSV. In Excel/Sheets, go to File > Save As / Download > Comma-Separated Values (.csv).',
          });
          continue;
        }

        try {
          const text = await file.text();
          const { headers, rows } = parseCSVText(text);
          const { datasetKey, missingColumns, matchedDatasetCandidate } = identifyDataset(headers);

          if (datasetKey) {
            newAttachmentStatuses.push({
              file,
              name: file.name,
              size: file.size,
              detectedDataset: datasetKey,
              rowCount: rows.length,
              status: 'Ready',
              parsedData: rows,
            });
          } else if (matchedDatasetCandidate && missingColumns && missingColumns.length > 0) {
            newAttachmentStatuses.push({
              file,
              name: file.name,
              size: file.size,
              detectedDataset: matchedDatasetCandidate,
              rowCount: rows.length,
              status: 'Missing columns',
              missingColumns,
              error: `Missing columns: ${missingColumns.join(', ')}`,
            });
          } else {
            newAttachmentStatuses.push({
              file,
              name: file.name,
              size: file.size,
              detectedDataset: null,
              rowCount: rows.length,
              status: 'Not recognised',
              error: 'Header columns do not match Sales, Orders, Discounts, Returns, or Costs schema.',
            });
          }
        } catch (err: any) {
          newAttachmentStatuses.push({
            file,
            name: file.name,
            size: file.size,
            detectedDataset: null,
            rowCount: 0,
            status: 'Not recognised',
            error: 'Could not read CSV file.',
          });
        }
      }

      setChatAttachments((prev) => [...prev, ...newAttachmentStatuses]);
    },
    [chatAttachments]
  );

  const removeChatAttachment = useCallback((index: number) => {
    setChatAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  return (
    <AppContext.Provider
      value={{
        currentView,
        setCurrentView,
        selectedLeakId,
        selectLeak,

        rawDatasets,
        hasAllDatasets,
        datasetRowCounts,
        datasetPreviews,
        uploadErrors,

        loadDemoData,
        handleFileUpload,

        qualityChecks,
        isAnalyzing,
        analysisStage,
        runAnalysisPipeline,

        analysisResults,
        categoryFilter,
        setCategoryFilter,

        actionPlan,
        addToActionPlan,
        toggleActionStatus,
        moveAction,
        removeAction,
        downloadActionPlanCSV,

        discountCap,
        setDiscountCap,
        simulatorStats,

        chatOpen,
        setChatOpen,
        chatMessages,
        chatLoading,
        sendChatMessage,
        chatAttachments,
        addChatAttachments,
        removeChatAttachment,

        commandPaletteOpen,
        setCommandPaletteOpen,

        fetchLeakExplanation,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp(): AppContextType {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
