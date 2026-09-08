"use client";

import React, { useState, useRef } from "react";
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  Download,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface BulkCsvUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface UploadResult {
  totalRows: number;
  processed: number;
  inserted: number;
  duplicatesSkipped: number;
  errors: { row: number; report_text?: string; error: string }[];
}

export function BulkCsvUploadModal({
  isOpen,
  onClose,
  onSuccess,
}: BulkCsvUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [csvContent, setCsvContent] = useState<string>("");
  const [previewInfo, setPreviewInfo] = useState<{
    rowCount: number;
    headers: string[];
    hasReportText: boolean;
  } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const resetState = () => {
    setFile(null);
    setCsvContent("");
    setPreviewInfo(null);
    setIsUploading(false);
    setUploadResult(null);
    setErrorMsg(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileSelect = (selectedFile: File) => {
    if (!selectedFile.name.toLowerCase().endsWith(".csv")) {
      setErrorMsg("Please select a valid .csv file.");
      return;
    }

    setErrorMsg(null);
    setUploadResult(null);
    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) || "";
      setCsvContent(text);

      // Inspect lines
      const clean = text.replace(/^\uFEFF/, "");
      const lines = clean
        .split(/\r?\n/)
        .filter((l) => l.trim().length > 0 && !l.trim().startsWith("#"));

      if (lines.length === 0) {
        setErrorMsg("CSV file appears to be empty or contains only comments.");
        setPreviewInfo(null);
        return;
      }

      const headers = lines[0]
        .split(",")
        .map((h) => h.replace(/^["']|["']$/g, "").trim().toLowerCase());

      const hasReportText = headers.some((h) =>
        ["report_text", "text", "observation", "hazard", "description"].includes(
          h.replace(/[\s_-]+/g, "_")
        )
      );

      const rowCount = Math.max(0, lines.length - 1);
      setPreviewInfo({ rowCount, headers, hasReportText });

      if (!hasReportText) {
        setErrorMsg(
          "CSV missing required observation column (expected 'report_text', 'observation', or 'text')."
        );
      }
    };
    reader.onerror = () => {
      setErrorMsg("Failed to read selected file.");
    };
    reader.readAsText(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!csvContent || isUploading) return;
    setIsUploading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/analyze/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvContent }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Bulk ingestion failed.");
      }

      setUploadResult({
        totalRows: json.totalRows ?? 0,
        processed: json.processed ?? 0,
        inserted: json.inserted ?? 0,
        duplicatesSkipped: json.duplicatesSkipped ?? 0,
        errors: Array.isArray(json.errors) ? json.errors : [],
      });

      // Notify parent to refresh board data
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unexpected upload error";
      setErrorMsg(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadSample = () => {
    window.open("/api/sample-data", "_blank");
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden flex flex-col font-sans"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/80 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
                <Upload size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-900 leading-none">
                  Bulk CSV Safety Observation Ingestion
                </h3>
                <p className="text-[11px] text-neutral-500 mt-1">
                  Batch analyze field reports, identify SIF precursors, and dispatch to To Do
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                resetState();
                onClose();
              }}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-800 hover:bg-neutral-200/60 transition-colors"
              aria-label="Close dialog"
            >
              <X size={18} />
            </button>
          </div>

          {/* Mandatory Demo Disclaimer Banner */}
          <div className="px-6 py-2 bg-amber-50/80 border-b border-amber-200/80 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-900">
              <AlertTriangle size={13} className="text-amber-700 shrink-0" />
              <span>Illustrative Demo Data — Not Actual OIL Operational Data</span>
            </div>
            <button
              type="button"
              onClick={handleDownloadSample}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:text-blue-900 underline shrink-0"
              title="Download standardized demo dataset"
            >
              <Download size={12} /> Download Sample Demo Dataset
            </button>
          </div>

          {/* Body Content */}
          <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                <AlertCircle size={15} className="text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium">{errorMsg}</div>
              </div>
            )}

            {/* Ingestion Results State */}
            {uploadResult ? (
              <div className="space-y-4 py-2">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                    <CheckCircle2 size={18} className="text-emerald-600" />
                    <span>Batch Ingestion Completed Successfully</span>
                  </div>
                  <p className="text-xs text-emerald-800">
                    All valid records have been analyzed, classified by safety barrier & SIF precursor potential, and added to the To Do column.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                    <span className="text-[10px] font-bold uppercase text-neutral-400 block">Total Rows</span>
                    <span className="text-xl font-extrabold text-neutral-900">{uploadResult.totalRows}</span>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                    <span className="text-[10px] font-bold uppercase text-emerald-700 block">Ingested & Stored</span>
                    <span className="text-xl font-extrabold text-emerald-700">{uploadResult.inserted}</span>
                  </div>
                  <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                    <span className="text-[10px] font-bold uppercase text-neutral-500 block">Duplicates Skipped</span>
                    <span className="text-xl font-extrabold text-neutral-700">{uploadResult.duplicatesSkipped}</span>
                  </div>
                </div>

                {uploadResult.errors.length > 0 && (
                  <div className="space-y-1.5 pt-2">
                    <span className="text-xs font-bold text-amber-800 block">
                      Skipped / Invalid Rows ({uploadResult.errors.length}):
                    </span>
                    <div className="max-h-32 overflow-y-auto bg-neutral-50 rounded-lg p-2.5 border border-neutral-200 text-xs space-y-1">
                      {uploadResult.errors.map((err, idx) => (
                        <div key={idx} className="text-neutral-700 font-mono text-[11px]">
                          Row {err.row}: {err.error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Dropzone / Upload Form State */
              <div className="space-y-4">
                {/* Drag and drop area */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                    isDragOver
                      ? "border-blue-500 bg-blue-50/50"
                      : "border-neutral-300 hover:border-neutral-400 bg-neutral-50/50"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileSelect(e.target.files[0]);
                      }
                    }}
                  />
                  <div className="w-12 h-12 rounded-2xl bg-white shadow-2xs border border-neutral-200 flex items-center justify-center text-neutral-600 mb-3">
                    <FileText size={22} className="text-blue-600" />
                  </div>
                  <span className="text-sm font-bold text-neutral-800">
                    {file ? file.name : "Click to browse or drag and drop CSV file"}
                  </span>
                  <span className="text-xs text-neutral-500 mt-1">
                    Standard format: report_text, location, activity, equipment, date (50–100 rows supported)
                  </span>
                </div>

                {/* Preview Details */}
                {previewInfo && (
                  <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-neutral-700">File Validation Summary</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {previewInfo.rowCount} Data Rows Found
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-neutral-500">Headers:</span>
                      {previewInfo.headers.map((h, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded bg-white text-neutral-700 border border-neutral-200 font-mono text-[10px]"
                        >
                          {h}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between shrink-0">
            <div className="text-[11px] text-neutral-500">
              {uploadResult ? "Records synchronized with MongoDB Atlas" : "Safe duplicate protection active"}
            </div>

            <div className="flex items-center gap-2">
              {uploadResult ? (
                <>
                  <button
                    type="button"
                    onClick={resetState}
                    className="px-3.5 py-1.5 text-xs font-semibold text-neutral-700 hover:text-neutral-900 bg-white border border-neutral-300 rounded-lg transition-colors shadow-2xs"
                  >
                    Import Another
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      resetState();
                      onClose();
                    }}
                    className="px-4 py-1.5 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors shadow-sm"
                  >
                    Done & View Board
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      resetState();
                      onClose();
                    }}
                    className="px-3.5 py-1.5 text-xs font-semibold text-neutral-700 hover:text-neutral-900 bg-white border border-neutral-300 rounded-lg transition-colors shadow-2xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleUpload}
                    disabled={!file || !previewInfo?.hasReportText || isUploading}
                    className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors shadow-sm inline-flex items-center gap-1.5"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        <span>Processing {previewInfo?.rowCount || ""} Records...</span>
                      </>
                    ) : (
                      <>
                        <Upload size={13} />
                        <span>Analyze & Ingest CSV</span>
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
