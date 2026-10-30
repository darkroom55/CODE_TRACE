export interface Variable {
  name: string;
  value: string;
  type: string;
}

export interface TraceStep {
  stepNumber: number;
  lineNumber: number;
  explanation: string;
  variables: Variable[];
  stdout?: string;
}

export interface VisualizationResult {
  completedCode: string;
  trace: TraceStep[];
  output?: string;
}

export interface VariableInsight {
  variableName: string;
  stepNumber: number;
  lineNumber: number;
  mutationReason: string;
  summary: string;
  algorithmicRole: string;
  impact: string;
  codeContextSnippet?: string;
}

export interface SubmissionHistoryItem {
  id: string;
  title: string;
  language: string;
  code: string;
  patchInput?: string;
  result: VisualizationResult;
  timestamp: number;
  stepCount: number;
  executionTimeMs: number;
}

