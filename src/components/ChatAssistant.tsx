/**
 * Chat Assistant Component
 * Fixed 56px trigger button in bottom-right opening 380px panel (full-width on mobile).
 * Features:
 * - Dynamic greetings & suggestion chips
 * - Up to 5 CSV attachments with client-side parser & validation
 * - Accessible log with role="log" and aria-live="polite"
 * - Plain text answers, typing dots, model/rule-based labels
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  X,
  Send,
  Paperclip,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Play,
  RotateCcw,
  Sparkles,
  Shield,
  HelpCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const ChatAssistant: React.FC = () => {
  const {
    chatOpen,
    setChatOpen,
    chatMessages,
    chatLoading,
    sendChatMessage,
    chatAttachments,
    addChatAttachments,
    removeChatAttachment,
    runAnalysisPipeline,
    hasAllDatasets,
    isAnalyzing,
  } = useApp();

  const [inputVal, setInputVal] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const suggestionChips = [
    'Where is the biggest money leak?',
    'Which SKU needs a price review?',
    'What would a 10% discount cap save?',
    'How do I upload my files?',
    'What does Potential Leakage mean?',
    'How do I download my action plan?',
  ];

  // Auto scroll to bottom
  useEffect(() => {
    if (chatOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, chatLoading, chatOpen]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && chatOpen) {
        setChatOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [chatOpen, setChatOpen]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputVal.trim() || chatLoading) return;
    const text = inputVal;
    setInputVal('');
    await sendChatMessage(text);
  };

  const handleChipClick = async (chip: string) => {
    await sendChatMessage(chip);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await addChatAttachments(e.target.files);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await addChatAttachments(e.dataTransfer.files);
    }
  };

  // Check if all 5 attachments are ready
  const readyAttachmentCount = chatAttachments.filter((a) => a.status === 'Ready').length;
  const canRunFromAttachments = readyAttachmentCount >= 5;

  return (
    <>
      {/* Fixed 56px Trigger Button */}
      <button
        onClick={() => setChatOpen(!chatOpen)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-[#818CF8] hover:bg-[#818CF8]/90 text-[#0F172A] shadow-xl shadow-[#818CF8]/25 flex items-center justify-center transition-all duration-200 cursor-pointer focus-visible:outline-[#818CF8]"
        aria-label={chatOpen ? 'Close LeakFinder Assistant' : 'Open LeakFinder Assistant'}
      >
        {chatOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
      </button>

      {/* Slide-out Drawer Panel: 380px wide (full width on phones) */}
      {chatOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="assistant-dialog-title"
          className="fixed bottom-24 right-4 sm:right-6 z-40 w-[calc(100vw-32px)] sm:w-[380px] h-[580px] max-h-[calc(100vh-120px)] bg-[#1E293B] border border-[#334155] rounded-[12px] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
        >
          {/* Header */}
          <div className="p-4 border-b border-[#334155] bg-[#0F172A] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-[6px] bg-[#818CF8]/15 border border-[#818CF8]/30 flex items-center justify-center text-[#818CF8]">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <h3 id="assistant-dialog-title" className="font-heading text-[16px] font-semibold text-[#F1F5F9] leading-tight">
                  LeakFinder Assistant
                </h3>
                <p className="text-[11px] text-[#94A3B8]">Financial intelligence helper</p>
              </div>
            </div>

            <button
              onClick={() => setChatOpen(false)}
              className="text-[#94A3B8] hover:text-[#F1F5F9] p-1.5 rounded-[6px] hover:bg-[#1E293B] transition-colors"
              aria-label="Close assistant"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Session Privacy Banner */}
          <div className="px-3.5 py-1.5 bg-[#0F172A]/80 border-b border-[#334155] text-[11px] text-[#94A3B8] flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-[#818CF8] shrink-0" />
            <span className="truncate">Files stay in browser session and are not stored on server.</span>
          </div>

          {/* Messages List */}
          <div
            role="log"
            aria-live="polite"
            className="flex-1 p-4 overflow-y-auto space-y-4 text-[13px]"
          >
            {chatMessages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] p-3 rounded-[8px] leading-relaxed select-text ${
                      isUser
                        ? 'bg-[#818CF8] text-[#0F172A] font-medium'
                        : 'bg-[#0F172A] border border-[#334155] text-[#F1F5F9]'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  </div>

                  {!isUser && msg.modelName && (
                    <span className="text-[10px] text-[#94A3B8] font-mono mt-1 px-1">
                      {msg.modelName}
                    </span>
                  )}
                </div>
              );
            })}

            {/* Typing Dots */}
            {chatLoading && (
              <div className="flex items-center gap-1.5 p-3 rounded-[8px] bg-[#0F172A] border border-[#334155] w-20">
                <div className="w-1.5 h-1.5 rounded-full bg-[#818CF8] animate-bounce" />
                <div className="w-1.5 h-1.5 rounded-full bg-[#818CF8] animate-bounce [animation-delay:0.2s]" />
                <div className="w-1.5 h-1.5 rounded-full bg-[#818CF8] animate-bounce [animation-delay:0.4s]" />
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Attachment Preview Cards (if files added) */}
          {chatAttachments.length > 0 && (
            <div className="px-3.5 py-2 border-t border-[#334155] bg-[#0F172A]/90 max-h-32 overflow-y-auto space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-[#94A3B8]">
                <span>Attached Datasets ({chatAttachments.length}/5):</span>
                {canRunFromAttachments && (
                  <button
                    onClick={runAnalysisPipeline}
                    disabled={isAnalyzing}
                    className="text-[#818CF8] hover:underline font-semibold flex items-center gap-1"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Run analysis</span>
                  </button>
                )}
              </div>

              {chatAttachments.map((att, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-2 p-1.5 rounded bg-[#1E293B] border border-[#334155] text-[11px]"
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-[#818CF8] shrink-0" />
                    <span className="font-medium text-[#F1F5F9] truncate">{att.name}</span>
                    <span className="text-[#94A3B8] font-mono">
                      {att.status === 'Ready'
                        ? `(${att.detectedDataset}, ${att.rowCount}r)`
                        : `(${att.status})`}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {att.status === 'Ready' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#818CF8]" />
                    ) : (
                      <span title={att.error}>
                        <AlertCircle className="w-3.5 h-3.5 text-[#B45309]" />
                      </span>
                    )}
                    <button
                      onClick={() => removeChatAttachment(idx)}
                      className="text-[#94A3B8] hover:text-[#F1F5F9] p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Suggestion Chips */}
          <div className="px-3.5 py-2 border-t border-[#334155] bg-[#0F172A] overflow-x-auto flex gap-1.5 scrollbar-none">
            {suggestionChips.map((chip) => (
              <button
                key={chip}
                onClick={() => handleChipClick(chip)}
                className="whitespace-nowrap text-[11px] text-[#94A3B8] hover:text-[#F1F5F9] bg-[#1E293B] hover:bg-[#26344A] border border-[#334155] px-2.5 py-1 rounded-[6px] transition-colors cursor-pointer"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Drag & Drop Feedback Overlay */}
          {isDragOver && (
            <div className="absolute inset-0 bg-[#0F172A]/90 border-2 border-dashed border-[#818CF8] rounded-[12px] flex flex-col items-center justify-center p-6 text-center z-50">
              <FileSpreadsheet className="w-8 h-8 text-[#818CF8] mb-2" />
              <p className="text-[14px] font-semibold text-[#F1F5F9]">Drop CSV files to attach</p>
              <p className="text-[12px] text-[#94A3B8] mt-1">Accepts up to 5 CSV files under 5 MB</p>
            </div>
          )}

          {/* Chat Input Form */}
          <form
            onSubmit={handleSend}
            className="p-3 border-t border-[#334155] bg-[#0F172A] flex items-center gap-2"
          >
            <input
              type="file"
              ref={fileInputRef}
              multiple
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleFileChange}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#1E293B] rounded-[6px] transition-colors shrink-0"
              aria-label="Attach CSV files (up to 5, max 5 MB each)"
              title="Attach CSV files"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            <input
              type="text"
              aria-label="Ask about your data"
              placeholder="Ask about your data..."
              maxLength={500}
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              className="flex-1 bg-[#1E293B] border border-[#334155] text-[#F1F5F9] placeholder-[#94A3B8] text-[13px] px-3 py-2 rounded-[6px] focus-visible:outline-[#818CF8]"
            />

            <button
              type="submit"
              disabled={!inputVal.trim() || chatLoading}
              className={`p-2 rounded-[6px] transition-colors shrink-0 ${
                inputVal.trim() && !chatLoading
                  ? 'bg-[#818CF8] text-[#0F172A] hover:bg-[#818CF8]/90'
                  : 'bg-[#1E293B] text-[#94A3B8] cursor-not-allowed border border-[#334155]'
              }`}
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
