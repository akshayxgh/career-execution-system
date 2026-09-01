export const COPILOT_CONFIG = {
  provider: import.meta.env.VITE_COPILOT_PROVIDER || (import.meta.env.VITE_OPENROUTER_API_KEY ? "OpenRouter" : "Gemini"),
  apiKey: import.meta.env.VITE_OPENROUTER_API_KEY || import.meta.env.VITE_GEMINI_API_KEY || "",
  baseUrl: import.meta.env.VITE_OPENROUTER_BASE_URL || (import.meta.env.VITE_OPENROUTER_API_KEY ? "https://openrouter.ai/api/v1" : "https://generativelanguage.googleapis.com/v1beta"),
  model: import.meta.env.VITE_OPENROUTER_MODEL || (import.meta.env.VITE_OPENROUTER_API_KEY ? "google/gemini-2.0-flash-exp:free" : "gemini-1.5-flash"),
  timeoutMs: 30000,
};

