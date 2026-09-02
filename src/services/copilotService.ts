import { COPILOT_CONFIG } from "../config/copilotConfig";
import type { HumanAnswer, QuestionDifficulty, QuestionBankItem } from "../types";

export interface ParsedExtractedQuestion {
  title?: string;
  question: string;
  topic?: string;
  tool?: string;
  company?: string;
  role?: string;
  difficulty?: QuestionDifficulty;
  existingAnswer?: string;
}

export interface FastParseResult {
  detectedCompany?: string;
  detectedRole?: string;
  detectedTool?: string;
  questions: ParsedExtractedQuestion[];
}

/**
 * Strips leading numbering or bullets like "Q1. ", "Q3: ", "Question 10 - ", "12) "
 */
export function sanitizeQuestionText(raw: string): string {
  if (!raw) return "";
  return raw
    .trim()
    .replace(/^(?:q(?:uestion)?\s*\d+[\s.:\)-]*|\d+[\s.:\)-]+|#\s*\d+[\s.:\)-]*|[-*•]\s*)/i, "")
    .trim();
}

export function getQuestionTools(item: { tool?: string; tags?: string[] }): string[] {
  const toolsSet = new Set<string>();
  if (item.tool) {
    const primary = normalizeTool(item.tool).primaryTool;
    if (primary) toolsSet.add(primary);
  }
  (item.tags || []).forEach((t) => {
    const lower = t.toLowerCase().replace(/^[#@]/, "").trim();
    if (
      lower.includes("power bi") || lower.includes("powerbi") || lower === "pbi" || lower === "dax" || lower === "powerquery" || lower === "pbip"
    ) {
      toolsSet.add("Power BI");
    } else if (lower.includes("sql") || lower.includes("postgres") || lower.includes("t-sql") || lower.includes("mysql")) {
      toolsSet.add("SQL");
    } else if (lower.includes("python") || lower.includes("pandas") || lower.includes("pyspark") || lower.includes("numpy")) {
      toolsSet.add("Python");
    } else if (lower.includes("fabric") || lower.includes("onelake") || lower.includes("synapse") || lower.includes("deltalake")) {
      toolsSet.add("Fabric");
    } else if (lower.includes("excel") || lower.includes("spreadsheet") || lower.includes("vlookup") || lower.includes("xlookup")) {
      toolsSet.add("Excel");
    } else if (lower.includes("databricks") || lower.includes("pyspark")) {
      toolsSet.add("Databricks");
    } else if (lower.includes("data factory") || lower.includes("adf")) {
      toolsSet.add("Azure Data Factory");
    } else if (lower.includes("azure") || lower.includes("aws") || lower.includes("gcp") || lower.includes("cloud")) {
      toolsSet.add("Azure / Cloud");
    } else if (lower.includes("git") || lower.includes("devops") || lower.includes("ci/cd")) {
      toolsSet.add("Git / DevOps");
    }
  });
  return Array.from(toolsSet);
}

export function getQuestionCompanies(item: { company?: string; companiesAsked?: string[]; tags?: string[] }): string[] {
  const compSet = new Set<string>();
  if (item.company && item.company.trim()) compSet.add(item.company.trim());
  (item.companiesAsked || []).forEach((c) => {
    if (c && c.trim()) compSet.add(c.trim());
  });

  const list = Array.from(compSet).filter(Boolean);

  // If there are specific company names (e.g. "Accenture", "PwC") alongside placeholder "General", prioritize specific companies
  if (list.length > 1 && list.some((c) => c.toLowerCase() !== "general")) {
    return list.filter((c) => c.toLowerCase() !== "general");
  }
  return list.length > 0 ? list : ["General"];
}

/**
 * Normalizes tool names into a single canonical category (e.g. Power BI, SQL, Python, Fabric, Excel)
 * and extracts any secondary tools into tags.
 */
export function normalizeTool(rawTool?: string): { primaryTool: string; extraTags: string[] } {
  if (!rawTool || !rawTool.trim()) {
    return { primaryTool: "Power BI", extraTags: [] };
  }

  const parts = rawTool
    .split(/[,/&]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const matchedTools: string[] = [];
  parts.forEach((p) => {
    const lower = p.toLowerCase();
    if (lower.includes("power bi") || lower.includes("powerbi") || lower === "pbi") matchedTools.push("Power BI");
    else if (lower === "sql" || lower.includes("t-sql") || lower.includes("postgres") || lower.includes("mysql")) matchedTools.push("SQL");
    else if (lower.includes("python") || lower.includes("pandas") || lower.includes("pyspark")) matchedTools.push("Python");
    else if (lower.includes("fabric") || lower.includes("onelake") || lower.includes("synapse")) matchedTools.push("Fabric");
    else if (lower.includes("excel") || lower.includes("spreadsheet")) matchedTools.push("Excel");
    else if (lower.includes("databricks")) matchedTools.push("Databricks");
    else if (lower.includes("data factory") || lower.includes("adf")) matchedTools.push("Azure Data Factory");
    else if (lower.includes("azure") || lower.includes("aws") || lower.includes("gcp")) matchedTools.push("Azure / Cloud");
    else matchedTools.push(p);
  });

  const unique = Array.from(new Set(matchedTools));
  const primaryTool = unique[0] || "Power BI";
  const extraTags = unique.slice(1);

  return { primaryTool, extraTags };
}

/**
 * Normalizes topic names into concise canonical topics (2-3 words max)
 * and splits multi-topic strings into clean sub-tags.
 */
export function normalizeTopic(rawTopic?: string): { cleanTopic: string; extraTags: string[] } {
  if (!rawTopic || !rawTopic.trim()) {
    return { cleanTopic: "General", extraTags: [] };
  }

  const parts = rawTopic
    .split(/[,/]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  let first = parts[0] || "General";
  const extraTags = parts.slice(1);

  // Clean verbose phrases
  first = first
    .replace(/^Core\s+/i, "")
    .replace(/\s+for\s+Data\s+Analysis$/i, "")
    .replace(/^Dashboarding\s+in\s+Excel$/i, "Excel Dashboards")
    .replace(/^Dashboarding$/i, "Dashboard Design")
    .replace(/^Formulas$/i, "Excel Formulas")
    .replace(/^Data Cleaning$/i, "Data Cleaning & Prep")
    .trim();

  // Canonicalize common topics
  const lower = first.toLowerCase();
  if (lower.includes("row-level security") || lower.includes("row level security") || lower === "rls") {
    first = "Row-Level Security (RLS)";
  } else if (lower === "dax" || lower.includes("dax formula") || lower.includes("dax measure")) {
    first = "DAX";
  } else if (lower.includes("direct lake") || lower.includes("directlake")) {
    first = "Direct Lake";
  } else if (lower.includes("semantic model")) {
    first = "Semantic Models";
  } else if (lower.includes("performance") && lower.includes("optimization")) {
    first = "Performance Optimization";
  } else if (lower.includes("version control") || lower.includes("ci/cd") || lower.includes("git")) {
    first = "Version Control & CI/CD";
  } else if (lower.includes("data lake") && lower.includes("optimization")) {
    first = "Data Lake Optimization";
  } else if (lower.includes("data lake") && (lower.includes("architecture") || lower.includes("quality"))) {
    first = "Data Lake Architecture";
  } else if (lower.includes("excel formula") || lower.includes("excel formulas")) {
    first = "Excel Formulas";
  }

  return { cleanTopic: first, extraTags };
}

/**
 * Resizes and compresses high-res screenshots to max 1200px width/height.
 * Keeps text razor sharp while reducing token size and credit footprint by ~85%.
 */
async function compressImageForVision(
  dataUri: string,
  maxWidth = 1200,
  maxHeight = 1200
): Promise<string> {
  if (typeof window === "undefined" || !dataUri.startsWith("data:image")) {
    return dataUri;
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      let { width, height } = img;
      if (width <= maxWidth && height <= maxHeight) {
        resolve(dataUri);
        return;
      }
      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(dataUri);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => resolve(dataUri);
    img.src = dataUri;
  });
}

export class CopilotService {
  /**
   * Sends text and optional single/multiple image payload to the configured AI provider (OpenRouter or Gemini).
   */
  async generateMultimodalResponse(
    prompt: string,
    images?: Array<{ data: string; mimeType: string }> | string,
    singleMimeType: string = "image/jpeg"
  ): Promise<string> {
    const { apiKey, baseUrl, model, provider, timeoutMs } = COPILOT_CONFIG;

    if (!apiKey) {
      throw new Error(
        "AI API key is missing. Please check VITE_OPENROUTER_API_KEY or VITE_GEMINI_API_KEY in your .env file."
      );
    }

    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const isOpenRouter =
      provider === "OpenRouter" ||
      apiKey.startsWith("sk-or-") ||
      baseUrl.includes("openrouter.ai");

    try {
      let response: Response;

      if (isOpenRouter) {
        // OpenRouter / OpenAI Compatible Payload
        const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
        const url = `${normalizedBaseUrl}/chat/completions`;

        const userContent: any[] = [{ type: "text", text: prompt }];

        if (images) {
          if (typeof images === "string") {
            const rawUri = images.startsWith("data:")
              ? images
              : `data:${singleMimeType};base64,${images.replace(/^data:image\/[a-z0-9+.-]+;base64,/, "")}`;
            const compressed = await compressImageForVision(rawUri);
            userContent.push({
              type: "image_url",
              image_url: { url: compressed },
            });
          } else if (Array.isArray(images)) {
            for (const img of images) {
              const rawUri = img.data.startsWith("data:")
                ? img.data
                : `data:${img.mimeType || singleMimeType};base64,${img.data.replace(/^data:image\/[a-z0-9+.-]+;base64,/, "")}`;
              const compressed = await compressImageForVision(rawUri);
              userContent.push({
                type: "image_url",
                image_url: { url: compressed },
              });
            }
          }
        }

        response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            "HTTP-Referer": window.location.origin || "http://localhost:5173",
            "X-Title": "Career Execution System",
          },
          body: JSON.stringify({
            model: model || "google/gemini-2.0-flash-exp:free",
            messages: [{ role: "user", content: userContent }],
            max_tokens: 2500, // Explicitly limit token reservation to avoid OpenRouter 402 credit errors
          }),
          signal: controller.signal,
        });
      } else {
        // Direct Google Gemini REST API with Multi-Version (v1beta & v1) and Multi-Model Auto-Resolution
        const cleanBase = baseUrl.replace(/\/+$/, "");
        const baseWithoutVer = cleanBase.replace(/\/(v1beta|v1)$/, "");

        const candidateModels = [
          model ? (model.includes("/") ? model.split("/").pop() : model) : null,
          "gemini-2.0-flash",
          "gemini-2.5-flash",
          "gemini-1.5-flash-latest",
          "gemini-1.5-flash-8b",
          "gemini-1.5-flash",
          "gemini-pro",
        ].filter((m, i, arr): m is string => Boolean(m) && arr.indexOf(m) === i);

        // Build list of URLs to try across API versions
        const candidateUrls: Array<{ url: string; label: string }> = [];
        for (const ver of ["v1beta", "v1"]) {
          for (const m of candidateModels) {
            candidateUrls.push({
              url: `${baseWithoutVer}/${ver}/models/${m}:generateContent?key=${apiKey}`,
              label: `${ver}/${m}`,
            });
          }
        }

        const parts: any[] = [{ text: prompt }];

        if (images) {
          if (typeof images === "string") {
            const rawUri = images.startsWith("data:")
              ? images
              : `data:${singleMimeType};base64,${images.replace(/^data:image\/[a-z0-9+.-]+;base64,/, "")}`;
            const compressed = await compressImageForVision(rawUri);
            const cleanBase64 = compressed.replace(/^data:image\/[a-z0-9+.-]+;base64,/, "");
            parts.push({
              inlineData: {
                mimeType: singleMimeType,
                data: cleanBase64,
              },
            });
          } else if (Array.isArray(images)) {
            for (const img of images) {
              const rawUri = img.data.startsWith("data:")
                ? img.data
                : `data:${img.mimeType || singleMimeType};base64,${img.data.replace(/^data:image\/[a-z0-9+.-]+;base64,/, "")}`;
              const compressed = await compressImageForVision(rawUri);
              const cleanBase64 = compressed.replace(/^data:image\/[a-z0-9+.-]+;base64,/, "");
              parts.push({
                inlineData: {
                  mimeType: img.mimeType || singleMimeType,
                  data: cleanBase64,
                },
              });
            }
          }
        }

        let lastErrorDetails = "";
        let successfulResponse: Response | null = null;

        for (const candidate of candidateUrls) {
          try {
            const res = await fetch(candidate.url, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                contents: [{ parts }],
                generationConfig: {
                  maxOutputTokens: 2500,
                },
              }),
              signal: controller.signal,
            });

            if (res.ok) {
              successfulResponse = res;
              console.log(`[CopilotService] Successfully connected to Gemini endpoint: ${candidate.label}`);
              break;
            }

            // If 404 (model not found on this version), try next endpoint
            if (res.status === 404) {
              const errJson = await res.json().catch(() => ({}));
              lastErrorDetails = errJson?.error?.message || "Model not found";
              continue;
            }

            // Other error (400, 401, 429), stop and process
            successfulResponse = res;
            break;
          } catch (fetchErr: any) {
            if (fetchErr.name === "AbortError") throw fetchErr;
            lastErrorDetails = fetchErr.message || "Network error";
          }
        }

        if (!successfulResponse) {
          throw new Error(
            `Gemini API error: None of the available models/versions were accessible with your API key (${lastErrorDetails || "Model not found"}). Please verify that 'Generative Language API' is enabled in Google AI Studio or check your API key.`
          );
        }

        response = successfulResponse;
      }

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorDetails = "";
        try {
          const errData = await response.json();
          errorDetails = errData?.error?.message || errData?.message || response.statusText;
        } catch {
          errorDetails = response.statusText;
        }

        if (response.status === 400 || response.status === 401) {
          throw new Error(`Invalid API key or request format: ${errorDetails}`);
        } else if (response.status === 402) {
          throw new Error(
            `Credits or token limit reached: ${errorDetails}. Try reducing question batch or switching to free model.`
          );
        } else if (response.status === 429) {
          throw new Error("Rate limit exceeded. Please wait a moment before trying again.");
        } else if (response.status >= 500) {
          throw new Error(`AI Provider is currently unavailable (${response.status}): ${errorDetails}`);
        } else {
          throw new Error(`AI request failed (${response.status}): ${errorDetails}`);
        }
      }

      const data = await response.json();
      let content = "";

      if (isOpenRouter) {
        content = data?.choices?.[0]?.message?.content || "";
      } else {
        content = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      }

      if (!content || typeof content !== "string") {
        throw new Error("Received empty or invalid response payload from AI API.");
      }

      const responseTimeMs = Date.now() - startTime;
      console.log(`[CopilotService Debug] Response received from ${provider || "AI Provider"}:`, {
        provider,
        model,
        responseTimeMs,
        responseLength: content.length,
      });

      return content.trim();
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (err instanceof Error) {
        if (err.name === "AbortError") {
          throw new Error("Request to AI API timed out after 30 seconds.");
        }
        throw err;
      }
      throw new Error("An unexpected error occurred while communicating with the AI service.");
    }
  }

  /**
   * Sends the formatted prompt to the configured AI API
   * and returns the assistant's plain text response.
   */
  async generateResponse(prompt: string): Promise<string> {
    return this.generateMultimodalResponse(prompt);
  }

  /**
   * Stage 1: Fast Question Parser (Under 2 seconds, no heavy answers)
   * Extracts raw questions from screenshots or messy text dumps. Supports single or multiple screenshots.
   */
  async fastParseQuestions(input: {
    text?: string;
    images?: Array<{ data: string; mimeType: string }>;
    base64Image?: string;
    mimeType?: string;
    companyHint?: string;
    roleHint?: string;
  }): Promise<FastParseResult> {
    const prompt = `You are an expert technical interview analyst. 
Extract every interview question from the provided content (text or one or more screenshot images).

Rules:
1. Identify if a specific company, role, or primary tool is mentioned (e.g. PwC, Accenture; Role: Power BI Developer, Data Engineer; Tool: Power BI, SQL, Python, Fabric, Excel). If provided as hint, respect the hint.
2. Extract EVERY separate question or scenario asked across all images/text. Split them into clean, concise individual question objects.
3. Classify each question into:
   - 'tool': Primary technology/tool involved (e.g. 'Power BI', 'SQL', 'Python', 'Fabric', 'Excel', 'Data Engineering').
   - 'topic': High-level concept (e.g., 'DAX', 'Row-Level Security (RLS)', 'Performance Optimization', 'Semantic Models', 'Power BI Service', 'Data Modeling', 'ETL').
4. If the source already contains a partial answer or note, preserve it in 'existingAnswer'. Otherwise leave it empty.
5. Estimate difficulty ('Easy', 'Medium', 'Hard').

Return ONLY a valid JSON object matching this schema, with no markdown code fences or conversational text:
{
  "detectedCompany": "${input.companyHint || ''}",
  "detectedRole": "${input.roleHint || ''}",
  "detectedTool": "Power BI",
  "questions": [
    {
      "title": "Short title (e.g. Dynamic RLS)",
      "question": "Full scenario question statement",
      "tool": "Power BI",
      "topic": "Row-Level Security (RLS)",
      "difficulty": "Medium",
      "existingAnswer": ""
    }
  ]
}

Content to parse:
${input.text || "See attached screenshot images."}`;

    const imagesPayload = input.images && input.images.length > 0
      ? input.images
      : input.base64Image
      ? [{ data: input.base64Image, mimeType: input.mimeType || "image/jpeg" }]
      : undefined;

    const rawResponse = await this.generateMultimodalResponse(
      prompt,
      imagesPayload,
      input.mimeType
    );

    // Robust JSON extractor that handles markdown fences, preamble, and partial truncation
    const parseExtractedJson = (text: string): any => {
      // 1. Direct clean
      const cleaned = text
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```$/i, "")
        .trim();

      try {
        return JSON.parse(cleaned);
      } catch {
        // 2. Regex extract outermost { ... } or [ ... ]
        const match = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
        if (match) {
          try {
            return JSON.parse(match[0]);
          } catch {
            // Attempt auto-repairing truncated JSON
            const repaired = match[0]
              .replace(/,\s*\{[^}]*$/, "") // remove trailing half-open object
              .replace(/,\s*$/, ""); // remove trailing comma
            try {
              return JSON.parse(repaired + "]}");
            } catch {
              try {
                return JSON.parse(repaired + "}");
              } catch {
                // pass to line-by-line fallback
              }
            }
          }
        }

        // 3. Fallback: Line-by-line question regex extraction
        const questionMatches = Array.from(
          cleaned.matchAll(/"question"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/g)
        ).map((m) => m[1]);

        if (questionMatches.length > 0) {
          return {
            detectedCompany: input.companyHint || "General",
            detectedRole: input.roleHint || "Data / BI Professional",
            detectedTool: "Power BI",
            questions: questionMatches.map((q) => ({
              question: q.replace(/\\"/g, '"'),
              topic: "General",
              tool: "Power BI",
              difficulty: "Medium",
            })),
          };
        }

        throw new Error("Could not parse extracted questions into structured format.");
      }
    };

    try {
      const parsed = parseExtractedJson(rawResponse);
      const rawList = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed.questions)
        ? parsed.questions
        : [];

      const toolParsed = normalizeTool(parsed.detectedTool);
      return {
        detectedCompany: parsed.detectedCompany || input.companyHint || "General",
        detectedRole: parsed.detectedRole || input.roleHint || "Data / BI Professional",
        detectedTool: toolParsed.primaryTool,
        questions: rawList.map((q: any) => {
          const rawQ = q.question || q.title || (typeof q === "string" ? q : "");
          const cleanQ = sanitizeQuestionText(rawQ);
          const toolNorm = normalizeTool(q.tool || parsed.detectedTool);
          const topicNorm = normalizeTopic(q.topic);
          return {
            title: q.title || "",
            question: cleanQ,
            tool: toolNorm.primaryTool,
            topic: topicNorm.cleanTopic,
            difficulty: q.difficulty || "Medium",
            existingAnswer: q.existingAnswer || "",
          };
        }).filter((q: any) => Boolean(q.question && q.question.trim().length > 3)),
      };
    } catch (e) {
      console.error("Failed to parse JSON from fast question parser:", rawResponse, e);
      throw new Error("Could not parse extracted questions into structured format. Please check the input format.");
    }
  }

  /**
   * Stage 2: Asynchronous Relaxed Question Enricher
   * Generates a conversational, senior practitioner-level interview answer.
   */
  async enrichQuestion(
    question: string,
    context?: { company?: string; role?: string; topic?: string; tool?: string; existingAnswer?: string }
  ): Promise<HumanAnswer & { suggestedTopic: string; suggestedTool: string; suggestedTags: string[]; difficulty: QuestionDifficulty }> {
    const prompt = `You are a Senior Principal Data & BI Engineer coaching a candidate for a real-world technical interview.
Company: ${context?.company || "Top Tier Tech / Consulting"}
Role: ${context?.role || "Power BI / Data Engineer"}
Primary Tool Context: ${context?.tool || "Power BI"}
Topic Context: ${context?.topic || "Technical Assessment"}
Existing Notes / Partial Answer: ${context?.existingAnswer || "None"}

Question:
"${question}"

Generate a **human-like, conversational, practitioner answer** that will impress interviewers. 
DO NOT give dry textbook definitions. Deliver how an experienced professional speaks in an interview:

1. 'pitch': A direct 30-45 second verbal pitch explaining the approach with confidence ("In practice, I handle this by...").
2. 'steps': 2 to 4 crisp execution steps (exact UI paths, functions, DAX/SQL patterns).
3. 'proTip': A senior-level gotcha, performance optimization nuance, or edge case that demonstrates deep hands-on expertise.
4. 'codeSnippet': (Optional) 2-6 lines of clean DAX, SQL, M-Code, or Python if applicable, else empty string.
5. 'suggestedTool': EXACTLY ONE single canonical tool name: 'Power BI' | 'SQL' | 'Python' | 'Fabric' | 'Excel' | 'Databricks' | 'Azure Data Factory' | 'General'. DO NOT put comma-separated lists here!
6. 'suggestedTopic': EXACTLY ONE concise canonical topic name (2-3 words max, e.g. 'Row-Level Security (RLS)', 'DAX', 'Direct Lake', 'Window Functions', 'Excel Formulas', 'Query Optimization', 'Semantic Models', 'Data Modeling', 'ETL / Pipeline'). DO NOT return comma-separated lists or long sentences!
7. 'suggestedTags': 3 to 6 hashtag strings without '#' (e.g. ["PwC", "PowerBI", "RLS", "Security", "DAX", "DataModeling"]). Put secondary tools, concepts, or subtopics here!
8. 'difficulty': 'Easy' | 'Medium' | 'Hard'.

Return ONLY valid JSON matching this schema:
{
  "pitch": "...",
  "steps": ["Step 1...", "Step 2...", "Step 3..."],
  "proTip": "...",
  "codeSnippet": "",
  "suggestedTool": "Power BI",
  "suggestedTopic": "Row-Level Security (RLS)",
  "suggestedTags": ["PowerBI", "RLS", "Security", "DAX"],
  "difficulty": "Medium"
}
Return raw JSON with no markdown blocks.`;

    const rawResponse = await this.generateResponse(prompt);
    const cleanJson = rawResponse
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/i, "")
      .trim();

    try {
      const parsed = JSON.parse(cleanJson);
      const toolNorm = normalizeTool(parsed.suggestedTool || context?.tool);
      const topicNorm = normalizeTopic(parsed.suggestedTopic || context?.topic);
      const combinedTags = Array.from(
        new Set([
          ...(Array.isArray(parsed.suggestedTags) ? parsed.suggestedTags : []),
          ...toolNorm.extraTags,
          ...topicNorm.extraTags,
        ])
      )
        .map((t: string) => String(t).replace(/^#/, "").trim())
        .filter(Boolean);

      return {
        pitch: parsed.pitch || "",
        steps: Array.isArray(parsed.steps) ? parsed.steps : [],
        proTip: parsed.proTip || "",
        codeSnippet: parsed.codeSnippet || undefined,
        suggestedTool: toolNorm.primaryTool,
        suggestedTopic: topicNorm.cleanTopic,
        suggestedTags: combinedTags,
        difficulty: (['Easy', 'Medium', 'Hard'].includes(parsed.difficulty) ? parsed.difficulty : 'Medium') as QuestionDifficulty,
      };
    } catch (e) {
      console.error("Failed to parse JSON from question enricher:", rawResponse, e);
      throw new Error("Failed to generate enriched answer. Please retry.");
    }
  }

  /**
   * Layer 1 & 2: Fast Semantic Duplicate Sentinel
   * Compares newly parsed questions against existing bank items.
   * Classifies into:
   * - 'auto_merge' (>= 90% match: identical or near-identical phrasing)
   * - 'clarify' (70% - 89% match: ambiguous concept overlap, needs human approval)
   * - 'unique' (< 70% match: fresh question)
   */
  async checkSemanticDuplicates(
    newQuestions: ParsedExtractedQuestion[],
    existingBank: QuestionBankItem[]
  ): Promise<SemanticDuplicateResult[]> {
    if (!existingBank || existingBank.length === 0 || !newQuestions || newQuestions.length === 0) {
      return newQuestions.map((q, idx) => ({
        newIndex: idx,
        newQuestion: q,
        decision: 'unique' as const,
      }));
    }

    const results: SemanticDuplicateResult[] = [];
    const unmatchedNew: Array<{ index: number; question: ParsedExtractedQuestion }> = [];

    const normalize = (t: string) => t.toLowerCase().replace(/[^a-z0-9]/g, "");

    // Step 1: Fast deterministic check
    newQuestions.forEach((newQ, idx) => {
      const cleanNew = sanitizeQuestionText(newQ.question);
      const exactMatch = existingBank.find(
        (ex) =>
          normalize(ex.question) === normalize(cleanNew) ||
          (ex.aliases && ex.aliases.some((a: string) => normalize(a) === normalize(cleanNew)))
      );

      if (exactMatch) {
        results.push({
          newIndex: idx,
          newQuestion: newQ,
          decision: 'auto_merge',
          matchedItem: exactMatch,
          similarityScore: 100,
          reason: 'Exact textual match',
        });
      } else {
        unmatchedNew.push({ index: idx, question: newQ });
      }
    });

    if (unmatchedNew.length === 0) {
      return results.sort((a, b) => a.newIndex - b.newIndex);
    }

    // Step 2: Semantic AI Batch Comparison for unmatched questions
    try {
      const existingSummaries = existingBank.map((q) => ({
        id: q.id,
        question: q.question,
        tool: q.tool,
        topic: q.topic,
        company: q.company,
      }));

      const newSummaries = unmatchedNew.map((u) => ({
        index: u.index,
        question: u.question.question,
        tool: u.question.tool,
        topic: u.question.topic,
      }));

      const prompt = `You are a High-Precision Semantic Deduplication Sentinel for technical interview questions.
Compare incoming interview questions against the candidate's existing Question Bank.

Existing Questions:
${JSON.stringify(existingSummaries.slice(0, 100), null, 2)}

Incoming New Questions:
${JSON.stringify(newSummaries, null, 2)}

STRICT DUPLICATION CRITERIA:
Two questions are duplicates ONLY IF an interviewer is asking for the EXACT same verbal explanation or technical solution (i.e. pure paraphrasing).

CRITICAL EXCLUSIONS (DO NOT MERGE AS DUPLICATES):
1. Different sub-scenarios on the same topic: e.g. "Dynamic RLS with user email", "Workspace-level RLS", "Summary Table RLS Workaround" are 3 completely DISTINCT questions!
2. Different Functions/Tools: e.g. "SUMIF vs SUMIFS" is NOT "COUNTIF vs COUNTIFS". SQL duplicate removal is NOT Excel duplicate removal.
3. General vs Specific: e.g. "What is DAX?" is NOT "What is CALCULATE()?". "What are Window Functions?" is NOT "Find 2nd highest salary".
4. Different Data Structures / Features: e.g. "List vs Tuple vs Dict" is NOT "List Comprehension". "Iterators" is NOT "Generators".

DECISION RULES:
- 'auto_merge': ONLY for true, unambiguous paraphrases (>= 90% identical technical solution, e.g. "Star Schema vs Snowflake" vs "Difference between Star and Snowflake schema").
- 'clarify': If there is borderline phrasing ambiguity (70%-89%).
- 'unique': If the questions test different sub-scenarios, different functions, or different concepts.

When in doubt, classify as 'unique'.

Return ONLY a valid JSON array matching this schema:
[
  {
    "index": 0,
    "decision": "auto_merge" | "clarify" | "unique",
    "matchedId": "...",
    "similarity": 95,
    "reason": "..."
  }
]`;

      const rawResponse = await this.generateResponse(prompt);
      const cleanJson = rawResponse
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```$/i, "")
        .trim();

      const parsedArray = JSON.parse(cleanJson);

      if (Array.isArray(parsedArray)) {
        parsedArray.forEach((item: any) => {
          const original = unmatchedNew.find((u) => u.index === item.index);
          if (original) {
            const matchedEx = existingBank.find((ex) => ex.id === item.matchedId);
            const decision =
              item.decision === 'auto_merge' && matchedEx
                ? 'auto_merge'
                : item.decision === 'clarify' && matchedEx
                ? 'clarify'
                : 'unique';

            results.push({
              newIndex: original.index,
              newQuestion: original.question,
              decision,
              matchedItem: matchedEx,
              similarityScore: item.similarity || 50,
              reason: item.reason || '',
            });
          }
        });
      }
    } catch (err) {
      console.warn("Semantic deduplication AI call fallback to unique:", err);
    }

    // Fill in any that failed AI parse as 'unique'
    unmatchedNew.forEach((u) => {
      if (!results.some((r) => r.newIndex === u.index)) {
        results.push({
          newIndex: u.index,
          newQuestion: u.question,
          decision: 'unique',
        });
      }
    });

    return results.sort((a, b) => a.newIndex - b.newIndex);
  }

  /**
   * Layer 3: High-Precision Bank Consolidation Agent
   * Audits the entire question bank to find true duplicate paraphrase pairs.
   * Ignores any question pairs previously resolved/dismissed by the user.
   */
  async auditAndConsolidateBank(
    questions: QuestionBankItem[],
    ignoredPairKeys?: string[]
  ): Promise<ConsolidationCluster[]> {
    if (!questions || questions.length < 2) return [];

    try {
      const summaries = questions.map((q) => ({
        id: q.id,
        question: q.question,
        company: q.company,
        tool: q.tool,
        topic: q.topic,
      }));

      const prompt = `You are a High-Precision Technical Interview Question Consolidator.
Audit the following list of ${questions.length} interview questions to find STRICT SEMANTIC DUPLICATE PAIRS that represent the EXACT same interview question asked with different wording.

Questions:
${JSON.stringify(summaries, null, 2)}

CRITICAL RULES (AVOID FALSE POSITIVES):
1. DO NOT merge questions just because they share a topic or tool (e.g. Row-Level Security, DAX, Python, Excel, SQL).
2. DO NOT merge different scenario questions (e.g. Workspace RLS vs Dynamic RLS vs Summary Table RLS are 3 DISTINCT questions and MUST NOT be merged).
3. DO NOT merge different functions (e.g. "SUMIFS vs SUMIF" is NOT "COUNTIFS vs COUNTIF").
4. DO NOT merge general concepts with specific sub-methods (e.g. "What is DAX?" is NOT "What is CALCULATE()?"; "What are Window Functions?" is NOT "Find 2nd highest salary" or "ROW_NUMBER vs RANK vs DENSE_RANK").
5. DO NOT merge different Python features (e.g. "List, Tuple, Dict" is NOT "List Comprehension"; "Iterators" is NOT "Generators").
6. DO NOT merge identical questions in different tools (e.g. SQL duplicate removal is NOT Excel duplicate removal).
7. ONLY merge TRUE PARAPHRASES where the interviewer expects the identical answer (e.g. "Star vs Snowflake schema: which is better?" and "Explain difference between Star Schema and Snowflake schema").

If there are NO true duplicate paraphrases, return an empty array [].

Return ONLY a JSON array of true duplicate clusters:
[
  {
    "primaryId": "...",
    "duplicateIds": ["..."],
    "reason": "Exact paraphrase asking for..."
  }
]`;

      const rawResponse = await this.generateResponse(prompt);
      const cleanJson = rawResponse
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```$/i, "")
        .trim();

      const parsed: ConsolidationCluster[] = JSON.parse(cleanJson);
      if (!Array.isArray(parsed)) return [];

      if (!ignoredPairKeys || ignoredPairKeys.length === 0) {
        return parsed;
      }

      const ignoredSet = new Set(ignoredPairKeys);
      const filtered = parsed
        .map((cluster) => {
          const remainingDups = cluster.duplicateIds.filter((dupId) => {
            const pairKey = [cluster.primaryId, dupId].sort().join("___");
            return !ignoredSet.has(pairKey);
          });
          return { ...cluster, duplicateIds: remainingDups };
        })
        .filter((cluster) => cluster.duplicateIds.length > 0);

      return filtered;
    } catch (err) {
      console.error("Bank consolidation audit failed:", err);
      return [];
    }
  }
}

export interface SemanticDuplicateResult {
  newIndex: number;
  newQuestion: ParsedExtractedQuestion;
  decision: 'auto_merge' | 'clarify' | 'unique';
  matchedItem?: QuestionBankItem;
  similarityScore?: number;
  reason?: string;
}

export interface ConsolidationCluster {
  primaryId: string;
  duplicateIds: string[];
  reason: string;
}

export const copilotService = new CopilotService();
