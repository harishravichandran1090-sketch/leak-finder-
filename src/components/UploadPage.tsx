/**
 * Upload & Ingest Page Component
 * Three-step progress: Ingest, Quality, Analyse.
 * Column-based dataset detection, data quality invariants, 5-row preview, demo data loader.
 */

import React, { useRef, useState } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCcw,
  Sparkles,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { DATASET_SCHEMAS } from '../utils/csvParser';
import { DatasetKey } from '../types';

export const UploadPage: React.FC = () => {
  const {
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
  } = useApp();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedPreviewDataset, setSelectedPreviewDataset] = useState<DatasetKey>('sales');

  // Determine Three-Step Progress state
  // Steps: 1. Ingest, 2. Quality, 3. Analyse
  const getStepState = (stepNumber: number): 'pending' | 'active' | 'complete' => {
    if (stepNumber === 1) {
      if (hasAllDatasets) return 'complete';
      return 'active';
    }
    if (stepNumber === 2) {
      if (!hasAllDatasets) return 'pending';
      if (qualityChecks.length > 0) return 'complete';
      return 'active';
    }
    if (stepNumber === 3) {
      if (isAnalyzing) return 'active';
      if (hasAllDatasets && qualityChecks.length > 0) return 'active';
      return 'pending';
    }
    return 'pending';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleFileUpload(e.dataTransfer.files);
    }
  };

  const handleKeyDownDropzone = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await handleFileUpload(e.target.files);
    }
  };

  const datasetsList: DatasetKey[] = ['sales', 'orders', 'discounts', 'returns', 'costs'];

  const stagesList = [
    'Ingest source datasets',
    'Calculate gross & net order metrics',
    'Detect multi-dataset margin leaks',
    'Explain root cause with AI',
    'Build prioritized action plan',
  ];

  return (
    <div className="space-y-6">
      {/* Title & Three-Step Progress Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#334155] pb-5">
        <div>
          <h1 className="font-heading text-[28px] font-semibold text-[#F1F5F9] tracking-tight">
            Data Ingestion & Verification
          </h1>
          <p className="text-[14px] text-[#94A3B8] mt-1">
            Upload your five transactional CSV files or load the seeded demo benchmark.
          </p>
        </div>

        {/* Three-step progress: Ingest, Quality, Analyse */}
        <div className="flex items-center gap-3">
          {[
            { num: 1, name: 'Ingest' },
            { num: 2, name: 'Quality' },
            { num: 3, name: 'Analyse' },
          ].map((step, idx) => {
            const state = getStepState(step.num);
            return (
              <React.Fragment key={step.name}>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-medium transition-colors ${
                      state === 'complete'
                        ? 'bg-[#818CF8] text-[#0F172A] font-bold'
                        : state === 'active'
                        ? 'border border-[#818CF8] text-[#818CF8] bg-[#818CF8]/10'
                        : 'border border-[#334155] text-[#94A3B8] bg-[#1E293B]'
                    }`}
                  >
                    {state === 'complete' ? '✓' : step.num}
                  </div>
                  <span
                    className={`text-[13px] font-medium ${
                      state === 'active' || state === 'complete' ? 'text-[#F1F5F9]' : 'text-[#94A3B8]'
                    }`}
                  >
                    {step.name}
                  </span>
                </div>
                {idx < 2 && <div className="w-6 h-[1px] bg-[#334155]" aria-hidden="true" />}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Main Ingestion Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Dropzone & File Status (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Dropzone */}
          <div
            tabIndex={0}
            role="button"
            aria-label="Upload CSV files: Sales, Orders, Discounts, Returns, and Costs. Press Enter or Space to open file picker."
            onKeyDown={handleKeyDownDropzone}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-[12px] p-8 text-center cursor-pointer transition-all duration-200 focus-visible:outline-2 focus-visible:outline-[#818CF8] ${
              isDragOver
                ? 'border-[#818CF8] bg-[#818CF8]/10'
                : 'border-[#334155] bg-[#1E293B]/70 hover:bg-[#1E293B] hover:border-[#818CF8]/60'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              multiple
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleFileChange}
            />

            <div className="w-12 h-12 rounded-[6px] bg-[#818CF8]/10 border border-[#818CF8]/30 text-[#818CF8] flex items-center justify-center mx-auto mb-4">
              <UploadCloud className="w-6 h-6" />
            </div>

            <p className="text-[16px] font-medium text-[#F1F5F9]">
              Drop your CSV files here, or <span className="text-[#818CF8] underline">browse</span>
            </p>
            <p className="text-[13px] text-[#94A3B8] mt-1.5">
              Recognized automatically by columns, not filenames. Accepts up to 5 CSVs.
            </p>

            {/* Accepted Datasets Chips */}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <span className="text-[12px] text-[#94A3B8] uppercase tracking-wider font-medium mr-1">
                Accepted:
              </span>
              {datasetsList.map((key) => {
                const isUploaded = datasetRowCounts[key] > 0;
                return (
                  <span
                    key={key}
                    className={`text-[12px] px-2.5 py-1 rounded-[6px] font-mono border transition-colors ${
                      isUploaded
                        ? 'border-[#818CF8]/50 bg-[#818CF8]/15 text-[#818CF8] font-semibold'
                        : 'border-[#334155] bg-[#0F172A] text-[#94A3B8]'
                    }`}
                  >
                    {DATASET_SCHEMAS[key].label}
                    {isUploaded && ' ✓'}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Any missing column errors */}
          {Object.keys(uploadErrors).length > 0 && (
            <div className="p-4 rounded-[12px] bg-red-950/30 border border-red-500/50 space-y-2">
              <div className="flex items-center gap-2 text-red-400 text-[14px] font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Upload Warnings</span>
              </div>
              <ul className="text-[13px] text-red-200 space-y-1 list-disc pl-5">
                {Object.entries(uploadErrors).map(([fname, err]) => (
                  <li key={fname}>
                    <strong>{fname}:</strong> {err}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Dataset Status Table */}
          <div className="bg-[#1E293B] border border-[#334155] rounded-[12px] overflow-hidden shadow-md">
            <div className="px-5 py-3.5 border-b border-[#334155] flex items-center justify-between">
              <span className="text-[12px] uppercase tracking-wider font-medium text-[#94A3B8]">
                Dataset Ingest Status
              </span>
              <span className="text-[12px] text-[#94A3B8]">
                {Object.values(datasetRowCounts).filter((c) => c > 0).length} of 5 loaded
              </span>
            </div>

            <div className="divide-y divide-[#334155]">
              {datasetsList.map((key) => {
                const count = datasetRowCounts[key];
                const isSelected = selectedPreviewDataset === key;
                return (
                  <div
                    key={key}
                    onClick={() => count > 0 && setSelectedPreviewDataset(key)}
                    className={`px-5 py-3 flex items-center justify-between cursor-pointer transition-colors ${
                      isSelected && count > 0
                        ? 'bg-[#26344A]'
                        : 'hover:bg-[#26344A]/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet
                        className={`w-5 h-5 ${count > 0 ? 'text-[#818CF8]' : 'text-[#94A3B8]'}`}
                      />
                      <div>
                        <p className="text-[14px] font-medium text-[#F1F5F9]">
                          {DATASET_SCHEMAS[key].label}
                        </p>
                        <p className="text-[12px] text-[#94A3B8] font-mono">
                          {DATASET_SCHEMAS[key].requiredColumns.join(', ')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {count > 0 ? (
                        <span className="text-[12px] font-mono text-[#818CF8] bg-[#818CF8]/10 border border-[#818CF8]/30 px-2 py-0.5 rounded-[6px]">
                          Uploaded ({count} rows)
                        </span>
                      ) : (
                        <span className="text-[12px] text-[#94A3B8] bg-[#0F172A] border border-[#334155] px-2 py-0.5 rounded-[6px]">
                          Not uploaded
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Button Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              onClick={loadDemoData}
              className="w-full sm:w-auto px-5 py-2.5 bg-transparent hover:bg-[#1E293B] border border-[#334155] hover:border-[#818CF8]/50 text-[#F1F5F9] text-[14px] font-medium rounded-[6px] transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-[#818CF8]" />
              <span>Load demo data</span>
            </button>

            <button
              onClick={runAnalysisPipeline}
              disabled={!hasAllDatasets || isAnalyzing}
              className={`w-full sm:w-auto flex-1 px-6 py-2.5 text-[14px] font-semibold rounded-[6px] transition-all flex items-center justify-center gap-2 cursor-pointer ${
                hasAllDatasets && !isAnalyzing
                  ? 'bg-[#818CF8] hover:bg-[#818CF8]/90 text-[#0F172A] shadow-md shadow-[#818CF8]/20'
                  : 'bg-[#334155]/60 text-[#94A3B8] cursor-not-allowed border border-[#334155]'
              }`}
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{isAnalyzing ? 'Running Analysis...' : 'Run analysis'}</span>
            </button>
          </div>
        </div>

        {/* Right Column: Data Quality Checks & Row Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Data Quality Checks Panel */}
          <div className="bg-[#1E293B] border border-[#334155] rounded-[12px] p-5 shadow-md">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#334155]">
              <span className="text-[12px] uppercase tracking-wider font-medium text-[#94A3B8]">
                Data Quality Checks
              </span>
              <span className="text-[12px] text-[#94A3B8]">
                {qualityChecks.length > 0 ? `${qualityChecks.filter(c => c.status === 'PASS').length}/6 passed` : 'Pending data'}
              </span>
            </div>

            {qualityChecks.length === 0 ? (
              <p className="text-[13px] text-[#94A3B8] italic py-4 text-center">
                Upload all 5 files or click "Load demo data" to run automated data-quality verification.
              </p>
            ) : (
              <div className="space-y-3">
                {qualityChecks.map((qc) => {
                  const isPass = qc.status === 'PASS';
                  return (
                    <div
                      key={qc.id}
                      className="p-3 rounded-[6px] bg-[#0F172A]/70 border border-[#334155] flex items-start gap-3"
                    >
                      {/* Badge: Amber #B45309 used ONLY for CHECK badges */}
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-[4px] shrink-0 uppercase tracking-wider font-mono flex items-center gap-1 ${
                          isPass
                            ? 'bg-[#818CF8]/15 text-[#818CF8] border border-[#818CF8]/30'
                            : 'bg-[#B45309]/20 text-[#B45309] border border-[#B45309]'
                        }`}
                      >
                        {isPass ? 'PASS' : 'CHECK'}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-[#F1F5F9]">{qc.name}</p>
                        <p className="text-[12px] text-[#94A3B8] mt-0.5 leading-snug">{qc.detail}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* First 5 Rows Preview */}
          <div className="bg-[#1E293B] border border-[#334155] rounded-[12px] p-5 shadow-md">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#334155]">
              <span className="text-[12px] uppercase tracking-wider font-medium text-[#94A3B8]">
                Preview: {DATASET_SCHEMAS[selectedPreviewDataset]?.label || 'Dataset'} (First 5 Rows)
              </span>
              <span className="text-[11px] text-[#94A3B8] font-mono">
                {datasetRowCounts[selectedPreviewDataset]} total
              </span>
            </div>

            {datasetPreviews[selectedPreviewDataset]?.length > 0 ? (
              <div className="overflow-x-auto max-h-60 overflow-y-auto">
                <table className="w-full text-left text-[12px] border-collapse">
                  <thead>
                    <tr className="border-b border-[#334155] text-[#94A3B8]">
                      {Object.keys(datasetPreviews[selectedPreviewDataset][0]).map((col) => (
                        <th key={col} className="p-2 font-medium font-mono uppercase text-[11px] tracking-wider whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#334155]/60 text-[#F1F5F9]">
                    {datasetPreviews[selectedPreviewDataset].map((row, idx) => (
                      <tr key={idx} className="hover:bg-[#26344A]">
                        {Object.values(row).map((val: any, cidx) => (
                          <td key={cidx} className="p-2 whitespace-nowrap font-mono tabular-nums">
                            {String(val)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-[13px] text-[#94A3B8] italic py-6 text-center">
                No records to preview. Upload {DATASET_SCHEMAS[selectedPreviewDataset].label} to inspect rows.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Progressive Analysis Pipeline Modal / Overlay */}
      {isAnalyzing && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="analysis-dialog-title"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-[#1E293B] border border-[#334155] rounded-[12px] p-6 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-[#818CF8] border-t-transparent animate-spin" />
              <div>
                <h3 id="analysis-dialog-title" className="font-heading text-[18px] text-[#F1F5F9]">
                  Executing LeakFinder Engine
                </h3>
                <p className="text-[12px] text-[#94A3B8]">Reconciling multi-source commerce data</p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              {stagesList.map((stage, idx) => {
                const stageNum = idx + 1;
                const isDone = analysisStage > stageNum;
                const isCurrent = analysisStage === stageNum;

                return (
                  <div
                    key={stage}
                    className={`flex items-center gap-3 text-[13px] p-2 rounded-[6px] transition-colors ${
                      isDone
                        ? 'text-[#F1F5F9] bg-[#0F172A]'
                        : isCurrent
                        ? 'text-[#818CF8] bg-[#818CF8]/10 font-medium'
                        : 'text-[#94A3B8]/60'
                    }`}
                  >
                    <div className="w-5 h-5 flex items-center justify-center shrink-0">
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4 text-[#818CF8]" />
                      ) : isCurrent ? (
                        <div className="w-2.5 h-2.5 rounded-full bg-[#818CF8] animate-pulse" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-[#334155]" />
                      )}
                    </div>
                    <span>{stage}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
