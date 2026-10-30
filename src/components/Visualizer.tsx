import React from 'react';
import { VisualizationResult, TraceStep } from '../types';
import { Play, Pause, SkipForward, SkipBack, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface VisualizerProps {
  data: VisualizationResult;
}

export function Visualizer({ data }: VisualizerProps) {
  const [currentStepIndex, setCurrentStepIndex] = React.useState(0);
  const [isPlaying, setIsPlaying] = React.useState(false);
  
  const step = data.trace[currentStepIndex];
  const codeLines = data.completedCode.split('\n');

  React.useEffect(() => {
    let interval: number | undefined;
    if (isPlaying) {
      interval = window.setInterval(() => {
        setCurrentStepIndex((prev) => {
          if (prev >= data.trace.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1500); // 1.5 seconds per step
    }
    return () => clearInterval(interval);
  }, [isPlaying, data.trace.length]);

  if (!step) {
    return <div className="p-8 text-center text-slate-400">No trace data available.</div>;
  }

  return (
    <div className="flex flex-col h-full bg-white border border-[#141414] overflow-hidden shadow-[4px_4px_0px_0px_rgba(20,20,20,0.1)]">
      {/* Controls & Explanation Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-[#F5F5F3] border-b border-[#141414]">
        <div className="flex items-center space-x-2 mb-4 md:mb-0">
          <button
            onClick={() => setCurrentStepIndex((p) => Math.max(0, p - 1))}
            disabled={currentStepIndex === 0}
            className="p-2 border border-[#141414] bg-white hover:bg-[#F0F0F0] disabled:opacity-50 text-[#141414] transition-colors"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-2 bg-[#22C55E] hover:bg-[#16a34a] text-white transition-colors flex items-center justify-center w-10 h-10 border border-[#141414] shadow-[2px_2px_0px_0px_rgba(20,20,20,1)]"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-1" />}
          </button>
          <button
            onClick={() => setCurrentStepIndex((p) => Math.min(data.trace.length - 1, p + 1))}
            disabled={currentStepIndex === data.trace.length - 1}
            className="p-2 border border-[#141414] bg-white hover:bg-[#F0F0F0] disabled:opacity-50 text-[#141414] transition-colors"
          >
            <SkipForward className="w-4 h-4" />
          </button>
          <span className="ml-4 text-[10px] font-bold uppercase tracking-widest text-[#141414] opacity-50">
            Step {currentStepIndex + 1} / {data.trace.length}
          </span>
        </div>
        
        <div className="flex-1 md:ml-8 bg-white p-3 border border-[#141414] shadow-[2px_2px_0px_0px_rgba(20,20,20,0.1)]">
          <p className="text-xs text-[#141414] flex items-start">
            <ChevronRight className="w-4 h-4 mt-0.5 text-[#3B82F6] mr-2 flex-shrink-0" />
            <span className="leading-relaxed font-mono">{step.explanation}</span>
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
        {/* Code View */}
        <div className="flex-1 overflow-y-auto bg-[#FDFDFD] font-mono text-sm border-r border-[#141414]">
          <div className="p-4">
            {codeLines.map((line, i) => {
              const lineNumber = i + 1;
              const isActive = step.lineNumber === lineNumber;
              return (
                <div 
                  key={i} 
                  className={`flex items-center px-2 py-0.5 transition-colors duration-200 ${
                    isActive ? 'bg-[#3B82F6]/10 text-[#141414] border-l-2 border-[#3B82F6]' : 'text-[#141414] hover:bg-[#F9FAFB] border-l-2 border-transparent'
                  }`}
                >
                  <span className="w-8 text-right mr-4 text-[#A0A0A0] select-none text-xs">
                    {lineNumber}
                  </span>
                  <span className="whitespace-pre">{line || ' '}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Variables Sidebar */}
        <div className="w-full lg:w-80 bg-[#FDFDFD] overflow-y-auto flex flex-col">
          <div className="p-4 border-b border-[#141414] bg-[#F5F5F3]">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#141414]">Current Variables</h3>
          </div>
          <div className="p-4 flex-1">
            <AnimatePresence mode="popLayout">
              {step.variables.length === 0 ? (
                <motion.p 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  className="text-[#141414] opacity-50 text-xs italic font-mono"
                >
                  No variables in scope.
                </motion.p>
              ) : (
                <div className="space-y-3">
                  {step.variables.map((v, i) => (
                    <motion.div
                      layout
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      key={`${v.name}-${i}`}
                      className="bg-white border border-[#141414] p-3 shadow-[2px_2px_0px_0px_rgba(20,20,20,1)]"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-mono text-[#3B82F6] text-sm font-bold">{v.name}</span>
                        <span className="text-[9px] text-[#141414] font-mono px-1 py-0.5 bg-[#E4E3E0] uppercase font-bold">{v.type}</span>
                      </div>
                      <div className="font-mono text-[#059669] font-bold text-xs break-all">
                        {v.value}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
