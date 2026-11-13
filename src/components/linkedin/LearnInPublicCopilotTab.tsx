import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Video,
  BookOpen,
  Edit3,
  Check,
  Copy,
  Send,
  RefreshCw,
  AlertCircle,
  Zap,
  ThumbsUp,
  MessageSquare,
  Share2,
} from 'lucide-react';
import type { AgentContentContext, ContentContextConcept } from '../../types/linkedin';
import { copilotService } from '../../services/copilotService';
import { linkedinAgentService } from '../../services/linkedinAgentService';

interface LearnInPublicCopilotTabProps {
  contentContext: AgentContentContext | null;
  onActionProposed: () => void;
  onRefreshActions: () => Promise<void>;
  userName?: string;
  userHeadline?: string;
}

type LearningSource = 'VIDEO' | 'CONCEPT' | 'SCRATCHPAD';
type PostFlavor = 'KEY_TAKEAWAYS' | 'PRACTITIONER_TEARDOWN' | 'GOTCHA' | 'PRACTICAL_APPLICATION' | 'A_VS_B';

export const LearnInPublicCopilotTab: React.FC<LearnInPublicCopilotTabProps> = ({
  contentContext,
  onActionProposed,
  onRefreshActions,
  userName = 'Akshay',
  userHeadline = 'Senior Data & BI Engineer • Power BI | SQL | Fabric',
}) => {
  // Source Selection
  const [sourceMode, setSourceMode] = useState<LearningSource>('VIDEO');

  // Video / Course State
  const [videoUrl, setVideoUrl] = useState('');
  const [videoMeta, setVideoMeta] = useState<{
    title: string;
    author: string;
    thumbnail: string;
    provider: string;
    url: string;
  } | null>(null);
  const [isFetchingMeta, setIsFetchingMeta] = useState(false);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [videoNotes, setVideoNotes] = useState('');

  // Curriculum Concept State
  const [selectedConceptId, setSelectedConceptId] = useState<string>(
    contentContext?.concepts?.[0]?.id || ''
  );

  // Scratchpad State
  const [scratchpadTitle, setScratchpadTitle] = useState('');
  const [scratchpadText, setScratchpadText] = useState('');

  // Post Flavor / Archetype
  const [postFlavor, setPostFlavor] = useState<PostFlavor>('KEY_TAKEAWAYS');

  // Generation & Draft State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedDraft, setGeneratedDraft] = useState('');
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [isSubmittingProposal, setIsSubmittingProposal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Hook Studio State
  const [isGeneratingHooks, setIsGeneratingHooks] = useState(false);
  const [alternateHooks, setAlternateHooks] = useState<string[]>([]);
  const [hookStudioOpen, setHookStudioOpen] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const selectedConcept = useMemo<ContentContextConcept | undefined>(() => {
    return (contentContext?.concepts || []).find((c: ContentContextConcept) => c.id === selectedConceptId);
  }, [contentContext, selectedConceptId]);

  // Handle Video URL Fetching
  const handleFetchVideoMeta = async (urlToFetch?: string) => {
    const target = (urlToFetch || videoUrl).trim();
    if (!target) return;

    try {
      setIsFetchingMeta(true);
      setMetaError(null);
      const meta = await linkedinAgentService.fetchVideoMetadata(target);
      if (meta && (meta.title || meta.author)) {
        setVideoMeta({
          title: meta.title || target,
          author: meta.author || 'Creator',
          thumbnail: meta.thumbnail || '',
          provider: meta.provider || 'Video',
          url: meta.url || target,
        });
      } else {
        setVideoMeta({
          title: target,
          author: 'Creator',
          thumbnail: '',
          provider: 'Web Link',
          url: target,
        });
      }
    } catch {
      // Fallback without failing completely
      setVideoMeta({
        title: target,
        author: 'Creator',
        thumbnail: '',
        provider: 'Video/Course',
        url: target,
      });
    } finally {
      setIsFetchingMeta(false);
    }
  };

  // Generate Post Prompt based on Source & Flavor
  const handleGeneratePost = async () => {
    try {
      setIsGenerating(true);
      setGenerationError(null);
      setGeneratedDraft('');
      setAlternateHooks([]);
      setHookStudioOpen(false);

      const memoryDirectives =
        contentContext?.memories && Array.isArray(contentContext.memories) && contentContext.memories.length > 0
          ? `\nStrategic Style Rules:\n` +
            (contentContext.memories as Array<{ memory_type: string; key: string; value: unknown }>)
              .map((m) => {
                const val = typeof m.value === 'string' ? m.value : JSON.stringify(m.value);
                return `• [${m.memory_type}] ${m.key}: ${val}`;
              })
              .join('\n') +
            '\n'
          : '';

      let sourceDetails = '';
      if (sourceMode === 'VIDEO') {
        const title = videoMeta?.title || videoUrl || 'Technical Video/Tutorial';
        const author = videoMeta?.author ? `by ${videoMeta.author}` : '';
        sourceDetails = `
Source Type: Video / Course Breakdown
Title: ${title} ${author}
Reference URL: ${videoMeta?.url || videoUrl}
User's Notes / Key Takeaways:
${videoNotes.trim() ? videoNotes.trim() : 'Synthesize the core technical premise of this topic with high authority.'}
`;
      } else if (sourceMode === 'CONCEPT') {
        if (!selectedConcept) throw new Error('Please select a curriculum concept.');
        sourceDetails = `
Source Type: Curriculum Technical Concept
Concept: ${selectedConcept.name}
Status: ${selectedConcept.status}
Technical Context: ${selectedConcept.notes || 'Mastery module in Power BI / SQL / Data Engineering'}
`;
      } else {
        if (!scratchpadText.trim()) throw new Error('Please enter some notes in the scratchpad.');
        sourceDetails = `
Source Type: Practical Engineering Scratchpad
Title / Focus: ${scratchpadTitle || 'Production Observation / TIL'}
Raw Notes / Code / Bug:
${scratchpadText.trim()}
`;
      }

      const flavorInstructions: Record<PostFlavor, string> = {
        KEY_TAKEAWAYS: `
Archetype: "The 3 Key Technical Takeaways" (High Save/Bookmark Rate).
Format:
- Punchy 1-2 sentence hook highlighting the problem or why most people get this wrong.
- Context on why you studied/watched this.
- Exactly 3 actionable, numbered takeaways with concise, senior-level explanations.
- A technical synthesis sentence explaining how to apply it.
- A thoughtful discussion question for engineering peers.
`,
        PRACTITIONER_TEARDOWN: `
Archetype: "Practitioner Teardown & Analysis" (Authority & Perspective).
Format:
- Provocative practitioner observation or contrarian hook.
- Deep dive into why this architectural choice, syntax, or tool behavior matters in production.
- Pros vs Cons or nuance that junior developers frequently miss.
- Clear conclusion.
`,
        GOTCHA: `
Archetype: "The Production Trap / Bug Fix" (Storytelling & Debugging).
Format:
- Hook: "I spent hours debugging this / I see this mistake constantly in production pipelines..."
- The Trap: What happens vs what is expected (e.g., DAX row context transition, SQL Cartesian explosion, API pagination pitfall).
- The Fix: Clear solution with exact mental model.
- Takeaway.
`,
        PRACTICAL_APPLICATION: `
Archetype: "I Tested This in Practice" (Proof-of-Work & Benchmarks).
Format:
- Hook explaining the benchmark or technique you applied.
- The Setup: What dataset or project you tested it on.
- The Result: Latency, clean code, or maintenance improvement.
- Discussion question.
`,
        A_VS_B: `
Archetype: "Pattern A vs Pattern B Teardown" (Comparative Architecture).
Format:
- Hook comparing two common tools or patterns (e.g. Window Functions vs GROUP BY, Direct Lake vs DirectQuery, CTEs vs Subqueries).
- When to use Option A.
- When to use Option B.
- The decisive senior factor (performance, readability, cost).
`,
      };

      const prompt = `You are a Senior Principal Data & BI Engineer writing a high-impact, authentic "Learning in Public" LinkedIn post.
Author: ${userName} (${userHeadline})

${sourceDetails}

Selected Angle:
${flavorInstructions[postFlavor]}
${memoryDirectives}
Critical Formatting Rules:
1. Hook (Lines 1-2): Must be captivating and under 180 characters so it fits before LinkedIn's "...see more" cutoff. NEVER start with generic fluff like "In today's fast-paced world", "Excited to share", "Have you ever wondered?", or "Hey LinkedIn fam".
2. Readability: Use single-line breaks between sentences and clear bullet points. No giant text walls.
3. Senior Tone: Confident, practical, authentic, and technically grounded.
4. Attribution: If this is from a video or creator, naturally credit the creator (e.g. "@CreatorName / CreatorName") so it invites engagement.
5. Hashtags: End with 3-5 clean, relevant hashtags (e.g. #DataEngineering #PowerBI #SQL #LearningInPublic).

Return ONLY the final ready-to-publish post content. Do not include markdown code fence wrappers or commentary.`;

      const response = await copilotService.generateMultimodalResponse(prompt);
      setGeneratedDraft(response.trim());
      showToast('Post generated successfully! Check the LinkedIn preview below.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Post generation failed.';
      setGenerationError(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate Alternate Hooks
  const handleGenerateAlternateHooks = async () => {
    if (!generatedDraft) return;
    try {
      setIsGeneratingHooks(true);
      const prompt = `Here is an existing LinkedIn post draft:
"""
${generatedDraft}
"""

Generate 3 DISTINCT, high-converting alternative opening hooks (first 1-2 lines) for this exact post:
1. Contrarian Hook (Challenges a common myth or popular belief)
2. Story Hook (Action-oriented, "I spent 2 hours debugging / testing...")
3. Data-Driven / High-Stakes Hook ("90% of data pipelines waste...", "3x query speedup...")

Return ONLY the 3 hooks numbered 1., 2., 3., with no commentary. Each hook must be under 180 characters.`;

      const response = await copilotService.generateMultimodalResponse(prompt);
      const lines = response
        .split('\n')
        .map((l) => l.replace(/^\d+[\s.:\)-]*/, '').trim())
        .filter((l) => l.length > 10);
      setAlternateHooks(lines.slice(0, 3));
      setHookStudioOpen(true);
    } catch {
      showToast('Failed to generate alternate hooks.');
    } finally {
      setIsGeneratingHooks(false);
    }
  };

  // Replace Hook in Draft
  const handleApplyHook = (newHook: string) => {
    if (!generatedDraft) return;
    const lines = generatedDraft.split('\n');
    // Replace first non-empty 1-2 lines with the new hook
    let firstBodyIndex = 0;
    while (firstBodyIndex < lines.length && !lines[firstBodyIndex].trim()) {
      firstBodyIndex++;
    }
    // Skip old hook paragraph
    let endOfHookIndex = firstBodyIndex;
    while (endOfHookIndex < lines.length && lines[endOfHookIndex].trim()) {
      endOfHookIndex++;
    }
    const remainingBody = lines.slice(endOfHookIndex).join('\n');
    const updated = `${newHook}\n\n${remainingBody.trim()}`;
    setGeneratedDraft(updated);
    showToast('Applied new hook to post!');
  };

  // Submit to Approvals Queue
  const handleSubmitToQueue = async () => {
    if (!generatedDraft.trim()) return;

    try {
      setIsSubmittingProposal(true);
      setGenerationError(null);

      const topicTitle =
        sourceMode === 'VIDEO'
          ? videoMeta?.title || 'Video Synthesis'
          : sourceMode === 'CONCEPT'
          ? selectedConcept?.name || 'Curriculum Concept'
          : scratchpadTitle || 'Practical Engineering Notes';

      await linkedinAgentService.createProposedAction({
        content: generatedDraft.trim(),
        topic: topicTitle,
        reasoning: `Learning in Public post generated from ${sourceMode} (${postFlavor.replace(/_/g, ' ')})`,
        concept_id: sourceMode === 'CONCEPT' ? selectedConcept?.id : undefined,
        action_type: 'PUBLISH_POST',
        tags: ['#LearningInPublic', '#DataEngineering', '#PowerBI'],
      });

      showToast('Post successfully queued in Approvals Queue!');
      await onRefreshActions();
      onActionProposed();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to queue post.';
      setGenerationError(msg);
    } finally {
      setIsSubmittingProposal(false);
    }
  };

  const handleCopyDraft = () => {
    if (!generatedDraft) return;
    navigator.clipboard.writeText(generatedDraft);
    showToast('Post copied to clipboard!');
  };

  // Measure characters for fold cutoff calculation (~200 chars on mobile/desktop feed)
  const foldCharacterLimit = 200;
  const isHookShortEnough = generatedDraft.slice(0, foldCharacterLimit).includes('\n\n') || generatedDraft.length <= foldCharacterLimit;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '2rem',
            right: '2rem',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            color: '#ffffff',
            padding: '0.75rem 1.25rem',
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            fontWeight: 600,
            fontSize: '0.875rem',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <Check size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* HEADER HERO */}
      <div
        className="card"
        style={{
          padding: '1.25rem 1.5rem',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, rgba(10, 102, 194, 0.12) 0%, rgba(99, 102, 241, 0.08) 100%)',
          border: '1px solid rgba(10, 102, 194, 0.25)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #0a66c2, #6366f1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(10, 102, 194, 0.35)',
            }}
          >
            <Sparkles size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Learn in Public Copilot
              </h2>
              <span
                style={{
                  fontSize: '0.7rem',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '999px',
                  background: 'rgba(16, 185, 129, 0.2)',
                  color: '#10b981',
                  fontWeight: 700,
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                }}
              >
                PROVEN LINKEDIN FORMATS
              </span>
            </div>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.825rem', color: 'var(--text-muted)' }}>
              Synthesize videos, courses, and engineering gotchas into high-converting posts that prove your competence.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div
            style={{
              padding: '0.4rem 0.75rem',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-color)',
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
            }}
          >
            Mastered Concepts: <strong style={{ color: 'var(--text-main)' }}>{contentContext?.concepts?.length || 0}</strong>
          </div>
        </div>
      </div>

      {/* STEP 1: SOURCE SELECTOR */}
      <section
        className="card"
        style={{
          padding: '1.25rem 1.5rem',
          borderRadius: '10px',
          border: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-card)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <span
            style={{
              width: '22px',
              height: '22px',
              borderRadius: '50%',
              background: 'var(--accent-primary)',
              color: '#fff',
              fontSize: '0.75rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            1
          </span>
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>
            Choose What You Learned Today:
          </h3>
        </div>

        {/* Source Pills */}
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          <button
            type="button"
            onClick={() => setSourceMode('VIDEO')}
            style={{
              padding: '0.55rem 1rem',
              borderRadius: '8px',
              border: sourceMode === 'VIDEO' ? '1px solid #ef4444' : '1px solid var(--border-color)',
              background: sourceMode === 'VIDEO' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.03)',
              color: sourceMode === 'VIDEO' ? '#f87171' : 'var(--text-muted)',
              fontWeight: 700,
              fontSize: '0.825rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Video size={16} />
            <span>Video / Course Breakdown</span>
          </button>

          <button
            type="button"
            onClick={() => setSourceMode('CONCEPT')}
            style={{
              padding: '0.55rem 1rem',
              borderRadius: '8px',
              border: sourceMode === 'CONCEPT' ? '1px solid #6366f1' : '1px solid var(--border-color)',
              background: sourceMode === 'CONCEPT' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.03)',
              color: sourceMode === 'CONCEPT' ? '#818cf8' : 'var(--text-muted)',
              fontWeight: 700,
              fontSize: '0.825rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <BookOpen size={16} />
            <span>Curriculum Technical Concept</span>
          </button>

          <button
            type="button"
            onClick={() => setSourceMode('SCRATCHPAD')}
            style={{
              padding: '0.55rem 1rem',
              borderRadius: '8px',
              border: sourceMode === 'SCRATCHPAD' ? '1px solid #10b981' : '1px solid var(--border-color)',
              background: sourceMode === 'SCRATCHPAD' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.03)',
              color: sourceMode === 'SCRATCHPAD' ? '#34d399' : 'var(--text-muted)',
              fontWeight: 700,
              fontSize: '0.825rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Edit3 size={16} />
            <span>Quick Brain Dump / Bug Fix</span>
          </button>
        </div>

        {/* SOURCE 1: VIDEO / COURSE INPUT */}
        {sourceMode === 'VIDEO' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>
                YouTube or Course URL (or Title):
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. https://youtu.be/6HjTuZwNrbo or Alex The Analyst SQL Project"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  onBlur={() => {
                    if (videoUrl.trim() && !videoMeta) handleFetchVideoMeta();
                  }}
                  style={{ flex: 1, padding: '0.65rem 0.85rem', borderRadius: '6px', fontSize: '0.85rem' }}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => handleFetchVideoMeta()}
                  disabled={isFetchingMeta || !videoUrl.trim()}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap' }}
                >
                  {isFetchingMeta ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Zap size={14} />}
                  <span>{isFetchingMeta ? 'Fetching...' : 'Auto-Detect'}</span>
                </button>
              </div>
              {metaError && (
                <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.35rem' }}>
                  {metaError}
                </div>
              )}
            </div>

            {/* Video Preview Card if detected */}
            {videoMeta && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.85rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                }}
              >
                {videoMeta.thumbnail ? (
                  <img
                    src={videoMeta.thumbnail}
                    alt="Thumbnail"
                    style={{ width: '80px', height: '48px', objectFit: 'cover', borderRadius: '4px' }}
                  />
                ) : (
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '6px',
                      background: 'rgba(239, 68, 68, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ef4444',
                    }}
                  >
                    <Video size={20} />
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {videoMeta.title}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#f87171', marginTop: '0.15rem' }}>
                    Creator: <strong>{videoMeta.author}</strong> • {videoMeta.provider}
                  </div>
                </div>
              </div>
            )}

            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>
                Your Notes / Key Insights (Optional — rough thoughts or bullets):
              </label>
              <textarea
                className="textarea"
                rows={3}
                placeholder="e.g. He proved that 80% of Python in Data Engineering is clean wrangling, API pagination, and modular functions, NOT deep OOP inheritance. Stop over-complicating it."
                value={videoNotes}
                onChange={(e) => setVideoNotes(e.target.value)}
                style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '6px', fontSize: '0.85rem', resize: 'vertical' }}
              />
            </div>
          </div>
        )}

        {/* SOURCE 2: CURRICULUM CONCEPT */}
        {sourceMode === 'CONCEPT' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>
                Select Concept:
              </label>
              <select
                className="input"
                value={selectedConceptId}
                onChange={(e) => setSelectedConceptId(e.target.value)}
                style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', fontSize: '0.85rem' }}
              >
                {(contentContext?.concepts || []).map((c: ContentContextConcept) => (
                  <option key={c.id} value={c.id}>
                    {c.hasPost ? '✓ [Published] ' : '★ [Unposted] '}
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedConcept && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-dark)',
                  border: '1px solid var(--border-color)',
                  fontSize: '0.8rem',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.3rem',
                  justifyContent: 'center',
                }}
              >
                <div>
                  Module Status: <strong style={{ color: 'var(--text-main)' }}>{selectedConcept.status}</strong>
                  {selectedConcept.hasPost && (
                    <span style={{ color: '#10b981', marginLeft: '0.5rem' }}>✓ Already on LinkedIn</span>
                  )}
                </div>
                {selectedConcept.notes && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    "{selectedConcept.notes.slice(0, 100)}..."
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* SOURCE 3: QUICK BRAIN DUMP */}
        {sourceMode === 'SCRATCHPAD' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>
                Topic / Headline:
              </label>
              <input
                type="text"
                className="input"
                placeholder="e.g. SQL DENSE_RANK() vs RANK() Gotcha in production"
                value={scratchpadTitle}
                onChange={(e) => setScratchpadTitle(e.target.value)}
                style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '6px', fontSize: '0.85rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>
                Raw Notes / Bug / Code Snippet:
              </label>
              <textarea
                className="textarea"
                rows={4}
                placeholder="Paste code snippet, error message, or quick raw thoughts here. AI will structure it with a clean hook and format."
                value={scratchpadText}
                onChange={(e) => setScratchpadText(e.target.value)}
                style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '6px', fontSize: '0.85rem', resize: 'vertical' }}
              />
            </div>
          </div>
        )}
      </section>

      {/* STEP 2: POST FLAVOR / ARCHETYPE */}
      <section
        className="card"
        style={{
          padding: '1.25rem 1.5rem',
          borderRadius: '10px',
          border: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-card)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
          <span
            style={{
              width: '22px',
              height: '22px',
              borderRadius: '50%',
              background: 'var(--accent-primary)',
              color: '#fff',
              fontSize: '0.75rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            2
          </span>
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>
            Choose Post Flavor / Angle:
          </h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.65rem', marginBottom: '1.25rem' }}>
          {[
            { id: 'KEY_TAKEAWAYS', label: '📌 3 Key Takeaways', desc: 'High save rate summary' },
            { id: 'PRACTITIONER_TEARDOWN', label: '💡 Practitioner Breakdown', desc: 'Why this matters in production' },
            { id: 'GOTCHA', label: '🐛 The Trap / Bug Fix', desc: 'What 90% miss or get wrong' },
            { id: 'PRACTICAL_APPLICATION', label: '⚡ Practical Application', desc: 'How I tested / applied this' },
            { id: 'A_VS_B', label: '⚖️ Pattern A vs B', desc: 'Comparative senior teardown' },
          ].map((flavor) => (
            <div
              key={flavor.id}
              onClick={() => setPostFlavor(flavor.id as PostFlavor)}
              style={{
                padding: '0.75rem',
                borderRadius: '8px',
                border: postFlavor === flavor.id ? '1px solid #0a66c2' : '1px solid var(--border-color)',
                background: postFlavor === flavor.id ? 'rgba(10, 102, 194, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ fontSize: '0.825rem', fontWeight: 700, color: postFlavor === flavor.id ? '#38bdf8' : 'var(--text-main)' }}>
                {flavor.label}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                {flavor.desc}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleGeneratePost}
            disabled={isGenerating}
            style={{
              padding: '0.65rem 1.35rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: 700,
              fontSize: '0.875rem',
              background: 'linear-gradient(135deg, #0a66c2, #6366f1)',
              boxShadow: '0 4px 14px rgba(10, 102, 194, 0.35)',
            }}
          >
            {isGenerating ? (
              <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <Sparkles size={16} />
            )}
            <span>{isGenerating ? 'AI Crafting Post Draft...' : 'Generate LinkedIn Post Draft'}</span>
          </button>
        </div>

        {generationError && (
          <div
            style={{
              marginTop: '1rem',
              padding: '0.75rem 1rem',
              borderRadius: '6px',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#ef4444',
              fontSize: '0.825rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <AlertCircle size={16} />
            <span>{generationError}</span>
          </div>
        )}
      </section>

      {/* STEP 3 & 4: LIVE LINKEDIN SIMULATOR & HOOK STUDIO */}
      {generatedDraft && (
        <section
          className="card"
          style={{
            padding: '1.5rem',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-card)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem',
              borderBottom: '1px solid var(--border-color)',
              paddingBottom: '0.75rem',
              flexWrap: 'wrap',
              gap: '0.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span
                style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  background: '#10b981',
                  color: '#fff',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                3
              </span>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                LinkedIn Simulator & Hook Inspector
              </h3>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span
                style={{
                  fontSize: '0.725rem',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '999px',
                  background: isHookShortEnough ? 'rgba(16, 185, 129, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                  color: isHookShortEnough ? '#10b981' : '#eab308',
                  border: isHookShortEnough ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(234, 179, 8, 0.3)',
                  fontWeight: 600,
                }}
              >
                {isHookShortEnough ? '✓ Hook Fits Before Fold' : '⚠️ Long Hook (>200 chars)'}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {generatedDraft.length} chars • ~{Math.max(1, Math.round(generatedDraft.length / 500))} min read
              </span>
            </div>
          </div>

          {/* ALTERNATE HOOK STUDIO DRAWER */}
          {hookStudioOpen && alternateHooks.length > 0 && (
            <div
              style={{
                marginBottom: '1.25rem',
                padding: '1rem',
                borderRadius: '8px',
                background: 'rgba(99, 102, 241, 0.08)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
              }}
            >
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#818cf8', marginBottom: '0.5rem' }}>
                Alternate Hook Studio (Click to swap the opening lines):
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {alternateHooks.map((h, i) => (
                  <div
                    key={i}
                    onClick={() => handleApplyHook(h)}
                    style={{
                      padding: '0.65rem 0.85rem',
                      borderRadius: '6px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid var(--border-color)',
                      fontSize: '0.825rem',
                      color: 'var(--text-main)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.5rem',
                    }}
                  >
                    <span>"{h}"</span>
                    <span style={{ fontSize: '0.7rem', color: '#6366f1', fontWeight: 700, whiteSpace: 'nowrap' }}>
                      Apply Hook ↵
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SIMULATED LINKEDIN FEED CARD */}
          <div
            style={{
              padding: '1.25rem',
              borderRadius: '8px',
              backgroundColor: '#0f172a',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              marginBottom: '1.25rem',
            }}
          >
            {/* Author Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.85rem' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #0a66c2, #0284c7)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {userName.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#f8fafc' }}>
                  {userName}
                </div>
                <div style={{ fontSize: '0.725rem', color: '#94a3b8' }}>
                  {userHeadline}
                </div>
                <div style={{ fontSize: '0.675rem', color: '#64748b' }}>
                  Just now • 🌐
                </div>
              </div>
            </div>

            {/* Editable Post Textarea with Real-time formatting */}
            <textarea
              className="textarea"
              value={generatedDraft}
              onChange={(e) => setGeneratedDraft(e.target.value)}
              rows={12}
              style={{
                width: '100%',
                fontFamily: 'inherit',
                fontSize: '0.9rem',
                lineHeight: '1.6',
                padding: '0.75rem',
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                color: '#f1f5f9',
                resize: 'vertical',
              }}
            />

            {/* Social Engagement Fake Bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-around',
                paddingTop: '0.75rem',
                marginTop: '0.75rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                color: '#94a3b8',
                fontSize: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <ThumbsUp size={14} /> Like
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <MessageSquare size={14} /> Comment
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Share2 size={14} /> Repost
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Send size={14} /> Send
              </div>
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleGenerateAlternateHooks}
                disabled={isGeneratingHooks}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}
              >
                {isGeneratingHooks ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={13} />}
                <span>{isGeneratingHooks ? 'Crafting Hooks...' : '🔄 Alternate Hook'}</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCopyDraft}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}
              >
                <Copy size={13} />
                <span>Copy Post</span>
              </button>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setGeneratedDraft('')}
                disabled={isSubmittingProposal}
                style={{ fontSize: '0.8rem' }}
              >
                Discard
              </button>

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSubmitToQueue}
                disabled={isSubmittingProposal || !generatedDraft.trim()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  fontSize: '0.825rem',
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                }}
              >
                {isSubmittingProposal ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} />}
                <span>{isSubmittingProposal ? 'Submitting...' : '🚀 Queue for Approval'}</span>
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
