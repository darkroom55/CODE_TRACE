import React, { useState, useEffect } from 'react';
import { VisualizationResult, SubmissionHistoryItem } from './types';
import { UnifiedWorkbench } from './components/UnifiedWorkbench';
import { HistoryGrid } from './components/HistoryGrid';
import { CODE_SAMPLES } from './data/samples';
import { Loader2, Play, RotateCcw, Code2, ChevronDown } from 'lucide-react';

const LANGUAGES = ['Python', 'Java', 'JavaScript', 'TypeScript', 'C++', 'Go', 'Rust'];

const STORAGE_KEY = 'code_trace_submission_history_v1';

export default function App() {
  const [selectedLanguage, setSelectedLanguage] = useState('Python');
  const [code, setCode] = useState('');
  const [initialCode, setInitialCode] = useState('');
  const [patchInput, setPatchInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<VisualizationResult | null>(null);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);

  // Persistent Submission History
  const [history, setHistory] = useState<SubmissionHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (e) {
      console.warn('Failed to persist history to localStorage', e);
    }
  }, [history]);

  const handleLanguageChange = (lang: string) => {
    setSelectedLanguage(lang);
    setPatchInput('');
    setResult(null);
    setActiveHistoryId(null);
    setError('');
  };

  const handleResetCode = () => {
    setCode('');
    setInitialCode('');
    setPatchInput('');
    setResult(null);
    setActiveHistoryId(null);
    setExecutionTime(null);
    setError('');
  };

  const handleSelectSample = (sampleId: string) => {
    const sample = CODE_SAMPLES.find((s) => s.id === sampleId);
    if (sample) {
      setSelectedLanguage(sample.language);
      setCode(sample.code);
      setInitialCode(sample.code);
      setPatchInput('');
      setResult(null);
      setActiveHistoryId(null);
      setError('');
    }
  };

  const handleSelectHistoryItem = (item: SubmissionHistoryItem) => {
    setSelectedLanguage(item.language);
    setCode(item.code);
    setInitialCode(item.code);
    setPatchInput(item.patchInput || '');
    setResult(item.result);
    setExecutionTime(item.executionTimeMs);
    setActiveHistoryId(item.id);
    setError('');
  };

  const handleRevertToInitial = () => {
    setCode(initialCode);
    setPatchInput('');
  };

  const handleSetAsBaseline = () => {
    setInitialCode(code);
  };

  const handleClearHistory = () => {
    setHistory([]);
    setActiveHistoryId(null);
  };

  const handleRemoveHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHistory((prev) => prev.filter((item) => item.id !== id));
    if (activeHistoryId === id) {
      setActiveHistoryId(null);
    }
  };

  const handleRunExecution = async () => {
    const fullCodeToRun = patchInput.trim()
      ? `${code}\n\n# --- Additional Console Patch ---\n${patchInput}`
      : code;

    if (!fullCodeToRun.trim()) {
      setError('Please enter or paste your code to visualize.');
      return;
    }

    setIsLoading(true);
    setError('');
    const startTime = performance.now();

    try {
      const response = await fetch('/api/visualize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: fullCodeToRun, language: selectedLanguage }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.error || 'Failed to simulate execution trace.');
      }

      const data: VisualizationResult = await response.json();
      setResult(data);
      const elapsed = Math.round(performance.now() - startTime);
      setExecutionTime(elapsed);

      // Generate concise title from first non-empty line of code
      const firstLine = code.split('\n').find((l) => l.trim().length > 0)?.trim() || `${selectedLanguage} Code`;
      const title = firstLine.replace(/^(def|function|public|class|fn)\s+/, '').slice(0, 24);

      const historyItem: SubmissionHistoryItem = {
        id: `hist_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        title: title || `${selectedLanguage} snippet`,
        language: selectedLanguage,
        code: code,
        patchInput: patchInput,
        result: data,
        timestamp: Date.now(),
        stepCount: data.trace.length,
        executionTimeMs: elapsed,
      };

      setActiveHistoryId(historyItem.id);
      setHistory((prev) => [historyItem, ...prev.filter((p) => p.code !== code || p.language !== selectedLanguage)].slice(0, 15));
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An unexpected error occurred during simulation.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#E4E3E0] text-[#141414] font-sans selection:bg-[#3B82F6]/30 flex flex-col justify-between">
      
      {/* Top Header */}
      <header className="border-b border-[#141414] bg-white shadow-sm sticky top-0 z-20">
        <div className="w-full px-4 lg:px-6 py-2 flex flex-wrap items-center justify-between gap-3">
          
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#141414] flex items-center justify-center rounded-xs">
              <div className="w-4 h-4 border-2 border-white rotate-45"></div>
            </div>
            <div className="flex items-baseline gap-2">
              <h1 className="font-bold text-lg tracking-tighter text-[#141414]">CODE_TRACE</h1>
              <span className="text-[9px] font-mono opacity-60 px-1.5 py-0.5 border border-[#141414] rounded-full">
                v2.5_TURBO
              </span>
            </div>
          </div>

          {/* Language Selector Bar & Run Button */}
          <div className="flex flex-wrap items-center gap-3">
            
            {/* Language Selector Dropdown */}
            <div className="relative flex items-center">
              <div className="flex items-center gap-1.5 px-3 py-1 bg-white border border-[#141414] shadow-[2px_2px_0px_0px_rgba(20,20,20,1)] text-xs font-bold text-[#141414]">
                <Code2 className="w-3.5 h-3.5 text-[#3B82F6]" />
                <span className="text-[10px] text-gray-500 font-mono uppercase tracking-wider hidden sm:inline">Language:</span>
                <select
                  value={selectedLanguage}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  className="bg-transparent font-bold text-xs uppercase cursor-pointer focus:outline-none pr-1 tracking-wider"
                  title="Select Programming Language"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang} value={lang} className="text-[#141414] bg-white">
                      {lang}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 text-gray-500 pointer-events-none" />
              </div>
            </div>

            {/* Reset / Clear Button */}
            <button
              onClick={handleResetCode}
              disabled={isLoading || (!code && !patchInput && !result)}
              className="px-3 py-1.5 bg-white text-[#141414] text-xs font-bold border border-[#141414] shadow-[2px_2px_0px_0px_rgba(20,20,20,1)] hover:bg-[#F0F0F0] active:translate-x-[1px] active:translate-y-[1px] transition-all disabled:opacity-40 disabled:shadow-none flex items-center gap-1.5 cursor-pointer"
              title="Reset workspace to fresh clean state"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="tracking-wide uppercase text-[10px]">RESET / CLEAR</span>
            </button>

            {/* Run Button */}
            <button
              onClick={handleRunExecution}
              disabled={isLoading}
              className="px-4 py-1.5 bg-[#22C55E] text-white text-xs font-bold border border-[#141414] shadow-[2px_2px_0px_0px_rgba(20,20,20,1)] hover:bg-[#16a34a] active:translate-x-[1px] active:translate-y-[1px] transition-all disabled:opacity-50 disabled:shadow-none flex items-center gap-1.5 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span className="tracking-wide uppercase text-[10px]">ANALYZING...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span className="tracking-wide uppercase text-[10px]">RUN EXECUTION</span>
                </>
              )}
            </button>
          </div>

        </div>

        {/* Quick Sample Presets Sub-bar */}
        <div className="border-t border-[#141414]/15 bg-[#F5F5F3] px-4 lg:px-6 py-1.5">
          <div className="w-full flex items-center gap-2 overflow-x-auto text-[10px]">
            <span className="font-bold uppercase opacity-60 tracking-wider text-[9px] flex-shrink-0">
              Quick Samples:
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleResetCode}
                className="px-2 py-0.5 border border-dashed border-[#141414]/50 bg-white hover:bg-gray-100 text-[#141414] font-mono text-[9px] font-bold whitespace-nowrap rounded-xs transition-colors cursor-pointer flex items-center gap-1"
                title="Start with a blank canvas"
              >
                <span>+ Blank Slate</span>
              </button>
              {CODE_SAMPLES.map((sample) => (
                <button
                  key={sample.id}
                  onClick={() => handleSelectSample(sample.id)}
                  className="px-2 py-0.5 border border-[#141414]/30 bg-white hover:border-[#141414] text-[#141414] font-mono text-[9px] whitespace-nowrap rounded-xs transition-colors cursor-pointer"
                >
                  {sample.name} ({sample.language})
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* History Grid of Past Submissions */}
        <HistoryGrid
          history={history}
          activeId={activeHistoryId}
          onSelectHistoryItem={handleSelectHistoryItem}
          onClearHistory={handleClearHistory}
          onRemoveHistoryItem={handleRemoveHistoryItem}
        />
      </header>

      {/* Main Unified Workbench Area - Maximized Full Screen View */}
      <main className="w-full px-3 lg:px-6 py-3 flex-1 flex flex-col min-h-0">
        <UnifiedWorkbench
          code={code}
          setCode={setCode}
          initialCode={initialCode}
          onRevertToInitial={handleRevertToInitial}
          onSetAsBaseline={handleSetAsBaseline}
          onReset={handleResetCode}
          language={selectedLanguage}
          result={result}
          isExecuting={isLoading}
          onRunExecution={handleRunExecution}
          error={error}
          patchInput={patchInput}
          setPatchInput={setPatchInput}
        />
      </main>

      {/* High Density Status Footer */}
      <footer className="h-9 border-t border-[#141414] bg-white flex items-center justify-between px-6 text-[10px] uppercase tracking-widest font-bold text-[#141414]">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${isLoading ? 'bg-amber-400 animate-ping' : 'bg-[#22C55E]'}`}></span>
            <span>{isLoading ? 'ANALYZING TRACE' : 'SYSTEM READY'}</span>
          </div>
          <div className="hidden sm:flex items-center gap-2 opacity-50">
            ENGINE: GEMINI-2.5-FLASH
          </div>
        </div>
        <div className="flex items-center gap-4 font-mono text-[9px]">
          <span>LANG: {selectedLanguage.toUpperCase()}</span>
          {executionTime !== null && (
            <span className="text-[#059669]">RUNTIME: {executionTime}ms</span>
          )}
          {result && (
            <span className="text-[#3B82F6]">TOTAL STEPS: {result.trace.length}</span>
          )}
        </div>
      </footer>

    </div>
  );
}



