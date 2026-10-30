import React from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-rust';
import { TraceStep } from '../types';

interface VSCodeEditorProps {
  code: string;
  onChangeCode?: (newCode: string) => void;
  language: string;
  isEditing: boolean;
  currentStep?: TraceStep;
  changedVariables?: Set<string>;
}

// Map language names to prism language identifiers
const getPrismLang = (lang: string): string => {
  const l = lang.toLowerCase();
  if (l.includes('python')) return 'python';
  if (l.includes('java') && !l.includes('script')) return 'java';
  if (l.includes('javascript') || l === 'js') return 'javascript';
  if (l.includes('typescript') || l === 'ts') return 'typescript';
  if (l.includes('c++') || l.includes('cpp')) return 'cpp';
  if (l.includes('go')) return 'go';
  if (l.includes('rust')) return 'rust';
  return 'python';
};

const getPlaceholder = (lang: string): string => {
  const l = lang.toLowerCase();
  if (l.includes('python')) {
    return `# Enter or paste your Python code here...\n# e.g.\ntotal = 0\nfor i in range(1, 5):\n    total += i`;
  }
  if (l.includes('javascript') || l.includes('typescript') || l === 'js' || l === 'ts') {
    return `// Enter or paste your ${lang} code here...\n// e.g.\nlet sum = 0;\nfor (let i = 1; i <= 4; i++) {\n    sum += i;\n}`;
  }
  if (l.includes('java')) {
    return `// Enter or paste your Java code here...\npublic class Main {\n    public static void main(String[] args) {\n        int x = 10;\n    }\n}`;
  }
  if (l.includes('c++') || l.includes('cpp')) {
    return `// Enter or paste your C++ code here...\n#include <iostream>\nint main() {\n    int sum = 0;\n    return 0;\n}`;
  }
  return `// Enter or paste your ${lang} code here...`;
};

// Bracket color cycles like VS Code Rainbow Brackets
const BRACKET_COLORS = ['#FFD700', '#DA70D6', '#179FFF'];

export function VSCodeEditor({
  code,
  onChangeCode,
  language,
  isEditing,
  currentStep,
  changedVariables,
}: VSCodeEditorProps) {
  const prismLang = getPrismLang(language);
  const lines = code.split('\n');
  const gutterRef = React.useRef<HTMLDivElement>(null);

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (gutterRef.current) {
      gutterRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newCode = code.substring(0, start) + '    ' + code.substring(end);
      onChangeCode?.(newCode);
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 4;
      });
    }
  };

  // Compute block scopes (indentation levels and block openers like for, while, def, if, class, {)
  const lineScopes = React.useMemo(() => {
    return lines.map((line, idx) => {
      // Calculate leading whitespace / indentation
      const match = line.match(/^(\s*)/);
      const leadingSpaces = match ? match[1].length : 0;
      const indentLevel = Math.floor(leadingSpaces / 4);

      // Check if line starts a block / loop
      const trimmed = line.trim();
      const isLoop = /^(for|while)\b/.test(trimmed);
      const isFunc = /^(def|function|async function|public|private|protected)\b/.test(trimmed) || /=>\s*\{?$/.test(trimmed);
      const isBranch = /^(if|elif|else if|else|switch|case|try|catch|finally)\b/.test(trimmed);
      const isClass = /^(class|struct|interface)\b/.test(trimmed);
      const isClosing = /^(\}|\)|\])/.test(trimmed) || trimmed === 'end';

      return {
        lineIdx: idx,
        leadingSpaces,
        indentLevel,
        isLoop,
        isFunc,
        isBranch,
        isClass,
        isClosing,
        isBlockOpener: isLoop || isFunc || isBranch || isClass || trimmed.endsWith('{') || trimmed.endsWith(':'),
      };
    });
  }, [lines]);

  // Syntax highlight a single line into rich VS Code styled tokens
  const renderHighlightedLine = (lineText: string) => {
    if (!lineText) return <span>&nbsp;</span>;

    try {
      const grammar = Prism.languages[prismLang] || Prism.languages.python;
      const tokens = Prism.tokenize(lineText, grammar);

      let bracketDepth = 0;

      const renderToken = (token: any, key: string | number): React.ReactNode => {
        if (typeof token === 'string') {
          // Token is raw string, check for rainbow brackets
          const chars = token.split('');
          return (
            <span key={key}>
              {chars.map((char, charIdx) => {
                if (char === '(' || char === '{' || char === '[') {
                  const color = BRACKET_COLORS[bracketDepth % BRACKET_COLORS.length];
                  bracketDepth++;
                  return (
                    <span key={charIdx} style={{ color, fontWeight: 600 }}>
                      {char}
                    </span>
                  );
                } else if (char === ')' || char === '}' || char === ']') {
                  bracketDepth = Math.max(0, bracketDepth - 1);
                  const color = BRACKET_COLORS[bracketDepth % BRACKET_COLORS.length];
                  return (
                    <span key={charIdx} style={{ color, fontWeight: 600 }}>
                      {char}
                    </span>
                  );
                }
                return char;
              })}
            </span>
          );
        }

        const type = token.type;
        const content = token.content;

        // Custom VS Code Dark+ color mapping
        let tokenColor = '#D4D4D4'; // default VS Code foreground
        let fontWeight: 'normal' | 'bold' = 'normal';
        let fontStyle: 'normal' | 'italic' = 'normal';

        if (type === 'keyword') {
          const controlKeywords = ['if', 'else', 'elif', 'for', 'while', 'return', 'yield', 'break', 'continue', 'try', 'catch', 'finally', 'throw'];
          if (typeof content === 'string' && controlKeywords.includes(content)) {
            tokenColor = '#C586C0'; // Purple for control flow in VS Code
          } else {
            tokenColor = '#569CD6'; // Blue for standard keywords (def, class, const, let, var, import, etc.)
          }
          fontWeight = 'bold';
        } else if (type === 'function' || type === 'function-variable') {
          tokenColor = '#DCDCAA'; // VS Code Yellow for functions
        } else if (type === 'string') {
          tokenColor = '#CE9178'; // VS Code Orange/Peach for strings
        } else if (type === 'number' || type === 'boolean') {
          tokenColor = '#B5CEA8'; // VS Code Light Green for numbers & booleans
        } else if (type === 'comment') {
          tokenColor = '#6A9955'; // VS Code Green for comments
          fontStyle = 'italic';
        } else if (type === 'operator') {
          tokenColor = '#D4D4D4';
        } else if (type === 'class-name' || type === 'builtin') {
          tokenColor = '#4EC9B0'; // VS Code Teal/Cyan for types & classes
        } else if (type === 'variable' || type === 'parameter') {
          tokenColor = '#9CDCFE'; // VS Code Light Blue for variables
        } else if (type === 'punctuation') {
          tokenColor = '#D4D4D4';
        }

        if (Array.isArray(content)) {
          return (
            <span key={key} style={{ color: tokenColor, fontWeight, fontStyle }}>
              {content.map((inner, innerIdx) => renderToken(inner, `${key}-${innerIdx}`))}
            </span>
          );
        }

        // Single token string
        if (typeof content === 'string') {
          // Check for brackets in punctuation
          if (content === '(' || content === '{' || content === '[') {
            const color = BRACKET_COLORS[bracketDepth % BRACKET_COLORS.length];
            bracketDepth++;
            return (
              <span key={key} style={{ color, fontWeight: 'bold' }}>
                {content}
              </span>
            );
          } else if (content === ')' || content === '}' || content === ']') {
            bracketDepth = Math.max(0, bracketDepth - 1);
            const color = BRACKET_COLORS[bracketDepth % BRACKET_COLORS.length];
            return (
              <span key={key} style={{ color, fontWeight: 'bold' }}>
                {content}
              </span>
            );
          }
        }

        return (
          <span key={key} style={{ color: tokenColor, fontWeight, fontStyle }}>
            {typeof content === 'string' ? content : renderToken(content, `${key}-nested`)}
          </span>
        );
      };

      return tokens.map((token, i) => renderToken(token, i));
    } catch {
      return <span>{lineText}</span>;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#1E1E1E] text-[#D4D4D4] font-mono text-xs select-text overflow-hidden">
      
      {/* VS Code Tab Bar / Mini Status */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#252526] border-b border-[#333333] text-[10px]">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-2.5 py-1 bg-[#1E1E1E] border-t border-[#007ACC] text-white font-sans text-[11px]">
            <span className="text-[#3B82F6] font-bold">●</span>
            <span className="font-mono">{language.toLowerCase()}</span>
          </div>
          <span className="text-[#858585] text-[10px] hidden sm:inline">
            VS Code Dark+ • Grid & Indent Guides Active
          </span>
        </div>

        <div className="flex items-center gap-2 text-[#858585] text-[9px]">
          <span>UTF-8</span>
          <span>Tab Size: 4</span>
          <span>{code.trim().length > 0 ? `${lines.length} lines` : 'Empty (Ready)'}</span>
        </div>
      </div>

      {/* Main Viewport */}
      <div className="flex-1 flex overflow-auto relative bg-[#1E1E1E]">
        
        {/* Editable Mode */}
        {isEditing ? (
          <div className="flex-1 flex min-h-full min-w-max">
            {/* Gutter with Line Numbers */}
            <div
              ref={gutterRef}
              className="w-12 bg-[#1E1E1E] border-r border-[#333333] py-2 flex flex-col items-end pr-2.5 select-none text-[#858585] text-xs font-mono overflow-hidden"
            >
              {lines.map((_, i) => (
                <div key={i} className="h-6 leading-6 text-right">
                  {i + 1}
                </div>
              ))}
            </div>

            {/* Editable Textarea with VS Code Dark Styling */}
            <textarea
              value={code}
              onChange={(e) => onChangeCode && onChangeCode(e.target.value)}
              onScroll={handleScroll}
              onKeyDown={handleKeyDown}
              placeholder={getPlaceholder(language)}
              className="flex-1 p-2 bg-[#1E1E1E] text-[#D4D4D4] font-mono text-xs leading-6 focus:outline-none resize-none whitespace-pre tab-4 selection:bg-[#264F78]"
              style={{ tabSize: 4 }}
              spellCheck={false}
            />
          </div>
        ) : (
          /* Visualization & Tracing Mode with VS Code Dark Theme */
          <div className="flex-1 flex flex-col min-h-full min-w-max py-1">
            {lines.map((line, i) => {
              const lineNumber = i + 1;
              const isActive = currentStep?.lineNumber === lineNumber;

              // Find variables modified on this active line
              const lineVars = isActive && currentStep
                ? currentStep.variables.filter((v) => changedVariables?.has(v.name))
                : [];

              return (
                <div
                  key={i}
                  className={`flex items-center h-6 leading-6 transition-colors duration-100 relative ${
                    isActive
                      ? 'bg-[#2D3748] border-y border-[#3B82F6]/50 shadow-[inset_2px_0_0_0_#3B82F6]'
                      : 'hover:bg-[#2A2D2E]/50 border-y border-transparent'
                  }`}
                >
                  {/* Left Gutter: Breakpoint / Execution Arrow & Line Number */}
                  <div
                    className={`w-12 flex-shrink-0 flex items-center justify-end pr-2.5 select-none border-r border-[#333333] ${
                      isActive
                        ? 'bg-[#264F78]/40 text-[#FFCC00] font-bold'
                        : 'bg-[#1E1E1E] text-[#858585]'
                    }`}
                  >
                    {isActive && (
                      <span className="text-[#FFCC00] text-[10px] mr-1 font-bold">
                        ▶
                      </span>
                    )}
                    <span className="text-xs">{lineNumber}</span>
                  </div>

                  {/* Code Line Content */}
                  <div className="flex-1 flex items-center px-3 whitespace-pre font-mono">
                    <span className="leading-6">{renderHighlightedLine(line)}</span>

                    {/* Inline Active Step Variable Mutation Badges */}
                    {isActive && lineVars.length > 0 && (
                      <div className="flex items-center gap-1.5 ml-4 flex-shrink-0 select-none">
                        {lineVars.map((v) => (
                          <span
                            key={v.name}
                            className="text-[9px] px-1.5 py-0.5 bg-[#007ACC] text-white font-bold rounded-xs shadow-sm flex items-center gap-1"
                            title={`${v.name} = ${v.value}`}
                          >
                            <span>{v.name}</span>
                            <span className="text-[#FFD700]">:=</span>
                            <span className="text-white max-w-[120px] truncate">{v.value}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* VS Code Bottom Status Bar */}
      <div className="flex items-center justify-between px-3 py-1 bg-[#007ACC] text-white text-[10px] font-sans select-none">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
            {isEditing ? 'EDITING MODE' : 'LIVE TRACE VISUALIZER'}
          </span>
          {currentStep && (
            <span className="font-mono text-[9px] bg-[#005A9E] px-1.5 py-0.5 rounded-xs">
              Ln {currentStep.lineNumber}, Col 1
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 text-[9px] font-mono">
          <span>Language: {language}</span>
          <span>Spaces: 4</span>
          <span>Rainbow Brackets: ON</span>
        </div>
      </div>
    </div>
  );
}
