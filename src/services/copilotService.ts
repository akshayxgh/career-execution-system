import { COPILOT_CONFIG } from "../config/copilotConfig";

export class CopilotService {
  /**
   * Sends the formatted prompt to the configured Gemini API
   * and returns the assistant's plain text response.
   */
  async generateResponse(prompt: string): Promise<string> {
    const { apiKey, baseUrl, model, provider, timeoutMs } = COPILOT_CONFIG;

    if (!apiKey) {
      throw new Error(
        "Gemini API key is missing. Please add VITE_GEMINI_API_KEY to your .env file."
      );
    }

    const startTime = Date.now();
    const promptLength = prompt.length;

    console.log(`[CopilotService Debug] Sending prompt to AI provider:`, {
      provider,
      model,
      promptLength,
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const url = `${baseUrl}/models/${model}:generateContent?key=${apiKey}`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorDetails = "";
        try {
          const errData = await response.json();
          errorDetails = errData?.error?.message || response.statusText;
        } catch {
          errorDetails = response.statusText;
        }

        if (response.status === 400 || response.status === 401) {
          throw new Error(`Invalid API key or request format for Gemini API: ${errorDetails}`);
        } else if (response.status === 429) {
          throw new Error("Rate limit exceeded for Gemini API. Please wait a moment before trying again.");
        } else if (response.status >= 500) {
          throw new Error(`Gemini API provider is currently unavailable (${response.status}).`);
        } else {
          throw new Error(`Gemini request failed (${response.status}): ${errorDetails}`);
        }
      }

      const data = await response.json();
      const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!content || typeof content !== "string") {
        throw new Error("Received empty or invalid response payload from Gemini API.");
      }

      const responseTimeMs = Date.now() - startTime;
      console.log(`[CopilotService Debug] Response received from AI provider:`, {
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
          throw new Error("Request to Gemini API timed out after 30 seconds.");
        }
        throw err;
      }

      throw new Error("An unexpected error occurred while communicating with the Gemini AI service.");
    }
  }
}

export const copilotService = new CopilotService();
