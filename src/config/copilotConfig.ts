export const COPILOT_CONFIG = {
  get apiKey() {
    const directStored = localStorage.getItem("ai_api_key") || localStorage.getItem("groq_api_key") || localStorage.getItem("grok_api_key") || localStorage.getItem("openrouter_api_key") || localStorage.getItem("gemini_api_key");
    const envKey = import.meta.env.VITE_GROQ_API_KEY || import.meta.env.VITE_GROK_API_KEY || import.meta.env.VITE_XAI_API_KEY || import.meta.env.VITE_OPENROUTER_API_KEY || import.meta.env.VITE_GEMINI_API_KEY || "";
    
    // If user explicitly set ai_api_key in localStorage, use it. Otherwise use envKey or any stored key
    const raw = (directStored || envKey || "").trim().replace(/^['"]|['"]$/g, "");
    return raw;
  },
  get provider() {
    const key = this.apiKey;
    if (key.startsWith("gsk_")) return "Groq";
    if (key.startsWith("xai-")) return "Grok";
    if (key.startsWith("sk-or-") || key.startsWith("sk-")) return "OpenRouter";
    if (import.meta.env.VITE_GROQ_API_KEY) return "Groq";
    if (import.meta.env.VITE_GROK_API_KEY || import.meta.env.VITE_XAI_API_KEY) return "Grok";
    if (import.meta.env.VITE_OPENROUTER_API_KEY) return "OpenRouter";
    return import.meta.env.VITE_COPILOT_PROVIDER || "Gemini";
  },
  get baseUrl() {
    const prov = this.provider;
    if (prov === "Groq") return import.meta.env.VITE_GROQ_BASE_URL || "https://api.groq.com/openai/v1";
    if (prov === "Grok") return import.meta.env.VITE_GROK_BASE_URL || "https://api.x.ai/v1";
    if (prov === "OpenRouter") return import.meta.env.VITE_OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";
    return "https://generativelanguage.googleapis.com/v1beta";
  },
  get model() {
    const prov = this.provider;
    if (prov === "Groq") return import.meta.env.VITE_GROQ_MODEL || "llama-3.3-70b-versatile";
    if (prov === "Grok") return import.meta.env.VITE_GROK_MODEL || "grok-2-vision-1212";
    if (prov === "OpenRouter") return import.meta.env.VITE_OPENROUTER_MODEL || "google/gemini-2.0-flash-exp:free";
    return import.meta.env.VITE_GEMINI_MODEL || "gemini-2.0-flash";
  },
  timeoutMs: 35000,
};

export function setCustomApiKey(key: string) {
  const clean = key.trim().replace(/^['"]|['"]$/g, "");
  if (!clean) {
    localStorage.removeItem("ai_api_key");
    localStorage.removeItem("groq_api_key");
    localStorage.removeItem("grok_api_key");
    localStorage.removeItem("gemini_api_key");
    localStorage.removeItem("openrouter_api_key");
  } else {
    localStorage.setItem("ai_api_key", clean);
    if (clean.startsWith("gsk_")) localStorage.setItem("groq_api_key", clean);
    if (clean.startsWith("xai-")) localStorage.setItem("grok_api_key", clean);
    if (clean.startsWith("sk-")) localStorage.setItem("openrouter_api_key", clean);
    if (clean.startsWith("AIza") || clean.startsWith("AQ.")) localStorage.setItem("gemini_api_key", clean);
  }
}

