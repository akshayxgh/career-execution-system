import { useState, useMemo } from "react";
import { Bot, Send, X, Loader2 } from "lucide-react";
import type { DecisionJob } from "../../services/decisionIntelligenceService";
import type { CopilotChatMessage } from "../../types/copilot";
import { buildJobContext } from "../../types/copilot";
import { buildCopilotPrompt } from "../../services/copilotPromptBuilder";
import { copilotService } from "../../services/copilotService";

interface JobCopilotWidgetProps {
  job: DecisionJob | null;
}

function formatValue(val: unknown): string {
  if (val === null || val === undefined || val === "") return "N/A";
  if (typeof val === "boolean") return val ? "True" : "False";
  return String(val);
}

function truncateText(text: string | null | undefined, maxLen = 280): string {
  if (!text) return "N/A";
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + "...";
}

const SHOW_COPILOT_DEBUG = false;

export default function JobCopilotWidget({ job }: JobCopilotWidgetProps) {
  const [expanded, setExpanded] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [messages, setMessages] = useState<CopilotChatMessage[]>([
    {
      role: "assistant",
      content: "Hi! I'm your AI Job Copilot.\nI already know this job's requirements and your resume. What would you like to do?",
    },
  ]);

  const jobContext = useMemo(() => {
    return job ? buildJobContext(job) : null;
  }, [job]);

  const currentPromptPreview = useMemo(() => {
    if (!jobContext) return "";
    const activeQuestion = inputValue.trim() || "Is my resume a good fit?";
    return buildCopilotPrompt(jobContext, messages, activeQuestion);
  }, [jobContext, messages, inputValue]);

  const handleSendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading || !jobContext) return;

    const userMessage: CopilotChatMessage = { role: "user", content: trimmed };
    const currentHistory = [...messages];
    
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setLoading(true);
    setError(null);

    try {
      const prompt = buildCopilotPrompt(jobContext, currentHistory, trimmed);
      const reply = await copilotService.generateResponse(prompt);
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to generate response.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!job || !jobContext) {
    return null;
  }

  if (!expanded) {
    return (
      <button 
        className="copilot-floating-btn" 
        onClick={() => setExpanded(true)}
        aria-label="Open AI Job Copilot"
      >
        <Bot size={24} />
      </button>
    );
  }

  return (
    <div className="copilot-widget-panel">
      <div className="copilot-header">
        <div className="copilot-header-info">
          <div className="copilot-header-title">
            <Bot size={18} className="copilot-bot-icon" />
            <span>AI Job Copilot</span>
          </div>
          <div className="copilot-job-context">
            <span className="copilot-job-title" title={jobContext.title}>{jobContext.title}</span>
            <span className="copilot-job-company" title={jobContext.companyName}>{jobContext.companyName}</span>
          </div>
        </div>
        <button 
          className="copilot-close-btn" 
          onClick={() => setExpanded(false)}
          aria-label="Close AI Job Copilot"
        >
          <X size={20} />
        </button>
      </div>

      <div className="copilot-chat-area">
        {/* Developer/Debug Sections (Controlled by flag) */}
        {SHOW_COPILOT_DEBUG && (
          <>
            {/* Temporary Developer/Debug Section */}
            <div 
              style={{ 
                padding: "0.75rem", 
                background: "#1e293b", 
                borderRadius: "0.375rem", 
                border: "1px dashed #3b82f6", 
                fontSize: "0.75rem", 
                lineHeight: 1.4,
                marginBottom: "0.75rem",
                color: "#e2e8f0"
              }}
            >
              <div style={{ color: "#3b82f6", fontWeight: 700, fontSize: "0.825rem", marginBottom: "0.5rem" }}>
                Current Job Context (Debug)
              </div>

              {/* Job Information */}
              <div style={{ marginBottom: "0.5rem" }}>
                <div style={{ color: "#60a5fa", fontWeight: 600, borderBottom: "1px solid rgba(59, 130, 246, 0.3)", paddingBottom: "2px", marginBottom: "4px" }}>
                  Job Information
                </div>
                <div><strong>ID:</strong> {formatValue(jobContext.id)}</div>
                <div><strong>Title:</strong> {formatValue(jobContext.title)}</div>
                <div><strong>Company:</strong> {formatValue(jobContext.companyName)}</div>
                <div><strong>Source:</strong> {formatValue(jobContext.source)}</div>
                <div><strong>Location:</strong> {formatValue(jobContext.location)}</div>
                <div><strong>Experience:</strong> {formatValue(jobContext.experience)}</div>
                <div><strong>Salary:</strong> {formatValue(jobContext.salary)}</div>
                <div><strong>Posted Date:</strong> {formatValue(jobContext.postedDate)}</div>
                <div><strong>Search Keyword:</strong> {formatValue(jobContext.searchKeyword)}</div>
                <div style={{ wordBreak: "break-all" }}><strong>Job URL:</strong> {formatValue(jobContext.url)}</div>
              </div>

              {/* AI Analysis */}
              <div style={{ marginBottom: "0.5rem" }}>
                <div style={{ color: "#60a5fa", fontWeight: 600, borderBottom: "1px solid rgba(59, 130, 246, 0.3)", paddingBottom: "2px", marginBottom: "4px" }}>
                  AI Analysis
                </div>
                <div><strong>Score:</strong> {formatValue(jobContext.aiScore)}</div>
                <div><strong>Recommendation:</strong> {formatValue(jobContext.aiRecommendation)}</div>
                <div><strong>Reason:</strong> {formatValue(jobContext.aiReason)}</div>
              </div>

              {/* Resume Intelligence */}
              <div style={{ marginBottom: "0.5rem" }}>
                <div style={{ color: "#60a5fa", fontWeight: 600, borderBottom: "1px solid rgba(59, 130, 246, 0.3)", paddingBottom: "2px", marginBottom: "4px" }}>
                  Resume Intelligence
                </div>
                <div><strong>Recommended Resume:</strong> {formatValue(jobContext.recommendedResumeName)}</div>
                <div><strong>Recommendation Reason:</strong> {formatValue(jobContext.resumeRecommendationReason)}</div>
              </div>

              {/* Recruiter */}
              <div style={{ marginBottom: "0.5rem" }}>
                <div style={{ color: "#60a5fa", fontWeight: 600, borderBottom: "1px solid rgba(59, 130, 246, 0.3)", paddingBottom: "2px", marginBottom: "4px" }}>
                  Recruiter
                </div>
                <div><strong>HR Email(s):</strong> {formatValue(jobContext.hrEmail)}</div>
                <div><strong>Email to HR:</strong> {formatValue(jobContext.emailToHr)}</div>
              </div>

              {/* Description */}
              <div>
                <div style={{ color: "#60a5fa", fontWeight: 600, borderBottom: "1px solid rgba(59, 130, 246, 0.3)", paddingBottom: "2px", marginBottom: "4px" }}>
                  Description
                </div>
                <div style={{ whiteSpace: "pre-wrap", color: "#cbd5e1" }}>
                  {truncateText(jobContext.description, 280)}
                </div>
              </div>
            </div>

            {/* Temporary Prompt Builder Debug Output */}
            <div
              style={{
                padding: "0.75rem",
                background: "#0f172a",
                borderRadius: "0.375rem",
                border: "1px dashed #10b981",
                fontSize: "0.7rem",
                lineHeight: 1.4,
                marginBottom: "0.75rem",
                color: "#a7f3d0",
                fontFamily: "monospace"
              }}
            >
              <div style={{ color: "#10b981", fontWeight: 700, fontSize: "0.8rem", marginBottom: "0.5rem", fontFamily: "sans-serif" }}>
                Generated LLM Prompt Output (Debug)
              </div>
              <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: "200px", overflowY: "auto" }}>
                {currentPromptPreview}
              </div>
            </div>
          </>
        )}

        {/* Chat Messages */}
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`copilot-message ${msg.role === "user" ? "user-message" : "ai-message"}`}
          >
            <p style={{ whiteSpace: "pre-wrap" }}>{msg.content}</p>
          </div>
        ))}

        {/* Suggestion Chips */}
        <div className="copilot-chips">
          <button 
            className="copilot-chip"
            disabled={loading}
            onClick={() => handleSendMessage("Write a Cover Letter")}
          >
            Write a Cover Letter
          </button>
          <button 
            className="copilot-chip"
            disabled={loading}
            onClick={() => handleSendMessage("Is my resume a good fit?")}
          >
            Is my resume a good fit?
          </button>
          <button 
            className="copilot-chip"
            disabled={loading}
            onClick={() => handleSendMessage("What are the red flags?")}
          >
            What are the red flags?
          </button>
        </div>

        {/* Loading Indicator */}
        {loading && (
          <div className="copilot-message ai-message" style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#94a3b8" }}>
            <Loader2 size={16} className="animate-spin" />
            <span>Thinking...</span>
          </div>
        )}

        {/* Error Indicator */}
        {error && (
          <div 
            style={{ 
              padding: "0.5rem 0.75rem", 
              background: "rgba(239, 68, 68, 0.15)", 
              border: "1px solid rgba(239, 68, 68, 0.4)", 
              borderRadius: "0.375rem", 
              color: "#f87171", 
              fontSize: "0.75rem" 
            }}
          >
            <strong>Error:</strong> {error}
          </div>
        )}
      </div>

      <div className="copilot-input-area">
        <input
          type="text"
          placeholder="Ask about this job..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage(inputValue);
            }
          }}
          disabled={loading}
          className="copilot-input"
        />
        <button 
          className="copilot-send-btn" 
          disabled={!inputValue.trim() || loading}
          onClick={() => handleSendMessage(inputValue)}
          aria-label="Send message"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      </div>
    </div>
  );
}

