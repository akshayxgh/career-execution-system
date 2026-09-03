export const COPILOT_CONFIG = {
  get provider() {
    if (localStorage.getItem("copilot_provider")) return localStorage.getItem("copilot_provider")!;
    const key = this.apiKey;
    if (import.meta.env.VITE_GROQ_API_KEY || key.startsWith("gsk_")) return "Groq";
    if (import.meta.env.VITE_GROK_API_KEY || import.meta.env.VITE_XAI_API_KEY || key.startsWith("xai-")) return "Grok";
    if (import.meta.env.VITE_OPENROUTER_API_KEY || key.startsWith("sk-or-") || key.startsWith("sk-")) return "OpenRouter";
    return import.meta.env.VITE_COPILOT_PROVIDER || "Gemini";
  },
  get apiKey() {
    return (
      localStorage.getItem("groq_api_key") ||
      localStorage.getItem("grok_api_key") ||
      localStorage.getItem("xai_api_key") ||
      localStorage.getItem("openrouter_api_key") ||
      localStorage.getItem("gemini_api_key") ||
      import.meta.env.VITE_GROQ_API_KEY ||
      import.meta.env.VITE_GROK_API_KEY ||
      import.meta.env.VITE_XAI_API_KEY ||
      import.meta.env.VITE_OPENROUTER_API_KEY ||
      import.meta.env.VITE_GEMINI_API_KEY ||
      ""
    );
  },
  get baseUrl() {
    if (localStorage.getItem("copilot_base_url")) return localStorage.getItem("copilot_base_url")!;
    const key = this.apiKey;
    const isGroq = this.provider === "Groq" || key.startsWith("gsk_");
    const isGrok = this.provider === "Grok" || key.startsWith("xai-");
    const isOR = this.provider === "OpenRouter" || key.startsWith("sk-or-") || key.startsWith("sk-");

    if (isGroq) return import.meta.env.VITE_GROQ_BASE_URL || "https://api.groq.com/openai/v1";
    if (isGrok) return import.meta.env.VITE_GROK_BASE_URL || "https://api.x.ai/v1";
    if (isOR) return import.meta.env.VITE_OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";
    return "https://generativelanguage.googleapis.com/v1beta";
  },
  get model() {
    if (localStorage.getItem("copilot_model")) return localStorage.getItem("copilot_model")!;
    const key = this.apiKey;
    const isGroq = this.provider === "Groq" || key.startsWith("gsk_");
    const isGrok = this.provider === "Grok" || key.startsWith("xai-");
    const isOR = this.provider === "OpenRouter" || key.startsWith("sk-or-") || key.startsWith("sk-");

    if (isGroq) return import.meta.env.VITE_GROQ_MODEL || "llama-3.2-90b-vision-preview";
    if (isGrok) return import.meta.env.VITE_GROK_MODEL || "grok-2-vision-1212";
    if (isOR) return import.meta.env.VITE_OPENROUTER_MODEL || "google/gemini-2.0-flash-exp:free";
    return import.meta.env.VITE_GEMINI_MODEL || "gemini-2.0-flash";
  },
  timeoutMs: 35000,
};

