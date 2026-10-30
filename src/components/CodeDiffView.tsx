import React, { useState, useMemo } from 'react';
import * as Diff from 'diff';
import { Columns, AlignJustify, RotateCcw, Check, Sparkles, ArrowRight, FileCode } from 'lucide-react';

interface CodeDiffViewProps {
  initialCode: string;
  currentCode: string;
  language: string;
  onRevertToInitial?: () => void;
  onSetAsBaseline?: () => void;
}

export function CodeDiffView({
  initialCode,
  currentCode,
  language,
  onRevertToInitial,
  onSetAsBaseline,
}: CodeDiffViewProps) {
  const [diffMode, setDiffMode] = useState<'unified' | 'split'>('unified');

  // Compute line-by-line diffs
  const diffResult = useMemo(() => {
    const changes = Diff.diffLines(initialCode, currentCode);
    let additions = 0;
    let deletions = 0;
    let unchanged = 0;

    changes.forEach((part) => {
      const lineCount = part.value.replace(/\n$/, '').split('\n').length;
      if (part.added) {
        additions += lineCount;
      } else if (part.removed) {
        deletions += lineCount;
      } else {
        unchanged += lineCount;
      }
    });

    return {
      changes,
      additions,
      deletions,
      unchanged,
      hasDifferences: additions > 0 || deletions > 0,
    };
  }, [initialCode, currentCode]);

  // Compute unified rows with line numbers
  const unifiedRows = useMemo(() => {
    let oldLineNum = 1;
    let newLineNum = 1;
    const rows: Array<{
      type: 'added' | 'removed' | 'unchanged';
      oldLine: number | null;
      newLine: number | null;
      content: string;
    }> = [];

    diffResult.changes.forEach((part) => {
      const lines = part.value.replace(/\n$/, '').split('\n');
      lines.forEach((line) => {
        if (part.added) {
          rows.push({
            type: 'added',
            oldLine: null,
            newLine: newLineNum++,
            content: line,
          });
        } else if (part.removed) {
          rows.push({
            type: 'removed',
            oldLine: oldLineNum++,
            newLine: null,
            content: line,
          });
        } else {
          rows.push({
            type: 'unchanged',
            oldLine: oldLineNum++,
            newLine: newLineNum++,
            content: line,
          });
        }
      });
    });

    return rows;
  }, [diffResult.changes]);

  // Compute side-by-side split rows
  const splitRows = useMemo(() => {
    let origLineNum = 1;
    let modLineNum = 1;

    // Precise line mapping
    const leftRows: Array<{ lineNum: number; content: string; type: 'removed' | 'unchanged' | 'empty' }> = [];
    const rightRows: Array<{ lineNum: number; content: string; type: 'added' | 'unchanged' | 'empty' }> = [];

    diffResult.changes.forEach((part) => {
      const lines = part.value.replace(/\n$/, '').split('\n');
      if (part.removed) {
        lines.forEach((l) => {
          leftRows.push({ lineNum: origLineNum++, content: l, type: 'removed' });
        });
      } else if (part.added) {
        lines.forEach((l) => {
          rightRows.push({ lineNum: modLineNum++, content: l, type: 'added' });
        });
      } else {
        // Pad to keep them aligned
        while (leftRows.length < rightRows.length) {
          leftRows.push({ lineNum: 0, content: '', type: 'empty' });
        }
        while (rightRows.length < leftRows.length) {
          rightRows.push({ lineNum: 0, content: '', type: 'empty' });
        }
        lines.forEach((l) => {
          leftRows.push({ lineNum: origLineNum++, content: l, type: 'unchanged' });
          rightRows.push({ lineNum: modLineNum++, content: l, type: 'unchanged' });
        });
      }
    });

    // Final balance padding
    while (leftRows.length < rightRows.length) {
      leftRows.push({ lineNum: 0, content: '', type: 'empty' });
    }
    while (rightRows.length < leftRows.length) {
      rightRows.push({ lineNum: 0, content: '', type: 'empty' });
    }

    return { leftRows, rightRows };
  }, [diffResult.changes]);

  return (
    <div className="flex-1 flex flex-col bg-[#1E1E1E] text-[#D4D4D4] font-mono text-xs overflow-hidden select-text">
      {/* Diff Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-3 py-2 bg-[#252526] border-b border-[#333333] text-[11px] gap-2">
        {/* Stats & Status */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1 font-bold text-white">
            <FileCode className="w-3.5 h-3.5 text-[#3B82F6]" />
            <span className="uppercase text-[10px]">Diff Comparison</span>
          </div>

          {diffResult.hasDifferences ? (
            <div className="flex items-center gap-1.5 font-bold">
              <span className="px-1.5 py-0.2 bg-[#22C55E]/20 text-[#4ADE80] border border-[#22C55E]/40 rounded-xs text-[10px]">
                +{diffResult.additions}
              </span>
              <span className="px-1.5 py-0.2 bg-[#EF4444]/20 text-[#F87171] border border-[#EF4444]/40 rounded-xs text-[10px]">
                -{diffResult.deletions}
              </span>
            </div>
          ) : (
            <span className="text-gray-400 text-[10px] italic">
              (Identical to baseline - no changes)
            </span>
          )}
        </div>

        {/* View Mode & Action Controls */}
        <div className="flex items-center gap-2">
          {/* Split vs Unified Toggle */}
          <div className="flex border border-[#444444] rounded-xs overflow-hidden bg-[#1E1E1E]">
            <button
              onClick={() => setDiffMode('unified')}
              className={`px-2 py-0.5 flex items-center gap-1 text-[10px] font-bold transition-colors cursor-pointer ${
                diffMode === 'unified'
                  ? 'bg-[#007ACC] text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
              title="Unified inline diff view"
            >
              <AlignJustify className="w-3 h-3" />
              <span>Unified</span>
            </button>
            <button
              onClick={() => setDiffMode('split')}
              className={`px-2 py-0.5 flex items-center gap-1 text-[10px] font-bold transition-colors cursor-pointer border-l border-[#444444] ${
                diffMode === 'split'
                  ? 'bg-[#007ACC] text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
              title="Side-by-side split diff view"
            >
              <Columns className="w-3 h-3" />
              <span>Split</span>
            </button>
          </div>

          {/* Revert / Save Baseline buttons */}
          {onRevertToInitial && diffResult.hasDifferences && (
            <button
              onClick={onRevertToInitial}
              className="px-2 py-0.5 bg-[#333333] hover:bg-[#444444] text-gray-200 border border-[#555555] rounded-xs flex items-center gap-1 text-[10px] font-bold transition-colors cursor-pointer"
              title="Revert all changes back to initial version"
            >
              <RotateCcw className="w-2.5 h-2.5 text-amber-400" />
              <span>Revert Code</span>
            </button>
          )}

          {onSetAsBaseline && diffResult.hasDifferences && (
            <button
              onClick={onSetAsBaseline}
              className="px-2 py-0.5 bg-[#059669] hover:bg-[#10B981] text-white rounded-xs flex items-center gap-1 text-[10px] font-bold transition-colors cursor-pointer shadow-xs"
              title="Set current patched code as the new baseline"
            >
              <Check className="w-2.5 h-2.5" />
              <span>Save as Baseline</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Diff Code Display */}
      <div className="flex-1 overflow-auto bg-[#1E1E1E]">
        {diffMode === 'unified' ? (
          /* UNIFIED DIFF VIEW */
          <div className="min-w-max py-1 flex flex-col font-mono text-xs">
            {unifiedRows.map((row, idx) => {
              const isAdded = row.type === 'added';
              const isRemoved = row.type === 'removed';

              return (
                <div
                  key={idx}
                  className={`flex items-center h-6 leading-6 transition-colors ${
                    isAdded
                      ? 'bg-[#043927]/60 border-l-2 border-[#22C55E] text-[#D4D4D4]'
                      : isRemoved
                      ? 'bg-[#4B1113]/60 border-l-2 border-[#EF4444] text-[#D4D4D4]'
                      : 'hover:bg-[#2A2D2E]/40 border-l-2 border-transparent text-[#CCCCCC]'
                  }`}
                >
                  {/* Line Number Gutters */}
                  <div className="w-10 text-right pr-2 select-none text-[#858585] text-[11px] opacity-70 border-r border-[#333333]">
                    {row.oldLine !== null ? row.oldLine : ''}
                  </div>
                  <div className="w-10 text-right pr-2 select-none text-[#858585] text-[11px] opacity-70 border-r border-[#333333]">
                    {row.newLine !== null ? row.newLine : ''}
                  </div>

                  {/* Marker +/- */}
                  <div
                    className={`w-5 text-center select-none font-bold text-xs ${
                      isAdded ? 'text-[#4ADE80]' : isRemoved ? 'text-[#F87171]' : 'text-transparent'
                    }`}
                  >
                    {isAdded ? '+' : isRemoved ? '-' : ' '}
                  </div>

                  {/* Code Line Content */}
                  <div className="flex-1 px-2 whitespace-pre overflow-x-visible">
                    <span
                      className={
                        isAdded
                          ? 'text-[#A6E3A1]'
                          : isRemoved
                          ? 'text-[#F38BA8] line-through opacity-80'
                          : 'text-[#D4D4D4]'
                      }
                    >
                      {row.content || ' '}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* SPLIT (SIDE-BY-SIDE) DIFF VIEW */
          <div className="min-w-max flex flex-col font-mono text-xs">
            {/* Split Headers */}
            <div className="flex border-b border-[#333333] bg-[#252526] text-[10px] font-bold select-none sticky top-0 z-10">
              <div className="w-1/2 px-3 py-1 text-gray-400 border-r border-[#333333] flex items-center justify-between">
                <span>INITIAL BASELINE</span>
                <span className="text-[#F87171]">Original Version</span>
              </div>
              <div className="w-1/2 px-3 py-1 text-gray-400 flex items-center justify-between">
                <span>CURRENT / PATCHED CODE</span>
                <span className="text-[#4ADE80]">Modified Version</span>
              </div>
            </div>

            {/* Split Rows */}
            <div className="flex flex-col py-1">
              {splitRows.leftRows.map((left, idx) => {
                const right = splitRows.rightRows[idx];
                const isLeftRemoved = left.type === 'removed';
                const isRightAdded = right?.type === 'added';

                return (
                  <div key={idx} className="flex items-stretch h-6 leading-6">
                    {/* Left Pane (Initial) */}
                    <div
                      className={`w-1/2 flex items-center border-r border-[#333333] ${
                        isLeftRemoved
                          ? 'bg-[#4B1113]/60 border-l-2 border-[#EF4444]'
                          : left.type === 'empty'
                          ? 'bg-[#181818] border-l-2 border-transparent'
                          : 'hover:bg-[#2A2D2E]/40 border-l-2 border-transparent'
                      }`}
                    >
                      <div className="w-9 text-right pr-2 select-none text-[#858585] text-[11px] opacity-70 border-r border-[#333333]">
                        {left.type !== 'empty' ? left.lineNum : ''}
                      </div>
                      <div className="w-4 text-center select-none font-bold text-[#F87171] text-xs">
                        {isLeftRemoved ? '-' : ''}
                      </div>
                      <div className="flex-1 px-2 whitespace-pre overflow-hidden truncate">
                        <span className={isLeftRemoved ? 'text-[#F38BA8] line-through opacity-80' : 'text-[#D4D4D4]'}>
                          {left.content}
                        </span>
                      </div>
                    </div>

                    {/* Right Pane (Current/Patched) */}
                    <div
                      className={`w-1/2 flex items-center ${
                        isRightAdded
                          ? 'bg-[#043927]/60 border-l-2 border-[#22C55E]'
                          : right?.type === 'empty'
                          ? 'bg-[#181818] border-l-2 border-transparent'
                          : 'hover:bg-[#2A2D2E]/40 border-l-2 border-transparent'
                      }`}
                    >
                      <div className="w-9 text-right pr-2 select-none text-[#858585] text-[11px] opacity-70 border-r border-[#333333]">
                        {right && right.type !== 'empty' ? right.lineNum : ''}
                      </div>
                      <div className="w-4 text-center select-none font-bold text-[#4ADE80] text-xs">
                        {isRightAdded ? '+' : ''}
                      </div>
                      <div className="flex-1 px-2 whitespace-pre overflow-hidden truncate">
                        <span className={isRightAdded ? 'text-[#A6E3A1]' : 'text-[#D4D4D4]'}>
                          {right?.content}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Diff Footer Info */}
      <div className="px-3 py-1.5 bg-[#181818] border-t border-[#333333] flex items-center justify-between text-[10px] text-gray-400">
        <span>
          Comparing against baseline ({initialCode.split('\n').length} lines) vs Current ({currentCode.split('\n').length} lines)
        </span>
        <span className="text-[#3B82F6] font-bold">
          {language.toUpperCase()}
        </span>
      </div>
    </div>
  );
}
