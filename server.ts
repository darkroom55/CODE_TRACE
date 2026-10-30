import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type, Schema } from "@google/genai";
import * as dotenv from "dotenv";

dotenv.config({ path: [".env.local", ".env"] });

export const app = express();
app.use(express.json());

// In-memory cache for ultra-fast repeated execution simulation
const executionCache = new Map<string, any>();

async function startServer() {
  const PORT = Number(process.env.PORT) || 3000;

  // API Route for visualization
  app.post("/api/visualize", async (req, res) => {
    try {
      const { code, language } = req.body;
      if (!code || !language) {
        return res.status(400).json({ error: "Code and language are required" });
      }

      // Fast cache hit
      const cacheKey = `${language}:::${code.trim()}`;
      if (executionCache.has(cacheKey)) {
        return res.json(executionCache.get(cacheKey));
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Gemini API key is not configured" });
      }

      const ai = new GoogleGenAI({ apiKey });

      const prompt = `Simulate the step-by-step runtime execution of the user's EXACT ${language} code.

CRITICAL REQUIREMENTS:
1. DO NOT rewrite, replace, modify, or reformat the user's original code. The user wants to see THEIR exact code visualized.
2. Every trace item's 'lineNumber' MUST strictly correspond to the exact 1-indexed line number of the provided CODE below.
3. Trace sequential execution through loops (each iteration with updated indices/variables), conditional branches, variable assignments, and returns (up to 16 key steps).
4. Capture every variable in scope at each step with its exact evaluated string value and type.
5. Keep explanations clear, precise, and under 14 words.

CODE TO TRACE (1-indexed lines):
\`\`\`${language}
${code}
\`\`\``;

      const responseSchema: Schema = {
        type: Type.OBJECT,
        properties: {
          completedCode: { type: Type.STRING, description: "The exact user code provided without modifications" },
          trace: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                stepNumber: { type: Type.INTEGER },
                lineNumber: { type: Type.INTEGER, description: "Exact 1-indexed line number from the provided CODE" },
                explanation: { type: Type.STRING, description: "Concise step explanation" },
                variables: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      value: { type: Type.STRING },
                      type: { type: Type.STRING },
                    },
                    required: ["name", "value", "type"]
                  },
                },
              },
              required: ["stepNumber", "lineNumber", "explanation", "variables"]
            },
          },
        },
        required: ["completedCode", "trace"]
      };

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are a precise, ultra-fast code execution engine. Simulate the exact lines of code given without rewriting them, tracking variable values accurately across all execution steps.",
          responseMimeType: "application/json",
          responseSchema: responseSchema,
        },
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("No response text from Gemini");
      }

      let cleaned = responseText.trim();
      if (cleaned.startsWith("```json")) {
        cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      } else if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
      }

      const result = JSON.parse(cleaned);
      // Guarantee completedCode always equals the user's code if missing or modified
      if (!result.completedCode || result.completedCode.trim() === '') {
        result.completedCode = code;
      }
      if (!Array.isArray(result.trace)) {
        result.trace = [];
      }

      // Store in memory cache (limit cache size to 100 entries)
      if (executionCache.size > 100) {
        const firstKey = executionCache.keys().next().value;
        if (firstKey) executionCache.delete(firstKey);
      }
      executionCache.set(cacheKey, result);

      res.json(result);
    } catch (error: any) {
      console.error("Error generating visualization:", error);
      res.status(500).json({ error: error.message || "Failed to generate visualization" });
    }
  });

  // API Route for Deep Insight on a specific variable
  app.post("/api/variable-insight", async (req, res) => {
    try {
      const {
        code,
        language,
        variableName,
        currentValue,
        previousValue,
        stepNumber,
        lineNumber,
        stepExplanation,
      } = req.body;

      if (!code || !variableName) {
        return res.status(400).json({ error: "Code and variableName are required" });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Gemini API key is not configured" });
      }

      const ai = new GoogleGenAI({ apiKey });

      const prompt = `Analyze why variable '${variableName}' has the value '${currentValue}' (previously '${previousValue || "uninitialized"}') at Step ${stepNumber} (Line ${lineNumber}) in this ${language} program.

Surrounding Step Context: "${stepExplanation || "Executing line " + lineNumber}"

SOURCE CODE:
\`\`\`${language}
${code}
\`\`\`

Explain clearly:
1. Why this variable changed/was assigned at this line based on the code's logic.
2. The role of this variable in the algorithm (e.g. pointer, accumulator, cache, iteration variable).
3. The impact or next consequence in subsequent execution.
4. The category/mutation reason (e.g., 'Array Element Swap', 'Arithmetic Accumulation', 'Pointer Recalibration', 'Loop Counter Increment', 'Conditional Assignment').`;

      const responseSchema: Schema = {
        type: Type.OBJECT,
        properties: {
          variableName: { type: Type.STRING },
          stepNumber: { type: Type.INTEGER },
          lineNumber: { type: Type.INTEGER },
          mutationReason: { type: Type.STRING, description: "Short category like 'Pointer Recalibration' or 'Accumulation'" },
          summary: { type: Type.STRING, description: "Clear 1-2 sentence explanation of why its value changed here" },
          algorithmicRole: { type: Type.STRING, description: "Role of this variable in the algorithm" },
          impact: { type: Type.STRING, description: "What this new value causes in upcoming steps" },
          codeContextSnippet: { type: Type.STRING, description: "The exact line or operation in code that caused this" },
        },
        required: ["variableName", "stepNumber", "lineNumber", "mutationReason", "summary", "algorithmicRole", "impact"]
      };

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are an expert debugger and computer science educator. Provide ultra-clear, concise deep insights into variable mutations.",
          responseMimeType: "application/json",
          responseSchema: responseSchema,
        },
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("No response text received from Gemini");
      }

      let cleaned = responseText.trim();
      if (cleaned.startsWith("```json")) {
        cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      } else if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
      }

      const insight = JSON.parse(cleaned);
      res.json(insight);
    } catch (error: any) {
      console.error("Error generating variable insight:", error);
      res.status(500).json({ error: error.message || "Failed to generate variable insight" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer().catch(console.error);
}

export default app;

