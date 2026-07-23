export const COPILOT_CONFIG = {
  provider: "Gemini",
  apiKey: import.meta.env.VITE_GEMINI_API_KEY || "",
  baseUrl: import.meta.env.VITE_GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta",
  model: import.meta.env.VITE_GEMINI_MODEL || "gemini-3.5-flash",
  timeoutMs: 30000,
};
