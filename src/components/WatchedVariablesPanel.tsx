import React from 'react';
import { TraceStep, VariableInsight } from '../types';
import {
  Pin,
  Clock,
  Plus,
  X,
  Sparkles,
  Loader2,
  ChevronDown,
  ChevronUp,
  BrainCircuit,
  Info,
  RefreshCw,
  Zap,
} from 'lucide-react';

interface WatchedVariablesPanelProps {
  watchedVarNames: string[];
  onToggleWatch: (varName: string) => void;
  onAddCustomWatch: (varName: string) => void;
  onRemoveWatch: (varName: string) => void;
  allDiscoveredVariables: {
    name: string;
    type: string;
    steps: { stepNumber: number; value: string; lineNumber: number }[];
  }[];
  currentStep: TraceStep | undefined;
  currentStepIndex: number;
  onJumpToStep: (stepNumber: number) => void;
  code: string;
  language: string;
}

export function WatchedVariablesPanel({
  watchedVarNames,
  onToggleWatch,
  onAddCustomWatch,
  onRemoveWatch,
  allDiscoveredVariables,
  currentStep,
  currentStepIndex,
  onJumpToStep,
  code,
  language,
}: WatchedVariablesPanelProps) {
  const [customInput, setCustomInput] = React.useState('');
  const [expandedInsights, setExpandedInsights] = React.useState<Record<string, boolean>>({});
  const [insightsCache, setInsightsCache] = React.useState<Record<string, VariableInsight>>({});
  const [loadingInsights, setLoadingInsights] = React.useState<Record<string, boolean>>({});
  const [insightErrors, setInsightErrors] = React.useState<Record<string, string>>({});

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customInput.trim()) {
      onAddCustomWatch(customInput.trim());
      setCustomInput('');
    }
  };

  // Build current step variable map
  const currentVarMap = React.useMemo(() => {
    if (!currentStep) return new Map<string, { value: string; type: string }>();
    return new Map(currentStep.variables.map((v) => [v.name, { value: v.value, type: v.type }]));
  }, [currentStep]);

  // Request Deep AI Insight for a variable at the current step
  const fetchDeepInsight = async (varName: string, force = false) => {
    if (!currentStep) return;

    const cacheKey = `${varName}_step${currentStep.stepNumber}`;
    if (!force && insightsCache[cacheKey]) {
      setExpandedInsights((prev) => ({ ...prev, [varName]: true }));
      return;
    }

    setLoadingInsights((prev) => ({ ...prev, [varName]: true }));
    setInsightErrors((prev) => ({ ...prev, [varName]: '' }));
    setExpandedInsights((prev) => ({ ...prev, [varName]: true }));

    const currentVar = currentVarMap.get(varName);
    const discovered = allDiscoveredVariables.find((v) => v.name === varName);
    const prevHistory = discovered?.steps.filter((s) => s.stepNumber < currentStep.stepNumber);
    const previousVal = prevHistory && prevHistory.length > 0 ? prevHistory[prevHistory.length - 1].value : undefined;

    try {
      const response = await fetch('/api/variable-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          language,
          variableName: varName,
          currentValue: currentVar ? currentVar.value : 'undefined',
          previousValue: previousVal,
          stepNumber: currentStep.stepNumber,
          lineNumber: currentStep.lineNumber,
          stepExplanation: currentStep.explanation,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate insight');
      }

      const insightData: VariableInsight = await response.json();
      setInsightsCache((prev) => ({ ...prev, [cacheKey]: insightData }));
    } catch (err: any) {
      console.error('Insight fetch error:', err);
      setInsightErrors((prev) => ({
        ...prev,
        [varName]: err.message || 'Failed to generate AI explanation.',
      }));
    } finally {
      setLoadingInsights((prev) => ({ ...prev, [varName]: false }));
    }
  };

  const toggleInsightExpanded = (varName: string) => {
    const isCurrentlyExpanded = !!expandedInsights[varName];
    if (!isCurrentlyExpanded && currentStep) {
      const cacheKey = `${varName}_step${currentStep.stepNumber}`;
      if (!insightsCache[cacheKey] && !loadingInsights[varName]) {
        fetchDeepInsight(varName);
        return;
      }
    }
    setExpandedInsights((prev) => ({ ...prev, [varName]: !isCurrentlyExpanded }));
  };

  return (
    <div className="flex flex-col h-full bg-[#FDFDFD] font-mono text-xs overflow-hidden">
      {/* Header & Quick Add */}
      <div className="p-3 border-b border-[#141414] bg-[#F5F5F3] flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold uppercase text-[10px] tracking-wider text-[#141414]">
            <Pin className="w-3.5 h-3.5 text-[#3B82F6]" />
            <span>Watched Variables & AI Insights ({watchedVarNames.length})</span>
          </div>
          <span className="text-[9px] text-gray-500 font-sans flex items-center gap-1">
            <BrainCircuit className="w-3 h-3 text-[#3B82F6]" />
            Deep Code Context
          </span>
        </div>

        {/* Custom Variable Add Form */}
        <form onSubmit={handleAddSubmit} className="flex gap-1">
          <input
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            placeholder="Type variable name to track..."
            className="flex-1 px-2 py-1 bg-white border border-[#141414] text-[11px] outline-none focus:border-[#3B82F6]"
          />
          <button
            type="submit"
            disabled={!customInput.trim()}
            className="px-2.5 py-1 bg-[#141414] text-white text-[10px] font-bold uppercase disabled:opacity-40 hover:bg-black transition-colors cursor-pointer"
          >
            + Track
          </button>
        </form>

        {/* Quick Suggestion Chips from discovered variables in the trace */}
        {allDiscoveredVariables.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap pt-1">
            <span className="text-[9px] uppercase font-bold text-gray-500">Trace Vars:</span>
            {allDiscoveredVariables.map((v) => {
              const isWatched = watchedVarNames.includes(v.name);
              return (
                <button
                  key={v.name}
                  onClick={() => onToggleWatch(v.name)}
                  className={`text-[9px] px-1.5 py-0.5 border rounded-xs transition-colors flex items-center gap-1 cursor-pointer ${
                    isWatched
                      ? 'bg-[#3B82F6] text-white border-[#3B82F6] font-bold'
                      : 'bg-white text-[#141414] border-[#141414]/30 hover:border-[#141414]'
                  }`}
                  title={isWatched ? `Remove ${v.name} from watch` : `Watch ${v.name}`}
                >
                  <span>{v.name}</span>
                  {isWatched ? <X className="w-2.5 h-2.5" /> : <Plus className="w-2.5 h-2.5" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Watched Variables List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {watchedVarNames.length === 0 ? (
          <div className="p-6 border-2 border-dashed border-[#141414]/20 bg-white text-center flex flex-col items-center justify-center text-gray-500">
            <Pin className="w-6 h-6 text-gray-400 mb-2 opacity-50" />
            <p className="text-[11px] font-bold text-[#141414] mb-1">No variables pinned</p>
            <p className="text-[10px] text-gray-500 max-w-xs">
              Click any variable in the table or the quick chips above to track its state and receive AI Deep Insights explaining why values mutated.
            </p>
          </div>
        ) : (
          watchedVarNames.map((varName) => {
            const currentData = currentVarMap.get(varName);
            const discovered = allDiscoveredVariables.find((v) => v.name === varName);
            const historySteps = discovered ? discovered.steps : [];
            const cacheKey = currentStep ? `${varName}_step${currentStep.stepNumber}` : '';
            const insight = insightsCache[cacheKey];
            const isLoadingInsight = !!loadingInsights[varName];
            const isExpanded = !!expandedInsights[varName];
            const insightError = insightErrors[varName];

            return (
              <div
                key={varName}
                className="bg-white border border-[#141414] shadow-[2px_2px_0px_0px_rgba(20,20,20,1)] p-3 flex flex-col gap-2.5"
              >
                {/* Variable Header & Current Value */}
                <div className="flex items-start justify-between border-b border-[#E0E0E0] pb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#3B82F6]">{varName}</span>
                      {currentData && (
                        <span className="text-[9px] px-1 py-0.2 bg-[#E4E3E0] text-[#141414] font-bold uppercase">
                          {currentData.type}
                        </span>
                      )}
                      {!currentData && (
                        <span className="text-[9px] px-1 py-0.2 bg-gray-100 text-gray-500 italic">
                          out of scope
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-gray-500 mt-0.5">
                      {currentStep ? `Value at Step ${currentStep.stepNumber} (Line ${currentStep.lineNumber}):` : 'Current State:'}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className="text-xs font-bold text-[#059669] bg-[#059669]/10 px-2 py-0.5 border border-[#059669]/30">
                        {currentData ? currentData.value : '<undefined>'}
                      </div>
                    </div>
                    <button
                      onClick={() => onRemoveWatch(varName)}
                      className="p-1 hover:bg-[#F5F5F3] text-gray-400 hover:text-[#141414] transition-colors cursor-pointer"
                      title="Unwatch variable"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Timeline History of this Variable */}
                <div>
                  <div className="flex items-center justify-between text-[9px] uppercase font-bold text-gray-500 mb-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#3B82F6]" />
                      <span>Trace History ({historySteps.length} updates)</span>
                    </span>
                    <span className="text-[8px] opacity-70">Click to scrub</span>
                  </div>

                  {historySteps.length === 0 ? (
                    <div className="text-[10px] text-gray-400 italic py-0.5">
                      Variable not detected in execution trace.
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-1 bg-[#F5F5F3] border border-[#E0E0E0]">
                      {historySteps.map((h, idx) => {
                        const isCurrent = currentStep && h.stepNumber === currentStep.stepNumber;
                        return (
                          <button
                            key={idx}
                            onClick={() => onJumpToStep(h.stepNumber)}
                            className={`px-1.5 py-0.5 text-[9px] border transition-all flex items-center gap-1 cursor-pointer ${
                              isCurrent
                                ? 'bg-[#141414] text-white border-[#141414] font-bold scale-105 shadow-sm'
                                : 'bg-white text-[#141414] border-[#141414]/20 hover:border-[#141414] hover:bg-gray-50'
                            }`}
                            title={`Jump to Step ${h.stepNumber} (Line ${h.lineNumber}): ${varName} = ${h.value}`}
                          >
                            <span className="opacity-60">S{h.stepNumber}:</span>
                            <span className={isCurrent ? 'text-[#38BDF8]' : 'text-[#059669] font-bold'}>
                              {h.value}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* DEEP AI INSIGHT SECTION */}
                <div className="pt-1">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => toggleInsightExpanded(varName)}
                      disabled={!currentStep}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 border text-[10px] font-bold transition-all cursor-pointer ${
                        isExpanded
                          ? 'bg-[#3B82F6] text-white border-[#3B82F6]'
                          : 'bg-[#F5F5F3] hover:bg-[#ECEBE8] text-[#141414] border-[#141414]'
                      } disabled:opacity-50`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Sparkles className={`w-3 h-3 ${isExpanded ? 'text-amber-300' : 'text-[#3B82F6]'}`} />
                        <span>
                          {isLoadingInsight
                            ? 'Generating Deep AI Insight...'
                            : insight
                            ? `AI Insight: ${insight.mutationReason}`
                            : 'Get Deep AI Insight for this Step'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {isLoadingInsight ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </div>
                    </button>
                  </div>

                  {/* Expanded Insight Body */}
                  {isExpanded && (
                    <div className="mt-1.5 p-2.5 bg-[#FAF9F6] border border-[#141414] flex flex-col gap-2 animate-fadeIn">
                      {isLoadingInsight ? (
                        <div className="py-4 flex flex-col items-center justify-center gap-2 text-gray-500">
                          <Loader2 className="w-5 h-5 animate-spin text-[#3B82F6]" />
                          <span className="text-[10px] font-mono">
                            Analyzing code logic at Line {currentStep?.lineNumber}...
                          </span>
                        </div>
                      ) : insightError ? (
                        <div className="p-2 bg-red-100 border border-red-400 text-red-700 text-[10px]">
                          <div>{insightError}</div>
                          <button
                            onClick={() => fetchDeepInsight(varName, true)}
                            className="mt-1.5 text-[9px] font-bold text-red-900 underline flex items-center gap-1"
                          >
                            <RefreshCw className="w-2.5 h-2.5" /> Retry analysis
                          </button>
                        </div>
                      ) : insight ? (
                        <div className="space-y-2">
                          {/* Mutation Reason Badge & Header */}
                          <div className="flex items-center justify-between border-b border-[#E0E0E0] pb-1.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[8px] font-bold uppercase tracking-wider text-gray-500">
                                Mutation Reason:
                              </span>
                              <span className="px-1.5 py-0.5 bg-[#3B82F6]/10 text-[#3B82F6] font-bold text-[9px] border border-[#3B82F6]/30 rounded-xs">
                                {insight.mutationReason}
                              </span>
                            </div>
                            <button
                              onClick={() => fetchDeepInsight(varName, true)}
                              className="text-[9px] text-gray-500 hover:text-[#141414] flex items-center gap-1 transition-colors cursor-pointer"
                              title="Regenerate insight"
                            >
                              <RefreshCw className="w-2.5 h-2.5" />
                              <span>Refresh</span>
                            </button>
                          </div>

                          {/* Why Value Changed */}
                          <div>
                            <div className="text-[9px] uppercase font-bold text-[#141414] opacity-70 flex items-center gap-1 mb-0.5">
                              <Zap className="w-3 h-3 text-amber-500" />
                              <span>Why It Changed at Line {currentStep?.lineNumber}:</span>
                            </div>
                            <p className="text-[11px] leading-relaxed text-[#141414] bg-white p-2 border border-[#E4E3E0]">
                              {insight.summary}
                            </p>
                          </div>

                          {/* Algorithmic Role & Downstream Impact */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
                            <div className="bg-white p-2 border border-[#E4E3E0] flex flex-col gap-0.5">
                              <span className="text-[8px] uppercase font-bold text-gray-500">
                                Algorithmic Role:
                              </span>
                              <span className="text-[#141414] leading-snug font-sans text-[11px]">
                                {insight.algorithmicRole}
                              </span>
                            </div>
                            <div className="bg-white p-2 border border-[#E4E3E0] flex flex-col gap-0.5">
                              <span className="text-[8px] uppercase font-bold text-gray-500">
                                Execution Impact:
                              </span>
                              <span className="text-[#059669] font-medium leading-snug font-sans text-[11px]">
                                {insight.impact}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-2">
                          <button
                            onClick={() => fetchDeepInsight(varName)}
                            className="px-3 py-1 bg-[#3B82F6] text-white font-bold text-[10px] uppercase rounded-xs hover:bg-blue-600 transition-colors"
                          >
                            Analyze Variable State
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="p-2 border-t border-[#141414] bg-[#F5F5F3] text-[9px] text-gray-600 flex items-center justify-between">
        <span>Click any step chip to scrub trace to that state</span>
        <span className="font-bold text-[#3B82F6] flex items-center gap-1">
          <Sparkles className="w-2.5 h-2.5" /> AI Insight Engine Active
        </span>
      </div>
    </div>
  );
}
