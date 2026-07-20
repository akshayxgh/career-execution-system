import { useState, useMemo } from "react";
import { Bot, Send, X } from "lucide-react";
import type { DecisionJob } from "../../services/decisionIntelligenceService";
import { buildJobContext } from "../../types/copilot";

interface JobCopilotWidgetProps {
  job: DecisionJob | null;
}

export default function JobCopilotWidget({ job }: JobCopilotWidgetProps) {
  const [expanded, setExpanded] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const jobContext = useMemo(() => {
    return job ? buildJobContext(job) : null;
  }, [job]);

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
        {/* Temporary Developer/Debug Section */}
        <div style={{ padding: "0.75rem", background: "#1e293b", borderRadius: "0.25rem", border: "1px dashed #3b82f6", fontSize: "0.75rem", marginBottom: "0.5rem" }}>
          <strong style={{ color: "#3b82f6", display: "block", marginBottom: "0.25rem" }}>Current Job Loaded</strong>
          <div>Title: {jobContext.title}</div>
          <div>Company: {jobContext.companyName}</div>
          <div>Recommendation: {jobContext.aiRecommendation}</div>
          <div>Score: {jobContext.aiScore}</div>
        </div>

        <div className="copilot-message ai-message">
          <p>Hi! I'm your AI Job Copilot.</p>
          <p>I already know this job's requirements and your resume. What would you like to do?</p>
        </div>

        <div className="copilot-chips">
          <button className="copilot-chip">Write a Cover Letter</button>
          <button className="copilot-chip">Is my resume a good fit?</button>
          <button className="copilot-chip">What are the red flags?</button>
        </div>

        <div className="copilot-message user-message">
          <p>Is my resume a good fit?</p>
        </div>

        <div className="copilot-message ai-message">
          <p>Yes, you have strong experience in Power BI, but you lack Python...</p>
        </div>
      </div>

      <div className="copilot-input-area">
        <input
          type="text"
          placeholder="Ask about this job..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="copilot-input"
        />
        <button 
          className="copilot-send-btn" 
          disabled={!inputValue.trim()}
          aria-label="Send message"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
