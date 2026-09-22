export const COPILOT_CONFIG = {
  get geminiApiKey() {
    let raw = localStorage.getItem("gemini_api_key");
    if (!raw) {
      try {
        const store = JSON.parse(localStorage.getItem("career_execution_system_state_v1") || "{}");
        raw = store?.settings?.geminiApiKey;
      } catch {}
    }
    if (!raw) {
      const aiKey = localStorage.getItem("ai_api_key");
      if (aiKey && (aiKey.startsWith("AQ.") || aiKey.startsWith("AIza"))) {
        raw = aiKey;
      }
    }
    return (raw || "").trim().replace(/^['"]|['"]$/g, "");
  },

  get groqApiKey() {
    let raw = localStorage.getItem("groq_api_key");
    if (!raw) {
      try {
        const store = JSON.parse(localStorage.getItem("career_execution_system_state_v1") || "{}");
        raw = store?.settings?.groqApiKey;
      } catch {}
    }
    if (!raw) {
      const aiKey = localStorage.getItem("ai_api_key");
      if (aiKey && aiKey.startsWith("gsk_")) {
        raw = aiKey;
      }
    }
    return (raw || "").trim().replace(/^['"]|['"]$/g, "");
  },

  get apiKey() {
    // Return primary key configured in MyCES
    return this.groqApiKey || this.geminiApiKey || "";
  },

  get provider() {
    const key = this.apiKey;
    if (key.startsWith("gsk_")) return "Groq";
    if (key.startsWith("xai-")) return "Grok";
    if (key.startsWith("sk-or-") || key.startsWith("sk-")) return "OpenRouter";
    if (this.groqApiKey) return "Groq";
    return "Gemini";
  },

  get baseUrl() {
    const prov = this.provider;
    if (prov === "Groq") return "https://api.groq.com/openai/v1";
    if (prov === "Grok") return "https://api.x.ai/v1";
    if (prov === "OpenRouter") return "https://openrouter.ai/api/v1";
    return "https://generativelanguage.googleapis.com/v1beta";
  },

  get model() {
    const prov = this.provider;
    if (prov === "Groq") return "openai/gpt-oss-120b";
    if (prov === "Grok") return "grok-2-vision-1212";
    if (prov === "OpenRouter") return "google/gemini-2.0-flash-exp:free";
    return "gemini-2.5-flash";
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

export function setDualApiKeys(keys: { geminiKey?: string; groqKey?: string }) {
  if (keys.geminiKey !== undefined) {
    const cleanGemini = keys.geminiKey.trim().replace(/^['"]|['"]$/g, "");
    if (cleanGemini) {
      localStorage.setItem("gemini_api_key", cleanGemini);
    } else {
      localStorage.removeItem("gemini_api_key");
    }
  }

  if (keys.groqKey !== undefined) {
    const cleanGroq = keys.groqKey.trim().replace(/^['"]|['"]$/g, "");
    if (cleanGroq) {
      localStorage.setItem("groq_api_key", cleanGroq);
    } else {
      localStorage.removeItem("groq_api_key");
    }
  }
}

