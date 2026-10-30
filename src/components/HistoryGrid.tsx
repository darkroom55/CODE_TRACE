import React from 'react';
import { SubmissionHistoryItem } from '../types';
import { History, Trash2, Clock, CheckCircle2, ChevronRight, Zap } from 'lucide-react';

interface HistoryGridProps {
  history: SubmissionHistoryItem[];
  activeId: string | null;
  onSelectHistoryItem: (item: SubmissionHistoryItem) => void;
  onClearHistory: () => void;
  onRemoveHistoryItem: (id: string, e: React.MouseEvent) => void;
}

export function HistoryGrid({
  history,
  activeId,
  onSelectHistoryItem,
  onClearHistory,
  onRemoveHistoryItem,
}: HistoryGridProps) {
  if (history.length === 0) return null;

  return (
    <div className="border-t border-[#141414]/20 bg-[#ECEAE6] px-4 py-2">
      <div className="max-w-[100vw] mx-auto flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5">
          <History className="w-3.5 h-3.5 text-[#3B82F6]" />
          <span className="font-bold uppercase tracking-wider text-[10px] text-[#141414]">
            Past Submissions History ({history.length})
          </span>
          <span className="text-[9px] text-gray-500 font-sans hidden sm:inline">
            • Instant switch without re-running
          </span>
        </div>

        <button
          onClick={onClearHistory}
          className="text-[9px] uppercase font-bold text-gray-500 hover:text-red-600 transition-colors flex items-center gap-1 cursor-pointer"
          title="Clear all submission history"
        >
          <Trash2 className="w-2.5 h-2.5" />
          <span>Clear All</span>
        </button>
      </div>

      {/* Horizontal scrollable grid of past submissions */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-[100vw]">
        {history.map((item) => {
          const isActive = item.id === activeId;
          const formattedTime = new Date(item.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          });

          return (
            <div
              key={item.id}
              onClick={() => onSelectHistoryItem(item)}
              className={`flex-shrink-0 group cursor-pointer border px-2.5 py-1.5 flex items-center gap-2 transition-all rounded-xs select-none ${
                isActive
                  ? 'bg-[#141414] text-white border-[#141414] shadow-[2px_2px_0px_0px_rgba(59,130,246,1)] scale-[1.02]'
                  : 'bg-white hover:bg-gray-50 text-[#141414] border-[#141414]/30 hover:border-[#141414] shadow-xs'
              }`}
            >
              {/* Language Chip */}
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-[9px] font-bold uppercase font-mono px-1 py-0.2 rounded-xs ${
                      isActive ? 'bg-[#3B82F6] text-white' : 'bg-gray-100 text-[#141414]'
                    }`}
                  >
                    {item.language}
                  </span>
                  <span className="text-[11px] font-bold font-mono truncate max-w-[140px]">
                    {item.title}
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-0.5 text-[8px] opacity-70 font-mono">
                  <span className="flex items-center gap-0.5">
                    <Clock className="w-2.5 h-2.5" />
                    {formattedTime}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-0.5 text-[#059669] font-bold">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    {item.stepCount} steps
                  </span>
                  {item.executionTimeMs && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-0.5">
                        <Zap className="w-2.5 h-2.5 text-amber-500" />
                        {item.executionTimeMs}ms
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Action Indicator / Remove button */}
              <div className="flex items-center gap-1 pl-1 border-l border-current/20">
                {isActive ? (
                  <span className="text-[8px] font-bold uppercase text-[#38BDF8] px-1 py-0.5 bg-white/10 rounded-xs">
                    ACTIVE
                  </span>
                ) : (
                  <ChevronRight className="w-3 h-3 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                )}
                <button
                  onClick={(e) => onRemoveHistoryItem(item.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-500 transition-opacity cursor-pointer ml-0.5"
                  title="Remove from history"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
