import type { CurrentJobContext, CopilotChatMessage } from "../types/copilot";

function formatValue(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "Not Available";
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  return String(value);
}

/**
 * Converts CurrentJobContext, conversation history, and current user question
 * into a structured, deterministic prompt string for the LLM.
 */
export function buildCopilotPrompt(
  context: CurrentJobContext,
  history: CopilotChatMessage[] = [],
  userMessage: string
): string {
  const systemInstructions = `[SYSTEM INSTRUCTIONS]
You are an expert AI Job Copilot and context-aware career assistant dedicated strictly to analyzing and assisting with the specified job below.
Behave as a fast, concise, and conversational assistant.

RESPONSE RULES:
- Keep default responses under 150 words.
- Prefer bullet points over long paragraphs.
- Answer directly without repeating the entire job description or background context.
- Only generate detailed explanations or longer materials if the user explicitly requests them.
- Keep responses practical, direct, and actionable.
- If information is not available in the context, state that clearly.`;

  const jobInformation = `[CURRENT JOB INFORMATION]
- Job ID: ${formatValue(context.id)}
- Job Title: ${formatValue(context.title)}
- Company Name: ${formatValue(context.companyName)}
- Location: ${formatValue(context.location)}
- Experience: ${formatValue(context.experience)}
- Salary: ${formatValue(context.salary)}
- Posted Date: ${formatValue(context.postedDate)}
- Search Keyword: ${formatValue(context.searchKeyword)}
- Source: ${formatValue(context.source)}
- Job URL: ${formatValue(context.url)}
- Description: ${formatValue(context.description)}`;

  const aiAnalysis = `[AI ANALYSIS]
- Score: ${formatValue(context.aiScore)}
- Recommendation: ${formatValue(context.aiRecommendation)}
- Reason: ${formatValue(context.aiReason)}`;

  const resumeRecommendation = `[RESUME RECOMMENDATION]
- Recommended Resume: ${formatValue(context.recommendedResumeName)}
- Recommendation Reason: ${formatValue(context.resumeRecommendationReason)}`;

  const recruiterInformation = `[RECRUITER INFORMATION]
- HR Email: ${formatValue(context.hrEmail)}
- Email to HR Flag: ${formatValue(context.emailToHr)}`;

  let conversationHistoryStr = "[CONVERSATION HISTORY]\nNo previous conversation history.";
  if (history.length > 0) {
    const formatted = history
      .map((msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`)
      .join("\n");
    conversationHistoryStr = `[CONVERSATION HISTORY]\n${formatted}`;
  }

  const currentUserQuestion = `[CURRENT USER QUESTION]
${userMessage.trim() || "Not Available"}`;

  return [
    systemInstructions,
    jobInformation,
    aiAnalysis,
    resumeRecommendation,
    recruiterInformation,
    conversationHistoryStr,
    currentUserQuestion,
  ].join("\n\n");
}
