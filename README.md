# CODE_TRACE ⚡

> **Interactive Step-by-Step AI Code Execution Visualizer & State Inspector**

CODE_TRACE is a modern web application that simulates and visualizes the runtime execution of source code step-by-step. It breaks down complex algorithms line-by-line, tracks variable mutations in real time, inspects call stacks and heap memory, and provides AI-powered debugging insights.

---

## ✨ Features

- **Multi-Language Support**: Interactive visualization for Python, Java, JavaScript, TypeScript, C++, Go, and Rust.
- **Line-by-Line Tracing**: Follow execution arrows, active loops, conditionals, and return values.
- **Real-Time Variable Tracking**: Live variable inspection table, inline mutation badges, and dedicated watched variable panels.
- **Deep AI Insights**: Explain *why* a variable mutated at any given step and understand its algorithmic role.
- **Code Diff & Patching**: Compare code variations or patch missing function definitions directly in the console.
- **Fluid Scrubber**: Scrub back and forth across execution history with variable playback speeds.
- **Security Hardened**: Built-in API rate limiting, payload size limits, HTTP security headers, and prompt injection guards.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Prism.js, Lucide Icons
- **Backend / API**: Node.js, Express, Google GenAI SDK (Gemini 2.5 Flash)
- **Tooling & Bundler**: Vite, ESBuild, TSX

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- A Google Gemini API Key from [Google AI Studio](https://aistudio.google.com/)

### 1. Installation

```bash
# Clone the repository
git clone https://github.com/darkroom55/CODE_TRACE.git

# Enter project directory
cd CODE_TRACE

# Install dependencies
npm install
```

### 2. Environment Configuration

Create a `.env.local` file in the project root:

```env
GEMINI_API_KEY=your_actual_gemini_api_key_here
```

### 3. Run Locally

```bash
# Start development server
npm run dev
```

Open your browser and navigate to **`http://localhost:3000`**.

---

## ☁️ Deployment on Vercel

This project includes pre-configured serverless function support for [Vercel](https://vercel.com):

1. Push this repository to your GitHub account.
2. Go to [Vercel](https://vercel.com) and click **"Add New Project"**.
3. Import your `CODE_TRACE` repository.
4. In **Project Settings** → **Environment Variables**, add:
   - `GEMINI_API_KEY`: Your Gemini API key.
5. Click **Deploy**.

---

## 🔒 Security Architecture

- **No Secrets in Client**: API keys are strictly retained on the backend and never exposed to the browser.
- **Rate Limiting**: Protects backend endpoints against brute-force abuse and API quota exhaustion.
- **Payload Sanitization**: Enforces strict size caps (25,000 chars) and typed validation on all incoming code inputs.
- **HTTP Protection Headers**: Enforces `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, and disables `X-Powered-By`.

---

## 📄 License

MIT License. Free for personal and educational use.
