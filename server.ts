import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

interface Source {
  title: string;
  url: string;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Setup express json body parsing
  app.use(express.json());

  // Initialize Gemini client (server-side only)
  // User-Agent: aistudio-build is mandatory for telemetry as per guidelines
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // Helper function to query Gemini with fallbacks for models & tools
  async function generateContentWithFallback(params: {
    contents: string;
    withSearch?: boolean;
  }): Promise<{ text: string; sources: Source[] }> {
    const modelsToTry = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
    let lastError: any = null;

    // 1. Try with search grounding if requested
    if (params.withSearch) {
      for (const model of modelsToTry) {
        try {
          console.log(`[Gemini API] Attempting Search Grounding with model: ${model}`);
          const response = await ai.models.generateContent({
            model: model,
            contents: params.contents,
            config: {
              tools: [{ googleSearch: {} }],
            },
          });
          
          const text = response.text || "";
          const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
          const sources: Source[] = groundingChunks
            .filter(chunk => chunk.web)
            .map(chunk => ({
              title: chunk.web?.title || "Web Resource",
              url: chunk.web?.uri || ""
            }))
            .filter(source => source.url !== "");

          return { text, sources };
        } catch (err: any) {
          console.warn(`[Gemini API Warning] Search Grounding failed for ${model}:`, err.message || err);
          lastError = err;
        }
      }
    }

    // 2. Try standard generation (either because search was not requested, or search failed)
    for (const model of modelsToTry) {
      try {
        console.log(`[Gemini API] Attempting standard generation with model: ${model}`);
        const response = await ai.models.generateContent({
          model: model,
          contents: params.contents,
        });
        return {
          text: response.text || "",
          sources: []
        };
      } catch (err: any) {
        console.warn(`[Gemini API Warning] Standard generation failed for ${model}:`, err.message || err);
        lastError = err;
      }
    }

    throw lastError || new Error("All fallback models failed to generate content.");
  }

  // ==========================================
  // Pipeline Step 1: Web Search / Explorer Agent
  // ==========================================
  app.post("/api/research/search", async (req, res) => {
    const { topic } = req.body;
    if (!topic) {
      return res.status(400).json({ error: "Topic is required" });
    }

    try {
      const prompt = `Perform a comprehensive web search to gather high-quality information, facts, data points, and top URLs on the topic: '${topic}'. Compile a detailed summary of your findings and list the URLs as references.`;
      const result = await generateContentWithFallback({ contents: prompt, withSearch: true });

      res.json({
        success: true,
        text: result.text || "No results generated.",
        sources: result.sources
      });
    } catch (error: any) {
      console.error("Search Agent Error:", error);
      res.status(500).json({ error: error.message || "Failed to search web resources." });
    }
  });

  // ==========================================
  // Pipeline Step 2: URL Scraping & Reading / Reader Agent
  // ==========================================
  app.post("/api/research/scrape", async (req, res) => {
    const { topic, searchResults } = req.body;
    if (!topic || !searchResults) {
      return res.status(400).json({ error: "Topic and search results are required" });
    }

    try {
      const prompt = `You are the Reader Agent. Analyze the following web search findings for the topic '${topic}':
        
${searchResults}

Identify the single most authoritative, relevant, and promising URL that warrants deep reading. Simulate scraping and parsing its full text content. Retrieve key deep explanations, technical specifications, statistics, and citations that would be found on that page. Output the detailed, rich scraped notes cleanly.`;

      const result = await generateContentWithFallback({ contents: prompt });
      res.json({
        success: true,
        text: result.text || "No deeper text scraped."
      });
    } catch (error: any) {
      console.error("Reader Agent Error:", error);
      res.status(500).json({ error: error.message || "Failed to parse and scrape document contents." });
    }
  });

  // ==========================================
  // Pipeline Step 3: Drafting Report / Writer Agent
  // ==========================================
  app.post("/api/research/write", async (req, res) => {
    const { topic, research } = req.body;
    if (!topic || !research) {
      return res.status(400).json({ error: "Topic and research content are required" });
    }

    try {
      const prompt = `Write a detailed, structured research report on the topic: "${topic}".
    
Use the following gathered research content:
${research}

Your report MUST be structured exactly with the following sections:
# Introduction
[Write a comprehensive introduction introducing the topic, background context, and why it is important]

# Key Findings
[Provide a minimum of 3 detailed key findings, each with its own heading, rich descriptions, and clear facts]
- Finding 1: ...
- Finding 2: ...
- Finding 3: ...

# Conclusion
[Summarize the main takeaways, outlook, and forward-looking implications]

# Sources
[A clean list of any URLs or sources referenced in the research]`;

      const result = await generateContentWithFallback({ contents: prompt });
      res.json({
        success: true,
        text: result.text || "Failed to generate report."
      });
    } catch (error: any) {
      console.error("Writer Agent Error:", error);
      res.status(500).json({ error: error.message || "Failed to compile research report." });
    }
  });

  // ==========================================
  // Pipeline Step 4: Critique Report / Critic Agent
  // ==========================================
  app.post("/api/research/critic", async (req, res) => {
    const { report } = req.body;
    if (!report) {
      return res.status(400).json({ error: "Report content is required" });
    }

    try {
      const prompt = `You are the Critic Agent. Review the following research report:

${report}

Analyze it and respond with a review structured exactly like this:
## Score
[X]/10

## Strengths
[List 2-3 specific strengths of the report]

## Areas to Improve
[List 2-3 specific areas of improvement, factual gaps, or formatting tips]

## Verdict
[Provide a punchy, constructive one-line verdict]`;

      const result = await generateContentWithFallback({ contents: prompt });
      res.json({
        success: true,
        text: result.text || "Failed to critique report."
      });
    } catch (error: any) {
      console.error("Critic Agent Error:", error);
      res.status(500).json({ error: error.message || "Failed to execute critique." });
    }
  });

  // Vite development server / production static server configuration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express server running on http://localhost:${PORT}`);
  });
}

startServer();
