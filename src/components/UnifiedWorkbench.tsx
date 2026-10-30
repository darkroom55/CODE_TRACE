import React from 'react';
import { VisualizationResult } from '../types';
import { WatchedVariablesPanel } from './WatchedVariablesPanel';
import { VSCodeEditor } from './VSCodeEditor';
import { CodeDiffView } from './CodeDiffView';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  ChevronRight,
  Eye,
  Edit3,
  GitCompare,
  Pin,
  ListFilter,
  Layers,
  Sparkles,
  Sliders,
  RotateCcw,
  CornerDownLeft,
  Trash2,
} from 'lucide-react';

interface UnifiedWorkbenchProps {
  code: string;
  setCode: (code: string) => void;
  initialCode: string;
  onRevertToInitial?: () => void;
  onSetAsBaseline?: () => void;
  onReset?: () => void;
  language: string;
  result: VisualizationResult | null;
  isExecuting: boolean;
  onRunExecution: () => void;
  error: string;
  patchInput: string;
  setPatchInput: (patch: string) => void;
}

export function UnifiedWorkbench({
  code,
  setCode,
  initialCode,
  onRevertToInitial,
  onSetAsBaseline,
  onReset,
  language,
  result,
  isExecuting,
  onRunExecution,
  error,
  patchInput,
  setPatchInput,
}: UnifiedWorkbenchProps) {
  const [currentStepIndex, setCurrentStepIndex] = React.useState(0);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [playbackSpeed, setPlaybackSpeed] = React.useState<number>(1000); // 1s
  const [leftViewMode, setLeftViewMode] = React.useState<'editor' | 'trace' | 'diff'>('editor');
  const [diffTarget, setDiffTarget] = React.useState<'code_only' | 'with_patch'>('code_only');
  const [activeRightTab, setActiveRightTab] = React.useState<'table' | 'watched' | 'stack'>('table');
  const [watchedVarNames, setWatchedVarNames] = React.useState<string[]>([]);

  // When a new result arrives, reset step index and open trace view
  React.useEffect(() => {
    if (result && result.trace.length > 0) {
      setCurrentStepIndex(0);
      setLeftViewMode('trace');
    }
  }, [result]);

  // If no result yet and currently on trace, switch back to editor
  React.useEffect(() => {
    if (!result && leftViewMode === 'trace') {
      setLeftViewMode('editor');
    }
  }, [result, leftViewMode]);

  // Check if current code differs from initialCode
  const hasCodeChanges = code !== initialCode;
  const hasPatch = patchInput.trim().length > 0;
  const combinedCode = hasPatch
    ? `${code}\n\n# --- Additional Console Patch ---\n${patchInput}`
    : code;

  // Auto-play timer
  React.useEffect(() => {
    let interval: number | undefined;
    if (isPlaying && result && result.trace.length > 0) {
      interval = window.setInterval(() => {
        setCurrentStepIndex((prev) => {
          if (prev >= result.trace.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, playbackSpeed);
    }
    return () => clearInterval(interval);
  }, [isPlaying, result, playbackSpeed]);

  const activeTrace = result?.trace || [];
  const currentStep = activeTrace[currentStepIndex];

  // Discover all unique variables across all steps in the trace
  const allDiscoveredVariables = React.useMemo(() => {
    if (!result?.trace) return [];
    const map = new Map<
      string,
      { type: string; steps: { stepNumber: number; value: string; lineNumber: number }[] }
    >();
    result.trace.forEach((step) => {
      step.variables.forEach((v) => {
        if (!map.has(v.name)) {
          map.set(v.name, { type: v.type, steps: [] });
        }
        map.get(v.name)!.steps.push({
          stepNumber: step.stepNumber,
          value: v.value,
          lineNumber: step.lineNumber,
        });
      });
    });
    return Array.from(map.entries()).map(([name, data]) => ({ name, ...data }));
  }, [result]);

  // Auto-seed watched variables with the most active variables when result loads
  React.useEffect(() => {
    if (result && result.trace.length > 0 && allDiscoveredVariables.length > 0) {
      const sorted = [...allDiscoveredVariables].sort((a, b) => b.steps.length - a.steps.length);
      const topVars = sorted.slice(0, 2).map((v) => v.name);
      setWatchedVarNames((prev) => (prev.length === 0 ? topVars : prev));
    }
  }, [result, allDiscoveredVariables]);

  const handleToggleWatch = (varName: string) => {
    setWatchedVarNames((prev) =>
      prev.includes(varName) ? prev.filter((v) => v !== varName) : [...prev, varName]
    );
  };

  const handleAddCustomWatch = (varName: string) => {
    if (!watchedVarNames.includes(varName)) {
      setWatchedVarNames((prev) => [...prev, varName]);
    }
  };

  const handleRemoveWatch = (varName: string) => {
    setWatchedVarNames((prev) => prev.filter((v) => v !== varName));
  };

  // Determine which variables changed in the current step compared to previous
  const prevStep = currentStepIndex > 0 ? activeTrace[currentStepIndex - 1] : null;
  const changedVarNames = React.useMemo(() => {
    if (!currentStep) return new Set<string>();
    if (!prevStep) return new Set(currentStep.variables.map((v) => v.name));
    const set = new Set<string>();
    const prevMap = new Map(prevStep.variables.map((v) => [v.name, v.value]));
    for (const v of currentStep.variables) {
      if (!prevMap.has(v.name) || prevMap.get(v.name) !== v.value) {
        set.add(v.name);
      }
    }
    return set;
  }, [currentStep, prevStep]);

  // Merge patch into main code editor
  const handleMergePatch = () => {
    if (patchInput.trim()) {
      setCode(`${code}\n\n${patchInput.trim()}`);
      setPatchInput('');
    }
  };

  // File extension mapping for aesthetics
  const getFileExtension = (lang: string) => {
    switch (lang.toLowerCase()) {
      case 'python':
        return 'main.py';
      case 'java':
        return 'Main.java';
      case 'c++':
        return 'main.cpp';
      case 'javascript':
        return 'index.js';
      case 'typescript':
        return 'index.ts';
      case 'go':
        return 'main.go';
      case 'rust':
        return 'main.rs';
      default:
        return 'code.txt';
    }
  };

  const totalSteps = activeTrace.length;
  const progressPercent = totalSteps > 1 ? (currentStepIndex / (totalSteps - 1)) * 100 : 0;

  return (
    <div className="flex flex-col lg:flex-row flex-1 border border-[#141414] bg-white shadow-[4px_4px_0px_0px_rgba(20,20,20,0.1)] min-h-[700px] w-full">
      {/* LEFT SECTION: SOURCE EDITOR, DIFF VIEW, & STEP EXECUTION (50% EQUAL SPLIT) */}
      <section className="w-full lg:w-1/2 flex flex-col border-b lg:border-b-0 lg:border-r border-[#141414] bg-[#FDFDFD]">
        {/* Card Header with View Mode Switcher Tabs */}
        <div className="flex flex-wrap items-center justify-between px-3 py-2 border-b border-[#141414] bg-[#F5F5F3] gap-2">
          {/* Mode Switcher Tabs */}
          <div className="flex items-center border border-[#141414] rounded-xs overflow-hidden bg-white shadow-xs">
            {/* Editor Tab */}
            <button
              onClick={() => setLeftViewMode('editor')}
              className={`flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                leftViewMode === 'editor'
                  ? 'bg-[#141414] text-white'
                  : 'text-[#141414] hover:bg-[#F0F0F0]'
              }`}
            >
              <Edit3 className="w-3 h-3" />
              <span>Editor</span>
            </button>

            {/* Trace Tab (Available when result exists) */}
            {result && (
              <button
                onClick={() => setLeftViewMode('trace')}
                className={`flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer border-l border-[#141414] ${
                  leftViewMode === 'trace'
                    ? 'bg-[#3B82F6] text-white'
                    : 'text-[#141414] hover:bg-[#F0F0F0]'
                }`}
              >
                <Eye className="w-3 h-3" />
                <span>Trace</span>
                <span className="text-[9px] px-1 bg-black/20 rounded-xs">
                  {currentStepIndex + 1}/{activeTrace.length}
                </span>
              </button>
            )}

            {/* Diff Comparison Tab */}
            <button
              onClick={() => setLeftViewMode('diff')}
              className={`flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer border-l border-[#141414] ${
                leftViewMode === 'diff'
                  ? 'bg-[#7C3AED] text-white'
                  : 'text-[#141414] hover:bg-[#F0F0F0]'
              }`}
              title="Compare current code with initial baseline version"
            >
              <GitCompare className="w-3 h-3" />
              <span>Diff View</span>
              {(hasCodeChanges || hasPatch) && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] animate-pulse"></span>
              )}
            </button>
          </div>

          {/* Right Header Badges / File info */}
          <div className="flex items-center gap-2">
            {leftViewMode === 'diff' && hasPatch && (
              <div className="flex items-center border border-[#141414]/30 rounded-xs bg-white text-[9px] font-mono overflow-hidden">
                <button
                  onClick={() => setDiffTarget('code_only')}
                  className={`px-1.5 py-0.5 font-bold cursor-pointer ${
                    diffTarget === 'code_only' ? 'bg-[#141414] text-white' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Code
                </button>
                <button
                  onClick={() => setDiffTarget('with_patch')}
                  className={`px-1.5 py-0.5 font-bold cursor-pointer border-l border-[#141414]/30 ${
                    diffTarget === 'with_patch' ? 'bg-[#141414] text-white' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  +Patch
                </button>
              </div>
            )}

            {onReset && (code.trim().length > 0 || patchInput.trim().length > 0 || result) && (
              <button
                onClick={onReset}
                className="flex items-center gap-1 px-2 py-0.5 border border-[#141414]/30 hover:border-red-600 bg-white hover:bg-red-50 text-gray-600 hover:text-red-600 text-[9px] font-bold rounded-xs transition-colors cursor-pointer"
                title="Reset editor & clear code"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                <span>Reset / Clear</span>
              </button>
            )}

            <span className="text-[10px] font-mono text-[#3B82F6] font-bold">
              {getFileExtension(language)}
            </span>
          </div>
        </div>

        {/* Dynamic Code / Trace / Diff Viewport */}
        <div className="flex-1 flex overflow-hidden relative min-h-[420px]">
          {leftViewMode === 'diff' ? (
            <CodeDiffView
              initialCode={initialCode}
              currentCode={diffTarget === 'with_patch' && hasPatch ? combinedCode : code}
              language={language}
              onRevertToInitial={onRevertToInitial}
              onSetAsBaseline={onSetAsBaseline}
            />
          ) : (
            <VSCodeEditor
              code={code}
              onChangeCode={setCode}
              language={language}
              isEditing={leftViewMode === 'editor'}
              currentStep={currentStep}
              changedVariables={changedVarNames}
            />
          )}
        </div>

        {/* Input Console / Missing Parts Patch Area */}
        <div className="border-t border-[#141414] bg-[#F5F5F3] p-3">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <label className="text-[9px] font-bold uppercase tracking-widest text-[#141414] opacity-80 flex items-center gap-1">
                <span>Input Console / Patch Missing Parts</span>
              </label>
              {hasPatch && (
                <span className="text-[8px] font-mono px-1 py-0.2 bg-amber-100 text-amber-900 border border-amber-300 font-bold rounded-xs">
                  Active Patch
                </span>
              )}
            </div>

            {/* Quick Actions for Patch */}
            <div className="flex items-center gap-1.5">
              {hasPatch && (
                <>
                  <button
                    onClick={() => {
                      setDiffTarget('with_patch');
                      setLeftViewMode('diff');
                    }}
                    className="flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold text-[#7C3AED] bg-purple-50 hover:bg-purple-100 border border-purple-300 rounded-xs cursor-pointer"
                    title="View diff of code with this patch applied"
                  >
                    <GitCompare className="w-2.5 h-2.5" />
                    <span>View Diff</span>
                  </button>

                  <button
                    onClick={handleMergePatch}
                    className="flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold text-[#059669] bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xs cursor-pointer"
                    title="Merge patch into source code editor"
                  >
                    <CornerDownLeft className="w-2.5 h-2.5" />
                    <span>Merge to Code</span>
                  </button>

                  <button
                    onClick={() => setPatchInput('')}
                    className="p-0.5 text-gray-500 hover:text-red-600 cursor-pointer"
                    title="Clear patch"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </>
              )}
              {!hasPatch && (
                <span className="text-[9px] font-mono opacity-50">
                  Auto-completed if incomplete
                </span>
              )}
            </div>
          </div>

          <textarea
            value={patchInput}
            onChange={(e) => setPatchInput(e.target.value)}
            placeholder="Optional: Paste missing function definitions, custom input data, or variables..."
            className="w-full h-14 bg-white border border-[#141414] p-2 text-xs font-mono resize-none focus:outline-none placeholder:text-gray-400"
          />
        </div>

        {error && (
          <div className="p-3 bg-red-100 border-t border-red-500 text-red-800 text-xs font-mono">
            {error}
          </div>
        )}
      </section>

      {/* RIGHT SECTION: DEDICATED CONTROLS, SCRUBBER, & VARIABLE PANELS (50% EQUAL SPLIT) */}
      <section className="w-full lg:w-1/2 flex flex-col bg-white">
        {/* TOP CONTROLS BAR: Playback Buttons & Speeds */}
        <div className="p-3 bg-[#F5F5F3] border-b border-[#141414] flex flex-wrap items-center justify-between gap-2">
          {/* Stepper Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentStepIndex((p) => Math.max(0, p - 1))}
              disabled={!result || currentStepIndex === 0}
              className="px-2.5 py-1 bg-white border border-[#141414] text-[#141414] text-xs font-bold hover:bg-[#F0F0F0] disabled:opacity-40 transition-colors shadow-[1px_1px_0px_0px_rgba(20,20,20,1)] cursor-pointer"
              title="Previous Step"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              disabled={!result || activeTrace.length === 0}
              className="px-3 py-1 bg-[#22C55E] text-white text-xs font-bold border border-[#141414] hover:bg-[#16a34a] disabled:opacity-40 transition-colors shadow-[1px_1px_0px_0px_rgba(20,20,20,1)] flex items-center gap-1 cursor-pointer"
              title={isPlaying ? 'Pause Trace' : 'Auto-Play Trace'}
            >
              {isPlaying ? (
                <Pause className="w-3.5 h-3.5" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" />
              )}
              <span className="text-[10px] uppercase">{isPlaying ? 'PAUSE' : 'PLAY'}</span>
            </button>
            <button
              onClick={() =>
                setCurrentStepIndex((p) => Math.min(activeTrace.length - 1, p + 1))
              }
              disabled={!result || currentStepIndex >= activeTrace.length - 1}
              className="px-2.5 py-1 bg-white border border-[#141414] text-[#141414] text-xs font-bold hover:bg-[#F0F0F0] disabled:opacity-40 transition-colors shadow-[1px_1px_0px_0px_rgba(20,20,20,1)] cursor-pointer"
              title="Next Step"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>

            {/* Speed Selector */}
            <div className="flex border border-[#141414] rounded-xs overflow-hidden ml-2 bg-white text-[9px] font-mono font-bold">
              <button
                onClick={() => setPlaybackSpeed(1200)}
                className={`px-1.5 py-0.5 cursor-pointer ${
                  playbackSpeed === 1200
                    ? 'bg-[#141414] text-white'
                    : 'text-[#141414] hover:bg-[#F0F0F0]'
                }`}
              >
                1x
              </button>
              <button
                onClick={() => setPlaybackSpeed(600)}
                className={`px-1.5 py-0.5 border-l border-[#141414] cursor-pointer ${
                  playbackSpeed === 600
                    ? 'bg-[#141414] text-white'
                    : 'text-[#141414] hover:bg-[#F0F0F0]'
                }`}
              >
                2x
              </button>
            </div>
          </div>

          {/* Step Timeline Indicator */}
          <div className="flex items-center gap-2 text-[10px] font-mono">
            <span className="flex items-center gap-1 font-bold">
              <span className="w-2 h-2 rounded-full bg-[#3B82F6] animate-pulse"></span>
              {result
                ? `STEP ${(currentStepIndex + 1).toString().padStart(2, '0')}/${activeTrace.length.toString().padStart(2, '0')}`
                : 'STEP 00/00'}
            </span>
          </div>
        </div>

        {/* FLUID RANGE SCRUBBER COMPONENT */}
        <div className="px-4 py-2.5 bg-[#FAF9F6] border-b border-[#141414] flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-[9px] font-mono uppercase font-bold text-[#141414]">
            <span className="flex items-center gap-1 text-[#3B82F6]">
              <Sliders className="w-3 h-3" />
              <span>Fluid Execution Scrubber</span>
            </span>
            <span className="text-gray-500">
              {result && totalSteps > 0
                ? `${Math.round(progressPercent)}% completed`
                : 'Scrubber Ready'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 relative flex items-center">
              {/* Range Input with high responsiveness */}
              <input
                type="range"
                min={0}
                max={Math.max(0, totalSteps - 1)}
                value={currentStepIndex}
                onChange={(e) => setCurrentStepIndex(Number(e.target.value))}
                disabled={!result || totalSteps === 0}
                className="w-full h-2.5 bg-[#E4E3E0] rounded-none appearance-none cursor-pointer accent-[#3B82F6] focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed border border-[#141414]"
                style={{
                  background:
                    totalSteps > 1
                      ? `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${progressPercent}%, #E4E3E0 ${progressPercent}%, #E4E3E0 100%)`
                      : '#E4E3E0',
                }}
              />
            </div>
            <div className="font-mono text-[10px] font-bold px-2 py-0.5 bg-white border border-[#141414] text-[#141414] whitespace-nowrap shadow-[1px_1px_0px_0px_rgba(20,20,20,1)]">
              {result && totalSteps > 0 ? `S${currentStepIndex + 1}` : 'S0'}
            </div>
          </div>
        </div>

        {/* Step Explanation Banner */}
        <div className="px-4 py-2 border-b border-[#141414] bg-white flex items-center gap-2 shadow-[inset_0_-1px_0_rgba(20,20,20,0.05)]">
          <ChevronRight className="w-4 h-4 text-[#3B82F6] flex-shrink-0" />
          <div className="text-xs font-mono text-[#141414] truncate">
            {currentStep ? (
              <span>{currentStep.explanation}</span>
            ) : isExecuting ? (
              <span className="text-[#3B82F6] animate-pulse font-bold">
                Simulating line-by-line execution...
              </span>
            ) : (
              <span className="text-gray-400 italic">
                {code.trim()
                  ? 'Click "RUN EXECUTION" to simulate variable states line-by-line.'
                  : 'Editor is empty. Enter or paste your code on the left, then click "RUN EXECUTION".'}
              </span>
            )}
          </div>
        </div>

        {/* TAB NAVIGATION: All Variables | Watched Variables Panel | Heap & Stack */}
        <div className="flex border-b border-[#141414] bg-[#F5F5F3]">
          <button
            onClick={() => setActiveRightTab('table')}
            className={`flex-1 py-2 px-3 text-[10px] font-bold uppercase tracking-wider transition-colors border-r border-[#141414] flex items-center justify-center gap-1.5 cursor-pointer ${
              activeRightTab === 'table'
                ? 'bg-white text-[#141414] shadow-[inset_0_2px_0_#3B82F6]'
                : 'text-gray-600 hover:bg-[#ECEBE8]'
            }`}
          >
            <ListFilter className="w-3.5 h-3.5 text-[#3B82F6]" />
            <span>All Variables ({currentStep ? currentStep.variables.length : 0})</span>
          </button>

          <button
            onClick={() => setActiveRightTab('watched')}
            className={`flex-1 py-2 px-3 text-[10px] font-bold uppercase tracking-wider transition-colors border-r border-[#141414] flex items-center justify-center gap-1.5 cursor-pointer ${
              activeRightTab === 'watched'
                ? 'bg-white text-[#141414] shadow-[inset_0_2px_0_#3B82F6]'
                : 'text-gray-600 hover:bg-[#ECEBE8]'
            }`}
          >
            <Pin className="w-3.5 h-3.5 text-[#3B82F6]" />
            <span>Watched Panel ({watchedVarNames.length})</span>
          </button>

          <button
            onClick={() => setActiveRightTab('stack')}
            className={`py-2 px-4 text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
              activeRightTab === 'stack'
                ? 'bg-white text-[#141414] shadow-[inset_0_2px_0_#3B82F6]'
                : 'text-gray-600 hover:bg-[#ECEBE8]'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-[#3B82F6]" />
            <span>Heap / Stack</span>
          </button>
        </div>

        {/* TAB 1: ALL VARIABLES TABLE */}
        {activeRightTab === 'table' && (
          <div className="flex-1 flex flex-col overflow-hidden min-h-[300px]">
            {/* Table Header */}
            <div className="grid grid-cols-[32px_1.2fr_0.9fr_1.8fr_1fr] border-b border-[#141414] bg-[#F5F5F3] text-[9px] font-bold uppercase tracking-wider py-1.5 px-3 text-[#141414] items-center">
              <div className="text-center" title="Pin to Watched Variables">
                <Pin className="w-3 h-3 mx-auto text-gray-400" />
              </div>
              <div>Variable</div>
              <div>Type</div>
              <div>Current Value</div>
              <div>Status</div>
            </div>

            {/* Table Body */}
            <div className="flex-1 overflow-y-auto font-mono text-xs">
              {!result ? (
                <div className="p-8 text-center text-gray-400 text-xs italic">
                  {code.trim()
                    ? 'Run execution to inspect variables at each step.'
                    : 'Workspace is fresh. Type or paste your code on the left, then click "RUN EXECUTION".'}
                </div>
              ) : currentStep && currentStep.variables.length > 0 ? (
                currentStep.variables.map((v, i) => {
                  const isChanged = changedVarNames.has(v.name);
                  const isWatched = watchedVarNames.includes(v.name);
                  return (
                    <div
                      key={`${v.name}-${i}`}
                      className={`grid grid-cols-[32px_1.2fr_0.9fr_1.8fr_1fr] border-b border-[#E0E0E0] py-2 px-3 items-center transition-colors ${
                        isChanged ? 'bg-[#3B82F6]/10 font-medium' : 'hover:bg-[#F9FAFB]'
                      }`}
                    >
                      {/* Pin Button */}
                      <div className="flex justify-center">
                        <button
                          onClick={() => handleToggleWatch(v.name)}
                          className={`p-1 rounded-xs transition-colors cursor-pointer ${
                            isWatched
                              ? 'text-[#3B82F6] hover:text-[#141414]'
                              : 'text-gray-300 hover:text-[#3B82F6]'
                          }`}
                          title={
                            isWatched
                              ? `Unpin ${v.name}`
                              : `Pin ${v.name} to Watched Panel`
                          }
                        >
                          <Pin
                            className={`w-3.5 h-3.5 ${
                              isWatched ? 'fill-current text-[#3B82F6]' : ''
                            }`}
                          />
                        </button>
                      </div>

                      {/* Name */}
                      <div
                        className={`font-bold flex items-center gap-1 ${
                          isChanged ? 'text-[#3B82F6]' : 'text-[#141414]'
                        }`}
                      >
                        <span>{v.name}</span>
                        {isWatched && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]"></span>
                        )}
                      </div>

                      {/* Type */}
                      <div className="text-[10px] text-gray-500">{v.type}</div>

                      {/* Value */}
                      <div
                        className="text-[#059669] font-bold text-xs truncate pr-2"
                        title={v.value}
                      >
                        {v.value}
                      </div>

                      {/* Status & Insight Action */}
                      <div className="flex items-center justify-between gap-1">
                        {isChanged ? (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 bg-[#3B82F6] text-white rounded-xs">
                            UPDATED
                          </span>
                        ) : (
                          <span className="text-[9px] text-gray-400">IN SCOPE</span>
                        )}
                        <button
                          onClick={() => {
                            if (!watchedVarNames.includes(v.name)) {
                              handleToggleWatch(v.name);
                            }
                            setActiveRightTab('watched');
                          }}
                          className="opacity-0 group-hover:opacity-100 hover:opacity-100 p-1 text-[#3B82F6] hover:text-[#141414] transition-opacity cursor-pointer"
                          title={`Analyze ${v.name} in Watched Panel`}
                        >
                          <Sparkles className="w-3 h-3 text-[#3B82F6]" />
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-4 text-gray-400 text-xs italic">
                  No local variables initialized in this step.
                </div>
              )}
            </div>

            {/* Quick Watch Bar at Bottom of Table */}
            <div className="p-2 border-t border-[#141414] bg-[#F5F5F3] flex items-center justify-between text-[9px]">
              <span className="text-gray-600 font-mono">
                Click the pin icon <Pin className="w-2.5 h-2.5 inline mx-0.5 text-[#3B82F6]" /> or spark icon to get Deep AI Insights.
              </span>
              <button
                onClick={() => setActiveRightTab('watched')}
                className="font-bold text-[#3B82F6] hover:underline uppercase cursor-pointer"
              >
                Open Watched Panel ({watchedVarNames.length}) →
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: DEDICATED WATCHED VARIABLES PANEL */}
        {activeRightTab === 'watched' && (
          <div className="flex-1 flex flex-col overflow-hidden min-h-[300px]">
            <WatchedVariablesPanel
              watchedVarNames={watchedVarNames}
              onToggleWatch={handleToggleWatch}
              onAddCustomWatch={handleAddCustomWatch}
              onRemoveWatch={handleRemoveWatch}
              allDiscoveredVariables={allDiscoveredVariables}
              currentStep={currentStep}
              currentStepIndex={currentStepIndex}
              onJumpToStep={(stepNum) => {
                const targetIdx = activeTrace.findIndex((s) => s.stepNumber === stepNum);
                setCurrentStepIndex(
                  targetIdx !== -1
                    ? targetIdx
                    : Math.max(0, Math.min(stepNum - 1, activeTrace.length - 1))
                );
              }}
              code={code}
              language={language}
            />
          </div>
        )}

        {/* TAB 3: HEAP & CALL STACK */}
        {activeRightTab === 'stack' && (
          <div className="flex-1 flex flex-col p-4 bg-white overflow-y-auto min-h-[300px]">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-serif italic text-base text-[#141414]">
                Execution Heap & Call Stack
              </h2>
              <div className="flex items-center gap-1 text-[9px] font-bold uppercase">
                <span className="px-1.5 py-0.5 bg-[#E4E3E0] border border-[#141414]">
                  FRAME STACK
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
              {/* Global Frame */}
              <div className="flex flex-col border border-dashed border-[#141414] p-2.5 bg-[#FDFDFD] relative">
                <div className="text-[8px] absolute -top-2 left-2 bg-white px-1 font-bold text-[#141414]">
                  STACK_FRAME_0
                </div>
                <div className="text-[10px] font-mono flex flex-col gap-1 mt-1">
                  <span className="text-blue-600 font-bold">__main__</span>
                  <span className="text-gray-500 text-[9px]">Scope: Module</span>
                  <div className="h-[1px] bg-[#141414] opacity-10 my-0.5"></div>
                  <span className="text-[9px] text-gray-600">Language: {language}</span>
                </div>
              </div>

              {/* Active Execution Frame */}
              <div className="flex flex-col border-2 border-[#141414] p-2.5 bg-[#3B82F6]/10 relative">
                <div className="text-[8px] absolute -top-2 left-2 bg-white px-1 font-bold text-[#141414]">
                  STACK_FRAME_ACTIVE
                </div>
                <div className="text-[10px] font-mono flex flex-col gap-1 mt-1">
                  <span className="text-[#3B82F6] font-bold">
                    {currentStep ? `Line ${currentStep.lineNumber}` : 'Idle'}
                  </span>
                  <span className="text-gray-600 text-[9px]">
                    {currentStep
                      ? `Vars: ${currentStep.variables.length}`
                      : 'No execution'}
                  </span>
                  <div className="h-[1px] bg-[#141414] opacity-10 my-0.5"></div>
                  <span className="text-[9px] font-bold text-[#059669]">
                    {currentStep ? 'Executing' : 'Standing By'}
                  </span>
                </div>
              </div>

              {/* Heap Memory Indicator */}
              <div className="flex flex-col border border-dashed border-[#A0A0A0] p-2.5 bg-gray-50 relative">
                <div className="text-[8px] absolute -top-2 left-2 bg-white px-1 font-bold text-gray-600">
                  HEAP_ALLOCATION
                </div>
                <div className="text-[10px] font-mono flex flex-col gap-1 mt-1">
                  <span className="text-gray-700 font-bold">
                    {currentStep
                      ? `${currentStep.variables.length * 48} Bytes`
                      : '0 Bytes'}
                  </span>
                  <div className="h-1.5 w-full bg-gray-200 rounded-full mt-1.5 overflow-hidden">
                    <div
                      className="h-full bg-[#141414] transition-all duration-300"
                      style={{
                        width: result
                          ? `${Math.min(100, Math.max(15, (currentStepIndex + 1) * 8))}%`
                          : '0%',
                      }}
                    ></div>
                  </div>
                  <span className="text-[8px] text-gray-500 mt-1">
                    Simulated State VM
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
