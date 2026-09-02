export const COPILOT_CONFIG = {
  get provider() {
    return localStorage.getItem("copilot_provider") || import.meta.env.VITE_COPILOT_PROVIDER || (import.meta.env.VITE_OPENROUTER_API_KEY ? "OpenRouter" : "Gemini");
  },
  get apiKey() {
    return (
      localStorage.getItem("gemini_api_key") ||
      localStorage.getItem("openrouter_api_key") ||
      import.meta.env.VITE_OPENROUTER_API_KEY ||
      import.meta.env.VITE_GEMINI_API_KEY ||
      ""
    );
  },
  get baseUrl() {
    const key = this.apiKey;
    const isOR = this.provider === "OpenRouter" || key.startsWith("sk-or-") || key.startsWith("sk-");
    return (
      localStorage.getItem("copilot_base_url") ||
      import.meta.env.VITE_OPENROUTER_BASE_URL ||
      (isOR ? "https://openrouter.ai/api/v1" : "https://generativelanguage.googleapis.com/v1beta")
    );
  },
  get model() {
    const isOR = this.provider === "OpenRouter" || this.apiKey.startsWith("sk-or-") || this.apiKey.startsWith("sk-");
    return (
      localStorage.getItem("copilot_model") ||
      import.meta.env.VITE_OPENROUTER_MODEL ||
      import.meta.env.VITE_GEMINI_MODEL ||
      (isOR ? "google/gemini-2.0-flash-exp:free" : "gemini-2.0-flash")
    );
  },
  timeoutMs: 35000,
};

