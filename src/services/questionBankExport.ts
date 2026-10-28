import type { QuestionBankItem } from '../types';

/**
 * Predefined ChatGPT technical interview practice prompt.
 */
export const CHATGPT_INTERVIEW_PROMPT = `Use my uploaded \`MyCES Interview Question Bank\` Markdown file as the authoritative source for interview questions and reference answers.

Act as a realistic technical interviewer for Power BI Developer and Data Analyst roles.

1. Ask one question at a time.
2. Select questions from the uploaded bank and preserve their original meaning. You may rephrase them naturally.
3. Do not reveal the reference answer before I respond.
4. Evaluate my answer against the reference answer, execution recipe, code examples, and senior-level guidance when available.
5. Ask relevant follow-up questions based on my responses. You may create follow-ups to test my understanding, but distinguish them from questions in the source bank.
6. If you introduce a completely new main interview question, explicitly identify it as an original question rather than one from MyCES.
7. Do not claim a question exists in the bank unless you can locate it in the uploaded source.
8. Conduct the interview naturally in voice mode, one question at a time, and give feedback after my response when appropriate.

Start the interview naturally without requiring me to say "start interview."`;

export interface ExportForChatGPTResult {
  success: boolean;
  totalExported: number;
  filename: string;
  downloaded: boolean;
  promptCopied: boolean;
}

/**
 * Executes the single-click ChatGPT export:
 * 1. Downloads the complete question bank as a Markdown (.md) file.
 * 2. Copies the predefined ChatGPT interview practice prompt to clipboard.
 */
export async function exportQuestionBankForChatGPT(
  questions: QuestionBankItem[],
  customDate?: Date
): Promise<ExportForChatGPTResult> {
  const filename = getExportFilename(customDate);
  const markdown = formatQuestionBankToMarkdown(questions, { exportDate: customDate });

  const downloaded = downloadMarkdownFile(markdown, filename);
  const promptCopied = await copyTextToClipboard(CHATGPT_INTERVIEW_PROMPT);

  return {
    success: downloaded && promptCopied,
    totalExported: questions.length,
    filename,
    downloaded,
    promptCopied,
  };
}

/**
 * Generates the standardized descriptive export filename.
 * Pattern: myces-interview-question-bank-YYYY-MM-DD.md
 */
export function getExportFilename(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `myces-interview-question-bank-${year}-${month}-${day}.md`;
}

/**
 * Determines appropriate code fence language based on tool and question context.
 */
export function detectCodeLanguage(tool?: string, topic?: string): string {
  const toolLower = (tool || '').toLowerCase();
  const topicLower = (topic || '').toLowerCase();

  if (toolLower.includes('sql') || topicLower.includes('sql')) return 'sql';
  if (toolLower.includes('python') || topicLower.includes('python') || topicLower.includes('pandas')) return 'python';
  if (
    toolLower.includes('power bi') ||
    toolLower.includes('dax') ||
    toolLower.includes('fabric') ||
    topicLower.includes('dax')
  ) {
    return 'dax';
  }
  if (toolLower.includes('excel') || topicLower.includes('excel')) return 'excel';
  return '';
}

/**
 * Formats code snippet with dynamic backtick length to prevent fence collision.
 */
export function formatCodeBlock(code: string, lang: string = ''): string {
  const matches = code.match(/`{3,}/g);
  const fence = matches ? '`'.repeat(Math.max(...matches.map((m) => m.length)) + 1) : '```';
  return `${fence}${lang}\n${code}\n${fence}`;
}

/**
 * Serializes the complete, authoritative question bank into structured Markdown
 * tailored for human readability and ChatGPT voice-interview reference.
 */
export function formatQuestionBankToMarkdown(
  questions: QuestionBankItem[],
  options: { exportDate?: Date } = {}
): string {
  const date = options.exportDate || new Date();
  const dateStr = date.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

  // Deterministic stable sorting: createdAt ascending, fallback to id ascending
  const sorted = [...questions].sort((a, b) => {
    const dateA = a.createdAt || '';
    const dateB = b.createdAt || '';
    const dateCompare = dateA.localeCompare(dateB);
    if (dateCompare !== 0) return dateCompare;
    return (a.id || '').localeCompare(b.id || '');
  });

  const lines: string[] = [];

  // Top-Level Document Metadata
  lines.push('# MyCES Interview Question Bank');
  lines.push('');
  lines.push(`- **Export Date:** ${dateStr}`);
  lines.push(`- **Total Questions:** ${sorted.length}`);
  lines.push('- **Authoritative Source:** MyCES (Career Execution System)');
  lines.push('- **Notice:** This document contains verified source interview questions, practitioner answers (30s verbal pitches), practical execution recipes, and senior-level guidance.');
  lines.push('- **Intended Use:** Upload directly to ChatGPT or paste as reference context for voice-based interview simulation.');
  lines.push('');
  lines.push('---');
  lines.push('');

  sorted.forEach((item, index) => {
    const qNum = index + 1;
    lines.push(`## Question ${qNum}`);
    lines.push('');

    // Metadata bullet points
    lines.push(`- **Question ID:** \`${item.id}\``);

    const companies =
      item.companiesAsked && item.companiesAsked.length > 0
        ? Array.from(new Set([item.company, ...item.companiesAsked].filter(Boolean)))
        : [item.company || 'General'];
    lines.push(`- **Company:** ${companies.join(', ')}`);

    lines.push(`- **Role:** ${item.role || 'Unspecified'}`);

    if (item.tool) {
      lines.push(`- **Tool:** ${item.tool}`);
    }

    if (item.topic) {
      lines.push(`- **Topic:** ${item.topic}`);
    }

    if (item.difficulty) {
      lines.push(`- **Difficulty:** ${item.difficulty}`);
    }

    if (item.confidence) {
      lines.push(`- **Confidence Level:** ${item.confidence}`);
    }

    if (item.enrichmentStatus) {
      lines.push(`- **Enrichment Status:** ${item.enrichmentStatus}`);
    }

    if (item.frequencyCount && item.frequencyCount > 1) {
      lines.push(`- **Frequency Count:** ${item.frequencyCount}x Asked`);
    }

    if (item.tags && item.tags.length > 0) {
      const cleanTags = item.tags
        .map((t) => t.trim().replace(/^#/, ''))
        .filter(Boolean)
        .map((t) => `#${t}`);
      if (cleanTags.length > 0) {
        lines.push(`- **Tags:** ${cleanTags.join(', ')}`);
      }
    }

    if (item.aliases && item.aliases.length > 0) {
      const cleanAliases = item.aliases.filter(Boolean);
      if (cleanAliases.length > 0) {
        lines.push(`- **Alternative Question Phrasings:** ${cleanAliases.map((a) => `"${a}"`).join('; ')}`);
      }
    }

    if (item.createdAt) {
      lines.push(`- **Created At:** ${item.createdAt}`);
    }

    if (item.updatedAt && item.updatedAt !== item.createdAt) {
      lines.push(`- **Updated At:** ${item.updatedAt}`);
    }

    lines.push('');

    // Question
    lines.push('### Question');
    lines.push('');
    lines.push(item.question.trim());
    lines.push('');

    // Answer (30s Verbal Pitch)
    if (item.humanAnswer?.pitch && item.humanAnswer.pitch.trim()) {
      lines.push('### Practitioner Answer (30-Second Verbal Pitch)');
      lines.push('');
      lines.push(item.humanAnswer.pitch.trim());
      lines.push('');
    }

    // Practical Execution Recipe
    if (item.humanAnswer?.steps && item.humanAnswer.steps.length > 0) {
      const validSteps = item.humanAnswer.steps.map((s) => s.trim()).filter(Boolean);
      if (validSteps.length > 0) {
        lines.push('### Practical Execution Recipe');
        lines.push('');
        validSteps.forEach((step, sIdx) => {
          lines.push(`${sIdx + 1}. ${step}`);
        });
        lines.push('');
      }
    }

    // Senior Guidance & Pro-Tip
    if (item.humanAnswer?.proTip && item.humanAnswer.proTip.trim()) {
      lines.push('### Senior Guidance & Pro-Tip');
      lines.push('');
      lines.push(item.humanAnswer.proTip.trim());
      lines.push('');
    }

    // Code / Example
    if (item.humanAnswer?.codeSnippet && item.humanAnswer.codeSnippet.trim()) {
      const lang = detectCodeLanguage(item.tool, item.topic);
      lines.push('### Code / Example');
      lines.push('');
      lines.push(formatCodeBlock(item.humanAnswer.codeSnippet.trim(), lang));
      lines.push('');
    }

    // Raw Source / Context
    if (item.rawSource && item.rawSource.trim()) {
      lines.push('### Source / Raw Context');
      lines.push('');
      lines.push(item.rawSource.trim());
      lines.push('');
    }

    lines.push('---');
    lines.push('');
  });

  return lines.join('\n');
}

/**
 * Robust clipboard copy utility supporting navigator.clipboard with textarea fallback.
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  // 1. Try modern navigator.clipboard API
  if (navigator?.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('navigator.clipboard.writeText rejected, attempting fallback:', err);
    }
  }

  // 2. Fallback to document.execCommand('copy')
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.width = '2em';
    textArea.style.height = '2em';
    textArea.style.padding = '0';
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.boxShadow = 'none';
    textArea.style.background = 'transparent';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (fallbackErr) {
    console.error('Fallback clipboard copy failed:', fallbackErr);
    return false;
  }
}

/**
 * Triggers a browser file download of Markdown content and revokes temporary URL.
 */
export function downloadMarkdownFile(content: string, filename: string): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;

  try {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Revoke object URL after delay to allow browser download initiation
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1500);

    return true;
  } catch (err) {
    console.error('File download failed:', err);
    return false;
  }
}
