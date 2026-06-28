import { useState } from "react";
import { 
  Search, 
  FileText, 
  CheckCircle2, 
  Circle, 
  Play, 
  Download, 
  AlertTriangle, 
  RefreshCw, 
  ExternalLink, 
  Eye, 
  Terminal, 
  Code,
  Shield,
  ThumbsUp,
  Award,
  Edit,
  Save,
  ChevronDown,
  FileDown,
  BookOpen,
  Send,
  Sparkles,
  BarChart3,
  TrendingUp,
  CheckCircle,
  Clock
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { codeFiles } from "./codeData";
import { exportToPDF } from "./utils/export";

// Type definitions
type StepId = "idle" | "searching" | "scraping" | "writing" | "critiquing" | "done";

interface Source {
  title: string;
  url: string;
}

const SUGGESTIONS = [
  "Impact of room-temperature superconductors on quantum computing",
  "Advancements in nuclear fusion energy research in 2026",
  "Neural architecture search techniques for green AI",
  "Deep sea hydrothermal vents bioluminescent species exploration"
];

export default function App() {
  const [topic, setTopic] = useState("");
  const [currentStep, setCurrentStep] = useState<StepId>("idle");
  const [error, setError] = useState<string | null>(null);

  // States to hold step outputs
  const [searchResults, setSearchResults] = useState("");
  const [sources, setSources] = useState<Source[]>([]);
  const [scrapedContent, setScrapedContent] = useState("");
  const [report, setReport] = useState("");
  const [feedback, setFeedback] = useState("");

  // Editor states
  const [isEditingReport, setIsEditingReport] = useState(false);
  const [tempReport, setTempReport] = useState("");
  const [isReevaluating, setIsReevaluating] = useState(false);
  const [showDownloadDropdown, setShowDownloadDropdown] = useState(false);

  // Tabs
  const [activeTab, setActiveTab] = useState<"dashboard" | "code">("dashboard");
  const [selectedFile, setSelectedFile] = useState<keyof typeof codeFiles>("tools");

  // Custom simple Markdown renderer to format the generated LLM text elegantly for Day Mode
  const renderMarkdown = (text: string) => {
    if (!text) return null;
    return text.split("\n").map((line, idx) => {
      const trimmed = line.trim();
      
      // H1 headers
      if (trimmed.startsWith("# ")) {
        return (
          <h1 key={idx} className="font-sans text-2xl font-extrabold text-slate-900 mt-6 mb-3 tracking-tight border-b border-slate-200 pb-2">
            {trimmed.substring(2)}
          </h1>
        );
      }
      // H2 headers
      if (trimmed.startsWith("## ")) {
        const title = trimmed.substring(3);
        // Highlight scores specifically
        if (title.toLowerCase().includes("score")) {
          return (
            <h2 key={idx} className="font-sans text-lg font-bold text-emerald-600 mt-5 mb-2 flex items-center gap-2">
              <Award className="w-5 h-5 text-emerald-500" /> {title}
            </h2>
          );
        }
        return (
          <h2 key={idx} className="font-sans text-lg font-bold text-slate-800 mt-5 mb-2">
            {title}
          </h2>
        );
      }
      // H3 headers
      if (trimmed.startsWith("### ")) {
        return (
          <h3 key={idx} className="font-sans text-base font-semibold text-slate-700 mt-4 mb-2">
            {trimmed.substring(4)}
          </h3>
        );
      }
      // Lists
      if (trimmed.startsWith("- ")) {
        return (
          <li key={idx} className="font-sans text-slate-600 ml-5 list-disc my-1.5 leading-relaxed">
            {trimmed.substring(2)}
          </li>
        );
      }
      // Strong Bold
      if (trimmed.startsWith("**") && trimmed.endsWith("**")) {
        return (
          <p key={idx} className="font-sans text-slate-900 font-bold my-2 leading-relaxed">
            {trimmed.slice(2, -2)}
          </p>
        );
      }
      // Blockquotes
      if (trimmed.startsWith("> ")) {
        return (
          <blockquote key={idx} className="border-l-4 border-blue-500 bg-slate-50 px-4 py-2.5 my-3 rounded-r text-slate-700 italic font-sans text-sm">
            {trimmed.substring(2)}
          </blockquote>
        );
      }
      // Empty lines
      if (!trimmed) {
        return <div key={idx} className="h-2" />;
      }
      // Default text paragraph
      return (
        <p key={idx} className="font-sans text-slate-600 my-2 leading-relaxed text-sm md:text-base">
          {trimmed}
        </p>
      );
    });
  };

  // Triggers sequential 4-step execution via the full-stack server
  const handleTriggerPipeline = async (searchTopic: string) => {
    if (!searchTopic.trim()) return;
    setError(null);
    setSearchResults("");
    setScrapedContent("");
    setReport("");
    setFeedback("");
    setSources([]);

    // 1. Search Agent Execution
    setCurrentStep("searching");
    try {
      const searchRes = await fetch("/api/research/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: searchTopic })
      });
      if (!searchRes.ok) throw new Error("Search Agent failed to gather information.");
      const searchData = await searchRes.json();
      setSearchResults(searchData.text);
      setSources(searchData.sources || []);

      // 2. Reader Agent Execution
      setCurrentStep("scraping");
      const scrapeRes = await fetch("/api/research/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: searchTopic, searchResults: searchData.text })
      });
      if (!scrapeRes.ok) throw new Error("Reader Agent failed to read and scrape URL.");
      const scrapeData = await scrapeRes.json();
      setScrapedContent(scrapeData.text);

      // 3. Writer Agent Execution
      setCurrentStep("writing");
      const combinedResearch = `--- EXPLORATORY WEB SEARCH DATA ---\n${searchData.text}\n\n--- DEEP READ SCRAPED DETAILS ---\n${scrapeData.text}`;
      const writeRes = await fetch("/api/research/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: searchTopic, research: combinedResearch })
      });
      if (!writeRes.ok) throw new Error("Writer Agent failed to synthesize the report draft.");
      const writeData = await writeRes.json();
      setReport(writeData.text);

      // 4. Critic Agent Execution
      setCurrentStep("critiquing");
      const criticRes = await fetch("/api/research/critic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report: writeData.text })
      });
      if (!criticRes.ok) throw new Error("Critic Agent failed to complete peer review.");
      const criticData = await criticRes.json();
      setFeedback(criticData.text);

      setCurrentStep("done");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred during multi-agent orchestration.");
      setCurrentStep("idle");
    }
  };

  // Download the report as markdown
  const handleDownloadReport = () => {
    if (!report) return;
    const blob = new Blob([report], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Research_Report_${topic.trim().replace(/\s+/g, "_")}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Re-evaluates report draft via Critic Agent
  const handleReevaluateReport = async (reportContent: string) => {
    if (!reportContent.trim()) return;
    setIsReevaluating(true);
    setError(null);
    try {
      const criticRes = await fetch("/api/research/critic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report: reportContent })
      });
      if (!criticRes.ok) throw new Error("Critic Agent failed to complete peer review.");
      const criticData = await criticRes.json();
      setFeedback(criticData.text);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to complete peer review re-evaluation.");
    } finally {
      setIsReevaluating(false);
    }
  };

  return (
    <div id="researchmind-root" className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      
      {/* Top Navigation */}
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur sticky top-0 z-50 px-6 py-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-600/10">
            <Terminal className="w-5 h-5 text-white font-bold" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent font-sans">
              ResearchMind
            </h1>
            <p className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">Multi-Agent System</p>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-slate-100 border border-slate-200/80 rounded-lg p-0.5 shadow-inner">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
              activeTab === "dashboard"
                ? "bg-white text-blue-600 shadow-xs border border-slate-200/40"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            Live System
          </button>
          <button
            onClick={() => setActiveTab("code")}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
              activeTab === "code"
                ? "bg-white text-blue-600 shadow-xs border border-slate-200/40"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            Python Workspace
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto flex flex-col lg:flex-row gap-6">
        
        {activeTab === "dashboard" ? (
          <>
            {/* LEFT COLUMN: Pipeline control & state monitor */}
            <section className="lg:w-5/12 flex flex-col gap-6">
              
              {/* Scope Config Card */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm shadow-slate-100">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 font-mono">
                  1. Configure Scope
                </h3>
                <div className="relative">
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Enter research topic..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                  <Search className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-slate-400" />
                </div>

                {/* Suggestion Chips */}
                <div className="mt-3.5">
                  <p className="text-[11px] text-slate-400 mb-2 font-mono">Suggested Topics:</p>
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTIONS.map((s, idx) => (
                      <button
                        key={idx}
                        onClick={() => setTopic(s)}
                        className="text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-900 px-2.5 py-1.5 rounded-md transition-all text-left"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  disabled={!topic.trim() || currentStep !== "idle" && currentStep !== "done"}
                  onClick={() => handleTriggerPipeline(topic)}
                  className="w-full mt-5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-500/10 cursor-pointer disabled:cursor-not-allowed"
                >
                  {currentStep !== "idle" && currentStep !== "done" ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      Pipeline Processing...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-white" />
                      Run Research Pipeline
                    </>
                  )}
                </button>

                {error && (
                  <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3.5 flex items-start gap-2.5 text-xs text-red-600 animate-pulse">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                    <p>{error}</p>
                  </div>
                )}
              </div>

              {/* Status Stepper Card */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm shadow-slate-100 flex-1 flex flex-col">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 font-mono">
                  2. Agent Pipeline Status
                </h3>

                <div className="flex-1 flex flex-col justify-between gap-4">
                  {/* Step 1 */}
                  <div className={`p-3.5 rounded-lg border transition-all flex items-start justify-between ${
                    currentStep === "searching" 
                      ? "bg-blue-50/60 border-blue-200/80 shadow-xs" 
                      : ["scraping", "writing", "critiquing", "done"].includes(currentStep)
                      ? "bg-emerald-50/40 border-emerald-100"
                      : "bg-slate-50 border-slate-100"
                  }`}>
                    <div className="flex gap-3">
                      {["scraping", "writing", "critiquing", "done"].includes(currentStep) ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      ) : currentStep === "searching" ? (
                        <RefreshCw className="w-5 h-5 text-blue-600 shrink-0 mt-0.5 animate-spin" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-300 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <h4 className={`text-sm font-bold tracking-tight ${currentStep === "searching" ? "text-blue-700" : ["scraping", "writing", "critiquing", "done"].includes(currentStep) ? "text-slate-800" : "text-slate-500"}`}>
                          Explorer Agent
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">Tavily Web Search & Extraction</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                      currentStep === "searching" 
                        ? "bg-blue-100 text-blue-700 font-bold" 
                        : ["scraping", "writing", "critiquing", "done"].includes(currentStep)
                        ? "bg-emerald-100 text-emerald-800 font-medium"
                        : "bg-slate-100 text-slate-400"
                    }`}>
                      {["scraping", "writing", "critiquing", "done"].includes(currentStep) ? "DONE" : currentStep === "searching" ? "RUNNING" : "WAITING"}
                    </span>
                  </div>

                  {/* Step 2 */}
                  <div className={`p-3.5 rounded-lg border transition-all flex items-start justify-between ${
                    currentStep === "scraping" 
                      ? "bg-blue-50/60 border-blue-200/80 shadow-xs" 
                      : ["writing", "critiquing", "done"].includes(currentStep)
                      ? "bg-emerald-50/40 border-emerald-100"
                      : "bg-slate-50 border-slate-100"
                  }`}>
                    <div className="flex gap-3">
                      {["writing", "critiquing", "done"].includes(currentStep) ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      ) : currentStep === "scraping" ? (
                        <RefreshCw className="w-5 h-5 text-blue-600 shrink-0 mt-0.5 animate-spin" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-300 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <h4 className={`text-sm font-bold tracking-tight ${currentStep === "scraping" ? "text-blue-700" : ["writing", "critiquing", "done"].includes(currentStep) ? "text-slate-800" : "text-slate-500"}`}>
                          Reader Agent
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">BeautifulSoup4 Web Scraping</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                      currentStep === "scraping" 
                        ? "bg-blue-100 text-blue-700 font-bold" 
                        : ["writing", "critiquing", "done"].includes(currentStep)
                        ? "bg-emerald-100 text-emerald-800 font-medium"
                        : "bg-slate-100 text-slate-400"
                    }`}>
                      {["writing", "critiquing", "done"].includes(currentStep) ? "DONE" : currentStep === "scraping" ? "RUNNING" : "WAITING"}
                    </span>
                  </div>

                  {/* Step 3 */}
                  <div className={`p-3.5 rounded-lg border transition-all flex items-start justify-between ${
                    currentStep === "writing" 
                      ? "bg-blue-50/60 border-blue-200/80 shadow-xs" 
                      : ["critiquing", "done"].includes(currentStep)
                      ? "bg-emerald-50/40 border-emerald-100"
                      : "bg-slate-50 border-slate-100"
                  }`}>
                    <div className="flex gap-3">
                      {["critiquing", "done"].includes(currentStep) ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      ) : currentStep === "writing" ? (
                        <RefreshCw className="w-5 h-5 text-blue-600 shrink-0 mt-0.5 animate-spin" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-300 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <h4 className={`text-sm font-bold tracking-tight ${currentStep === "writing" ? "text-blue-700" : ["critiquing", "done"].includes(currentStep) ? "text-slate-800" : "text-slate-500"}`}>
                          Writer Agent
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">Synthesize structured Markdown draft</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                      currentStep === "writing" 
                        ? "bg-blue-100 text-blue-700 font-bold" 
                        : ["critiquing", "done"].includes(currentStep)
                        ? "bg-emerald-100 text-emerald-800 font-medium"
                        : "bg-slate-100 text-slate-400"
                    }`}>
                      {["critiquing", "done"].includes(currentStep) ? "DONE" : currentStep === "writing" ? "RUNNING" : "WAITING"}
                    </span>
                  </div>

                  {/* Step 4 */}
                  <div className={`p-3.5 rounded-lg border transition-all flex items-start justify-between ${
                    currentStep === "critiquing" 
                      ? "bg-blue-50/60 border-blue-200/80 shadow-xs" 
                      : currentStep === "done"
                      ? "bg-emerald-50/40 border-emerald-100"
                      : "bg-slate-50 border-slate-100"
                  }`}>
                    <div className="flex gap-3">
                      {currentStep === "done" ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      ) : currentStep === "critiquing" ? (
                        <RefreshCw className="w-5 h-5 text-blue-600 shrink-0 mt-0.5 animate-spin" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-300 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <h4 className={`text-sm font-bold tracking-tight ${currentStep === "critiquing" ? "text-blue-700" : currentStep === "done" ? "text-slate-800" : "text-slate-500"}`}>
                          Critic Agent
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">Evaluation & Grading Review</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                      currentStep === "critiquing" 
                        ? "bg-blue-100 text-blue-700 font-bold" 
                        : currentStep === "done"
                        ? "bg-emerald-100 text-emerald-800 font-medium"
                        : "bg-slate-100 text-slate-400"
                    }`}>
                      {currentStep === "done" ? "DONE" : currentStep === "critiquing" ? "RUNNING" : "WAITING"}
                    </span>
                  </div>
                </div>
              </div>

            </section>

            {/* RIGHT COLUMN: Results explorer / Markdown report */}
            <section className="lg:w-7/12 flex flex-col gap-6">
              
              <AnimatePresence mode="wait">
                {currentStep === "idle" ? (
                  <motion.div
                    key="idle"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="h-full bg-white border border-slate-200 rounded-xl p-10 flex flex-col items-center justify-center text-center gap-4 shadow-sm shadow-slate-100"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-inner">
                      <Terminal className="w-8 h-8 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-800">System Ready</h3>
                      <p className="text-sm text-slate-500 max-w-sm mt-1.5 leading-relaxed font-sans">
                        Specify a research topic in the control panel and initiate the multi-agent orchestration pipeline to collect, analyze, synthesize and review findings.
                      </p>
                    </div>

                    {/* Interactive Pipeline Diagram Placeholder */}
                    <div className="mt-4 w-full max-w-md border border-slate-100 rounded-lg p-3.5 bg-slate-50/50 text-left">
                      <p className="text-[10px] text-slate-400 font-mono tracking-wider uppercase mb-2">Sequential Pipeline Blueprint</p>
                      <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-mono">
                        <div className="p-2 bg-white rounded border border-slate-200 text-slate-500">Explorer</div>
                        <div className="p-2 bg-white rounded border border-slate-200 text-slate-500">Reader</div>
                        <div className="p-2 bg-white rounded border border-slate-200 text-slate-500">Writer</div>
                        <div className="p-2 bg-white rounded border border-slate-200 text-slate-500">Critic</div>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="active"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col gap-6 w-full h-full"
                  >
                    {/* Pipeline Interactive Flow Diagram (When running or done) */}
                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                      <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                        <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-blue-500" /> Live Orchestration Map
                        </span>
                        <span className="text-[10px] font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100 font-bold flex items-center gap-1">
                          <Clock className="w-3 h-3 animate-pulse" /> Active Pipeline
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-1 sm:gap-2 text-[10px] sm:text-xs">
                        <div className={`flex-1 p-2 rounded-lg text-center border transition-all ${
                          currentStep === "searching" ? "bg-blue-50 border-blue-300 text-blue-700 font-bold shadow-xs scale-102" : "bg-slate-50 border-slate-200 text-slate-400"
                        }`}>
                          <p className="font-mono font-bold">1. Explorer</p>
                          <p className="text-[9px] text-slate-400 hidden sm:block">Searching Web</p>
                        </div>
                        <div className="text-slate-300 text-center font-bold">➔</div>
                        <div className={`flex-1 p-2 rounded-lg text-center border transition-all ${
                          currentStep === "scraping" ? "bg-blue-50 border-blue-300 text-blue-700 font-bold shadow-xs scale-102" : "bg-slate-50 border-slate-200 text-slate-400"
                        }`}>
                          <p className="font-mono font-bold">2. Reader</p>
                          <p className="text-[9px] text-slate-400 hidden sm:block">Extracting Page</p>
                        </div>
                        <div className="text-slate-300 text-center font-bold">➔</div>
                        <div className={`flex-1 p-2 rounded-lg text-center border transition-all ${
                          currentStep === "writing" ? "bg-blue-50 border-blue-300 text-blue-700 font-bold shadow-xs scale-102" : "bg-slate-50 border-slate-200 text-slate-400"
                        }`}>
                          <p className="font-mono font-bold">3. Writer</p>
                          <p className="text-[9px] text-slate-400 hidden sm:block">Drafting Report</p>
                        </div>
                        <div className="text-slate-300 text-center font-bold">➔</div>
                        <div className={`flex-1 p-2 rounded-lg text-center border transition-all ${
                          currentStep === "critiquing" ? "bg-blue-50 border-blue-300 text-blue-700 font-bold shadow-xs scale-102" : "bg-slate-50 border-slate-200 text-slate-400"
                        }`}>
                          <p className="font-mono font-bold">4. Critic</p>
                          <p className="text-[9px] text-slate-400 hidden sm:block">Peer Review</p>
                        </div>
                      </div>
                    </div>

                    {/* Primary Report View (only available when report drafting completes or done) */}
                    {report && (
                      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm shadow-slate-100">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-4 mb-4 gap-3">
                          <div className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-blue-600" />
                            <h3 className="text-base font-bold text-slate-800">
                              {isEditingReport ? "Editing Research Report" : "Compiled Research Report"}
                            </h3>
                          </div>
                          
                          <div className="flex items-center gap-2 flex-wrap">
                            {!isEditingReport ? (
                              <>
                                <button
                                  onClick={() => {
                                    setTempReport(report);
                                    setIsEditingReport(true);
                                  }}
                                  className="bg-slate-50 hover:bg-slate-100 hover:text-slate-950 text-slate-700 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all font-semibold border border-slate-200 cursor-pointer"
                                >
                                  <Edit className="w-3.5 h-3.5 text-slate-500" />
                                  Edit Report
                                </button>
                                
                                <div className="relative">
                                  <button
                                    onClick={() => setShowDownloadDropdown(!showDownloadDropdown)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all font-bold cursor-pointer shadow-md shadow-blue-500/10"
                                  >
                                    <Download className="w-3.5 h-3.5 text-white" />
                                    Export As
                                    <ChevronDown className="w-3.5 h-3.5 text-white" />
                                  </button>
                                  
                                  <AnimatePresence>
                                    {showDownloadDropdown && (
                                      <>
                                        <div 
                                          className="fixed inset-0 z-10" 
                                          onClick={() => setShowDownloadDropdown(false)}
                                        />
                                        <motion.div
                                          initial={{ opacity: 0, y: -8 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          exit={{ opacity: 0, y: -8 }}
                                          transition={{ duration: 0.15 }}
                                          className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-20 overflow-hidden"
                                        >
                                          <button
                                            onClick={() => {
                                              handleDownloadReport();
                                              setShowDownloadDropdown(false);
                                            }}
                                            className="w-full text-left px-4 py-2.5 text-xs text-slate-700 hover:text-slate-900 hover:bg-slate-50 flex items-center gap-2 transition-all cursor-pointer border-b border-slate-100/60"
                                          >
                                            <FileText className="w-4 h-4 text-blue-500" />
                                            <span>Markdown (.md)</span>
                                          </button>
                                          
                                          <button
                                            onClick={() => {
                                              exportToPDF(topic, report);
                                              setShowDownloadDropdown(false);
                                            }}
                                            className="w-full text-left px-4 py-2.5 text-xs text-slate-700 hover:text-slate-900 hover:bg-slate-50 flex items-center gap-2 transition-all cursor-pointer"
                                          >
                                            <FileDown className="w-4 h-4 text-blue-500" />
                                            <span>Document (.pdf)</span>
                                          </button>
                                        </motion.div>
                                      </>
                                    )}
                                  </AnimatePresence>
                                </div>
                              </>
                            ) : (
                              <span className="text-[11px] text-blue-600 font-mono font-bold uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded">Draft Mode</span>
                            )}
                          </div>
                        </div>

                        {/* Report container / Edit textarea */}
                        {!isEditingReport ? (
                          <div className="max-h-[380px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-slate-50 mb-2">
                            <div className="prose prose-slate max-w-none text-slate-700">
                              {renderMarkdown(report)}
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-3">
                            <textarea
                              value={tempReport}
                              onChange={(e) => setTempReport(e.target.value)}
                              rows={15}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3.5 font-mono text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-y min-h-[250px]"
                              placeholder="Write or edit your Markdown report here..."
                            />
                            
                            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                              <button
                                onClick={() => setIsEditingReport(false)}
                                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all cursor-pointer"
                              >
                                Cancel
                              </button>

                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    setReport(tempReport);
                                    setIsEditingReport(false);
                                  }}
                                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-4 py-2 rounded-lg font-semibold border border-slate-200 transition-all cursor-pointer flex items-center gap-1.5"
                                >
                                  <Save className="w-3.5 h-3.5" />
                                  Save Only
                                </button>

                                <button
                                  disabled={isReevaluating}
                                  onClick={async () => {
                                    setReport(tempReport);
                                    setIsEditingReport(false);
                                    await handleReevaluateReport(tempReport);
                                  }}
                                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-4 py-2 rounded-lg font-bold shadow-md shadow-blue-500/10 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                                >
                                  {isReevaluating ? (
                                    <>
                                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                      Evaluating...
                                    </>
                                  ) : (
                                    <>
                                      <Shield className="w-3.5 h-3.5 text-white" />
                                      Save & Re-evaluate Draft
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Grounding Source URL Chips (if any sources found) */}
                    {sources.length > 0 && (
                      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                        <p className="text-[10px] text-slate-400 font-mono tracking-wider uppercase mb-3 flex items-center gap-1.5 font-bold">
                          <BookOpen className="w-3.5 h-3.5 text-blue-500" /> Verified Grounding Sources
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {sources.map((src, i) => (
                            <a
                              key={i}
                              href={src.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs bg-slate-50 border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-300 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5"
                            >
                              <span className="truncate max-w-[200px] font-sans font-medium">{src.title}</span>
                              <ExternalLink className="w-3 h-3 text-slate-400" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Critic Feedback Card (Done State) */}
                    {feedback && (
                      <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-5 shadow-sm border-l-4 border-l-emerald-500">
                        <div className="flex items-center gap-2 mb-3">
                          <Shield className="w-4.5 h-4.5 text-emerald-600" />
                          <p className="text-xs font-semibold text-emerald-700 font-mono tracking-wider uppercase">
                            Critic Assessment Verdict
                          </p>
                        </div>
                        <div className="max-h-[180px] overflow-y-auto pr-2 scrollbar-thin">
                          <div className="text-slate-700 text-sm">
                            {renderMarkdown(feedback)}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Intermediate Stages Inspector */}
                    {(searchResults || scrapedContent) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {searchResults && (
                          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs animate-fade-in">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5 font-mono flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                              Explorer Findings
                            </h4>
                            <div className="bg-slate-50 rounded-lg p-3 max-h-[140px] overflow-y-auto border border-slate-200 text-[11px] text-slate-600 font-mono leading-relaxed whitespace-pre-wrap shadow-inner">
                              {searchResults}
                            </div>
                          </div>
                        )}
                        {scrapedContent && (
                          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs animate-fade-in">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5 font-mono flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                              Scraped Raw Notes
                            </h4>
                            <div className="bg-slate-50 rounded-lg p-3 max-h-[140px] overflow-y-auto border border-slate-200 text-[11px] text-slate-600 font-mono leading-relaxed whitespace-pre-wrap shadow-inner">
                              {scrapedContent}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                  </motion.div>
                )}
              </AnimatePresence>

            </section>
          </>
        ) : (
          /* CODE VIEW TAB: Python Workspace */
          <section className="w-full flex flex-col md:flex-row gap-6 animate-fade-in">
            
            {/* Left Nav: Files list */}
            <div className="md:w-3/12 bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-1.5 shadow-xs">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-2 font-mono">
                Project Files
              </h3>
              
              <button
                onClick={() => setSelectedFile("tools")}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-mono flex items-center justify-between border transition-all ${
                  selectedFile === "tools"
                    ? "bg-blue-50 border-blue-100 text-blue-700 font-semibold"
                    : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                }`}
              >
                <span>tools.py</span>
                <span className="text-[9px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded font-mono">2KB</span>
              </button>

              <button
                onClick={() => setSelectedFile("agents")}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-mono flex items-center justify-between border transition-all ${
                  selectedFile === "agents"
                    ? "bg-blue-50 border-blue-100 text-blue-700 font-semibold"
                    : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                }`}
              >
                <span>agents.py</span>
                <span className="text-[9px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded font-mono">2KB</span>
              </button>

              <button
                onClick={() => setSelectedFile("pipeline")}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-mono flex items-center justify-between border transition-all ${
                  selectedFile === "pipeline"
                    ? "bg-blue-50 border-blue-100 text-blue-700 font-semibold"
                    : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                }`}
              >
                <span>pipeline.py</span>
                <span className="text-[9px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded font-mono">3KB</span>
              </button>

              <button
                onClick={() => setSelectedFile("app")}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-mono flex items-center justify-between border transition-all ${
                  selectedFile === "app"
                    ? "bg-blue-50 border-blue-100 text-blue-700 font-semibold"
                    : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                }`}
              >
                <span>app.py</span>
                <span className="text-[9px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded font-mono">4KB</span>
              </button>

              <button
                onClick={() => setSelectedFile("requirements")}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-mono flex items-center justify-between border transition-all ${
                  selectedFile === "requirements"
                    ? "bg-blue-50 border-blue-100 text-blue-700 font-semibold"
                    : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                }`}
              >
                <span>requirements.txt</span>
                <span className="text-[9px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded font-mono">1KB</span>
              </button>

              <button
                onClick={() => setSelectedFile("env")}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-mono flex items-center justify-between border transition-all ${
                  selectedFile === "env"
                    ? "bg-blue-50 border-blue-100 text-blue-700 font-semibold"
                    : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                }`}
              >
                <span>.env</span>
                <span className="text-[9px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded font-mono">1KB</span>
              </button>

              {/* Download / Export guidance */}
              <div className="mt-6 border-t border-slate-200 pt-4 px-2">
                <div className="flex items-center gap-2 mb-2 text-slate-500 text-xs">
                  <Shield className="w-4 h-4 text-blue-600" />
                  <span className="font-semibold text-slate-700">Workspace Ready</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed font-sans">
                  These files exist physically in your workspace under <strong>Multi-agent-research-system/</strong>. Use the Settings menu to export the complete package or commit to GitHub.
                </p>
              </div>
            </div>

            {/* Right Panel: Sleek Code Viewer */}
            <div className="md:w-9/12 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col shadow-sm">
              <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-mono text-slate-700">{selectedFile}.{selectedFile === "requirements" ? "txt" : selectedFile === "env" ? "" : "py"}</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">Read Only Workspace View</span>
              </div>
              <div className="p-4 bg-slate-950 font-mono text-xs text-slate-300 overflow-x-auto max-h-[500px] overflow-y-auto leading-relaxed shadow-inner">
                <pre><code>{codeFiles[selectedFile]}</code></pre>
              </div>
            </div>

          </section>
        )}

      </main>

      {/* Aesthetic Footer */}
      <footer className="border-t border-slate-200 py-6 text-center text-[11px] text-slate-400 font-sans mt-8 bg-white">
        ResearchMind Engine • Driven by Meta-Llama-4-Scout & Google search grounding tool integration • Powered by full-stack React and Express.
      </footer>
    </div>
  );
}
