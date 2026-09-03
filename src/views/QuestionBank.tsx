import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useStore } from '../store/StoreContext';
import type { QuestionBankItem, QuestionConfidence, Weakness } from '../types';
import { v4 as uuidv4 } from 'uuid';
import {
  HelpCircle,
  Plus,
  Search,
  Sparkles,
  Layers,
  CheckCircle2,
  AlertTriangle,
  UploadCloud,
  Loader2,
  Trash2,
  Copy,
  Check,
  ChevronRight,
  ChevronLeft,
  Eye,
  Flame,
  Bot,
  ChevronDown,
  ChevronUp,
  FileText,
  Edit3,
  X,
  GitMerge,
  ShieldCheck
} from 'lucide-react';
import {
  copilotService,
  sanitizeQuestionText,
  normalizeTool,
  normalizeTopic,
  getQuestionTools,
  getQuestionCompanies,
  type ConsolidationCluster
} from '../services/copilotService';
import './QuestionBank.css';

/**
 * Lightweight inline markdown renderer for bold (**text**), italics (*text*), and code (`code`).
 */
function formatInlineMarkdown(text?: string): React.ReactNode {
  if (!text) return '';
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={index} className="qb-inline-code">{part.slice(1, -1)}</code>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

const getResolvedPairKeys = (): string[] => {
  try {
    const raw = localStorage.getItem('qb_resolved_doubt_pairs');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const markPairAsResolved = (idA: string, idB: string) => {
  try {
    const current = getResolvedPairKeys();
    const pairKey = [idA, idB].sort().join('___');
    if (!current.includes(pairKey)) {
      localStorage.setItem('qb_resolved_doubt_pairs', JSON.stringify([...current, pairKey]));
    }
  } catch {}
};

export const QuestionBank: React.FC = () => {
  const { state, updateState } = useStore();
  const questions = state.questionBank || [];

  // Auto-clean & normalize existing question bank items (strips Q1/Q2, normalizes comma-separated tools and topics)
  const hasCleanedRef = useRef(false);

  useEffect(() => {
    if (!questions || questions.length === 0 || hasCleanedRef.current) return;

    let needsUpdate = false;
    const cleaned = questions.map((q) => {
      const sanitizedQ = sanitizeQuestionText(q.question);
      const toolNorm = normalizeTool(q.tool);
      const topicNorm = normalizeTopic(q.topic);
      const cleanedTags = Array.from(
        new Set([
          ...(q.tags || []),
          ...toolNorm.extraTags,
          ...topicNorm.extraTags,
        ])
      ).map((t) => t.replace(/^#/, '').trim()).filter(Boolean);

      const hasChanges =
        sanitizedQ !== q.question ||
        toolNorm.primaryTool !== q.tool ||
        topicNorm.cleanTopic !== q.topic;

      if (hasChanges) {
        needsUpdate = true;
        return {
          ...q,
          question: sanitizedQ,
          tool: toolNorm.primaryTool,
          topic: topicNorm.cleanTopic,
          tags: cleanedTags,
        };
      }
      return q;
    });

    if (needsUpdate) {
      hasCleanedRef.current = true;
      updateState({ questionBank: cleaned });
    }
  }, [questions, updateState]);

  // Ingestion Modal State
  const [showIngestModal, setShowIngestModal] = useState(false);
  const [ingestTab, setIngestTab] = useState<'image' | 'text'>('image');
  const [pastedImages, setPastedImages] = useState<Array<{ id: string; data: string; mime: string }>>([]);
  const [rawText, setRawText] = useState('');
  const [companyHint, setCompanyHint] = useState('');
  const [roleHint, setRoleHint] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState('');

  // Semantic Deduplication Clarification Modal State (Layer 2)
  const [clarificationQueue, setClarificationQueue] = useState<{
    items: Array<{
      newQuestion: any;
      matchedItem: QuestionBankItem;
      similarityScore?: number;
      reason?: string;
      finalCompany: string;
      finalRole: string;
      userDecision: 'merge' | 'separate';
    }>;
    pendingUniques: any[];
    autoMergedCount: number;
    updatedBankSnapshot: QuestionBankItem[];
  } | null>(null);

  // Bank Consolidation State (Layer 3)
  const [isAuditingBank, setIsAuditingBank] = useState(false);
  const [consolidationClusters, setConsolidationClusters] = useState<ConsolidationCluster[]>([]);
  const [selectedDupIds, setSelectedDupIds] = useState<Set<string>>(new Set());
  const [showConsolidationModal, setShowConsolidationModal] = useState(false);

  // Edit Modal State
  const [editingItem, setEditingItem] = useState<QuestionBankItem | null>(null);
  const [newTagInput, setNewTagInput] = useState('');

  // Relaxed Background Enrichment Queue State
  const [isEnrichingQueue, setIsEnrichingQueue] = useState(false);
  const [queueProgress, setQueueProgress] = useState<{ current: number; total: number } | null>(null);
  const abortQueueRef = useRef(false);

  // Autonomous AI Background Agent State
  const [autoAgentEnabled, setAutoAgentEnabled] = useState<boolean>(() => {
    return localStorage.getItem('qb_auto_agent') === 'true';
  });
  const [isAgentBusy, setIsAgentBusy] = useState(false);
  const agentRunningRef = useRef(false);
  const questionsRef = useRef<QuestionBankItem[]>(questions);

  useEffect(() => {
    questionsRef.current = questions;
  }, [questions]);

  // Single card enriching ID tracker & Expanded Cards
  const [enrichingCardId, setEnrichingCardId] = useState<string | null>(null);
  const [expandedCardIds, setExpandedCardIds] = useState<Set<string>>(new Set());

  const toggleExpandCard = (id: string) => {
    setExpandedCardIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [selectedTool, setSelectedTool] = useState<string>('all');
  const [selectedTopic, setSelectedTopic] = useState<string>('all');
  const [selectedConfidence, setSelectedConfidence] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'flashcard'>('grid');

  // Flashcard State
  const [currentFlashIndex, setCurrentFlashIndex] = useState(0);
  const [showFlashAnswer, setShowFlashAnswer] = useState(false);

  // Feedback Toasts
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Toggle Auto Agent
  const toggleAutoAgent = () => {
    const nextVal = !autoAgentEnabled;
    setAutoAgentEnabled(nextVal);
    localStorage.setItem('qb_auto_agent', String(nextVal));
    showToast(nextVal ? '🤖 Auto-Enrich AI Agent activated!' : 'Auto-Enrich AI Agent paused.');
  };

  // Continuous Autonomous AI Agent Worker
  useEffect(() => {
    if (!autoAgentEnabled || agentRunningRef.current) return;

    let isCancelled = false;

    const runAgentLoop = async () => {
      agentRunningRef.current = true;

      while (!isCancelled) {
        const pendingItem = questionsRef.current.find((q) => q.enrichmentStatus === 'pending');
        if (!pendingItem) {
          setIsAgentBusy(false);
          break;
        }

        setIsAgentBusy(true);

        try {
          const enriched = await copilotService.enrichQuestion(pendingItem.question, {
            company: pendingItem.company,
            role: pendingItem.role,
            tool: pendingItem.tool,
            topic: pendingItem.topic,
            existingAnswer: pendingItem.rawSource,
          });

          if (!isCancelled) {
            const currentList = [...questionsRef.current];
            const targetIdx = currentList.findIndex((q) => q.id === pendingItem.id);
            if (targetIdx !== -1) {
              const toolNorm = normalizeTool(enriched.suggestedTool || currentList[targetIdx].tool);
              const topicNorm = normalizeTopic(enriched.suggestedTopic || currentList[targetIdx].topic);

              currentList[targetIdx] = {
                ...currentList[targetIdx],
                question: sanitizeQuestionText(currentList[targetIdx].question),
                tool: toolNorm.primaryTool,
                topic: topicNorm.cleanTopic,
                tags: Array.from(new Set([...currentList[targetIdx].tags, ...enriched.suggestedTags])),
                difficulty: enriched.difficulty || currentList[targetIdx].difficulty,
                humanAnswer: {
                  pitch: enriched.pitch,
                  steps: enriched.steps,
                  proTip: enriched.proTip,
                  codeSnippet: enriched.codeSnippet,
                },
                enrichmentStatus: 'completed' as const,
                updatedAt: new Date().toISOString(),
              };

              questionsRef.current = currentList;
              updateState({ questionBank: currentList });
            }
          }
        } catch (err) {
          console.warn('Auto-agent enrichment error:', err);
        }

        await new Promise((resolve) => setTimeout(resolve, 1800));
      }

      setIsAgentBusy(false);
      agentRunningRef.current = false;
    };

    runAgentLoop();

    return () => {
      isCancelled = true;
      agentRunningRef.current = false;
      setIsAgentBusy(false);
    };
  }, [autoAgentEnabled, updateState]);

  // Listen for Clipboard Paste (Ctrl+V) when modal is open
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!showIngestModal) return;
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const newImg = {
                id: uuidv4(),
                data: event.target?.result as string,
                mime: blob.type || 'image/jpeg',
              };
              setPastedImages((prev) => [...prev, newImg]);
              setIngestTab('image');
            };
            reader.readAsDataURL(blob);
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [showIngestModal]);

  // Handle Image File Upload via Input (Supports Multiple Files)
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach((file) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const newImg = {
            id: uuidv4(),
            data: event.target?.result as string,
            mime: file.type || 'image/jpeg',
          };
          setPastedImages((prev) => [...prev, newImg]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removePastedImage = (id: string) => {
    setPastedImages((prev) => prev.filter((img) => img.id !== id));
  };

  // Stage 1: Fast Parse & Instant Save with Semantic Deduplication Sentinel
  const handleFastIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (ingestTab === 'image' && pastedImages.length === 0) {
      setParseError('Please upload or paste (Ctrl+V) at least one screenshot first.');
      return;
    }
    if (ingestTab === 'text' && !rawText.trim()) {
      setParseError('Please paste some text with interview questions.');
      return;
    }

    setIsParsing(true);
    setParseError('');

    try {
      const result = await copilotService.fastParseQuestions({
        text: ingestTab === 'text' ? rawText : undefined,
        images:
          ingestTab === 'image' && pastedImages.length > 0
            ? pastedImages.map((img) => ({ data: img.data, mimeType: img.mime }))
            : undefined,
        companyHint: companyHint.trim() || undefined,
        roleHint: roleHint.trim() || undefined,
      });

      if (!result.questions || result.questions.length === 0) {
        throw new Error('No distinct interview questions could be identified. Try adjusting the input text or image.');
      }

      const finalCompany = result.detectedCompany || companyHint || 'General';
      const finalRole = result.detectedRole || roleHint || 'Data / BI Professional';
      const defaultTool = result.detectedTool || 'Power BI';

      let existingBank = [...questions];

      // Run Semantic Deduplication Sentinel (Layer 1 & 2)
      const dedupeResults = await copilotService.checkSemanticDuplicates(result.questions, existingBank);

      const clarifyList: any[] = [];
      const pendingUniques: QuestionBankItem[] = [];
      let autoMergedCount = 0;

      dedupeResults.forEach((res) => {
        const extracted = res.newQuestion;
        const cleanQ = sanitizeQuestionText(extracted.question);
        const toolNorm = normalizeTool(extracted.tool || defaultTool);
        const topicNorm = normalizeTopic(extracted.topic);

        if (res.decision === 'auto_merge' && res.matchedItem) {
          // Layer 1: Auto-merge immediately
          const matchIdx = existingBank.findIndex((item) => item.id === res.matchedItem!.id);
          if (matchIdx !== -1) {
            const existingItem = existingBank[matchIdx];
            const companies = new Set(existingItem.companiesAsked || [existingItem.company]);
            companies.add(finalCompany);

            const aliases = new Set(existingItem.aliases || []);
            if (cleanQ.toLowerCase() !== existingItem.question.toLowerCase()) {
              aliases.add(cleanQ);
            }

            existingBank[matchIdx] = {
              ...existingItem,
              frequencyCount: (existingItem.frequencyCount || 1) + 1,
              companiesAsked: Array.from(companies),
              aliases: Array.from(aliases),
              tags: Array.from(new Set([...existingItem.tags, ...toolNorm.extraTags, ...topicNorm.extraTags])),
              updatedAt: new Date().toISOString(),
            };
            autoMergedCount++;
          }
        } else if (res.decision === 'clarify' && res.matchedItem) {
          // Layer 2: Queue for Human Clarification
          clarifyList.push({
            newQuestion: extracted,
            matchedItem: res.matchedItem,
            similarityScore: res.similarityScore,
            reason: res.reason,
            finalCompany,
            finalRole,
            userDecision: 'merge' as const,
          });
        } else {
          // Layer 1: Unique new question
          const newItem: QuestionBankItem = {
            id: uuidv4(),
            question: cleanQ,
            company: finalCompany,
            tool: toolNorm.primaryTool,
            role: finalRole,
            topic: topicNorm.cleanTopic,
            tags: [finalCompany, toolNorm.primaryTool, topicNorm.cleanTopic, ...toolNorm.extraTags, ...topicNorm.extraTags].filter(Boolean),
            difficulty: extracted.difficulty || 'Medium',
            rawSource: extracted.existingAnswer
              ? extracted.existingAnswer
              : ingestTab === 'text' && rawText
              ? `Original post text snippet: "${rawText.slice(0, 160).replace(/\s+/g, ' ')}..."`
              : `Extracted from ${pastedImages.length} uploaded screenshot${pastedImages.length === 1 ? '' : 's'} (${finalCompany} - ${finalRole})`,
            enrichmentStatus: 'pending',
            confidence: 'unseen',
            frequencyCount: 1,
            companiesAsked: [finalCompany],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          pendingUniques.push(newItem);
        }
      });

      if (clarifyList.length > 0) {
        // Show Clarification Dialog
        setClarificationQueue({
          items: clarifyList,
          pendingUniques,
          autoMergedCount,
          updatedBankSnapshot: existingBank,
        });
        setPastedImages([]);
        setRawText('');
        setShowIngestModal(false);
        return;
      }

      // If no clarification needed, finalize immediately
      const finalBank = [...pendingUniques, ...existingBank];
      updateState({ questionBank: finalBank });

      setPastedImages([]);
      setRawText('');
      setShowIngestModal(false);
      showToast(
        `Saved! Added ${pendingUniques.length} new question${pendingUniques.length === 1 ? '' : 's'}${
          autoMergedCount > 0 ? ` (${autoMergedCount} semantic duplicates auto-merged)` : ''
        }.`
      );
    } catch (err: any) {
      console.error('Fast ingestion failed:', err);
      setParseError(err.message || 'Failed to parse questions. Please check your AI API connection.');
    } finally {
      setIsParsing(false);
    }
  };

  // Confirm Clarification Dialog decisions
  const handleConfirmClarification = () => {
    if (!clarificationQueue) return;

    let bank = [...clarificationQueue.updatedBankSnapshot];
    const newItemsToInsert: QuestionBankItem[] = [...clarificationQueue.pendingUniques];
    let userMergedCount = 0;

    clarificationQueue.items.forEach((item) => {
      const cleanQ = sanitizeQuestionText(item.newQuestion.question);
      const toolNorm = normalizeTool(item.newQuestion.tool || 'Power BI');
      const topicNorm = normalizeTopic(item.newQuestion.topic);

      if (item.userDecision === 'merge') {
        const matchIdx = bank.findIndex((q) => q.id === item.matchedItem.id);
        if (matchIdx !== -1) {
          const ex = bank[matchIdx];
          const companies = new Set(ex.companiesAsked || [ex.company]);
          companies.add(item.finalCompany);

          const aliases = new Set(ex.aliases || []);
          if (cleanQ.toLowerCase() !== ex.question.toLowerCase()) {
            aliases.add(cleanQ);
          }

          bank[matchIdx] = {
            ...ex,
            frequencyCount: (ex.frequencyCount || 1) + 1,
            companiesAsked: Array.from(companies),
            aliases: Array.from(aliases),
            tags: Array.from(new Set([...ex.tags, ...toolNorm.extraTags, ...topicNorm.extraTags])),
            updatedAt: new Date().toISOString(),
          };
          userMergedCount++;
        }
      } else {
        // Keep as separate new question
        const newItem: QuestionBankItem = {
          id: uuidv4(),
          question: cleanQ,
          company: item.finalCompany,
          tool: toolNorm.primaryTool,
          role: item.finalRole,
          topic: topicNorm.cleanTopic,
          tags: [item.finalCompany, toolNorm.primaryTool, topicNorm.cleanTopic, ...toolNorm.extraTags, ...topicNorm.extraTags].filter(Boolean),
          difficulty: item.newQuestion.difficulty || 'Medium',
          rawSource: `Ingested question (${item.finalCompany})`,
          enrichmentStatus: 'pending',
          confidence: 'unseen',
          frequencyCount: 1,
          companiesAsked: [item.finalCompany],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        newItemsToInsert.push(newItem);
        markPairAsResolved(item.matchedItem.id, newItem.id);
      }
    });

    const finalBank = [...newItemsToInsert, ...bank];
    updateState({ questionBank: finalBank });
    setClarificationQueue(null);
    showToast(
      `Saved! ${newItemsToInsert.length} questions saved, ${userMergedCount + clarificationQueue.autoMergedCount} merged.`
    );
  };

  // Layer 3: Background Bank Duplicate Audit
  const handleAuditBankDuplicates = async (silent = false) => {
    if (questions.length < 2) return;
    setIsAuditingBank(true);
    try {
      const resolvedKeys = getResolvedPairKeys();
      const clusters = await copilotService.auditAndConsolidateBank(questions, resolvedKeys);
      setConsolidationClusters(clusters);
      setSelectedDupIds(new Set(clusters.flatMap((c) => c.duplicateIds)));
      if (!silent) {
        if (clusters.length === 0) {
          showToast('Clean bank! No duplicate questions found across your repository.');
        } else {
          setShowConsolidationModal(true);
        }
      }
    } catch (err) {
      console.error('Audit failed:', err);
      if (!silent) showToast('Could not complete duplicate audit. Please retry.');
    } finally {
      setIsAuditingBank(false);
    }
  };

  // Dismiss a cluster and mark pairs as resolved so they never reappear
  const handleDismissCluster = (cluster: ConsolidationCluster) => {
    cluster.duplicateIds.forEach((dupId) => {
      markPairAsResolved(cluster.primaryId, dupId);
    });
    setConsolidationClusters((prev) => prev.filter((c) => c.primaryId !== cluster.primaryId));
    showToast('Marked as distinct questions. Will not appear in future audits.');
  };

  // Apply Selective Bank Consolidation
  const handleApplyConsolidation = () => {
    if (consolidationClusters.length === 0 || selectedDupIds.size === 0) {
      showToast('No duplicate questions selected to merge.');
      return;
    }

    let updatedBank = [...questions];
    let mergedTotal = 0;
    const allDeletedIds: string[] = [];

    consolidationClusters.forEach((cluster) => {
      const primaryIdx = updatedBank.findIndex((q) => q.id === cluster.primaryId);
      if (primaryIdx === -1) return;

      const primary = updatedBank[primaryIdx];
      const companies = new Set(primary.companiesAsked || [primary.company]);
      const aliases = new Set(primary.aliases || []);
      const tags = new Set(primary.tags || []);
      let addedFreq = 0;

      const selectedDupsForCluster = cluster.duplicateIds.filter((id) => selectedDupIds.has(id));

      // Mark unselected duplicates in this cluster as resolved
      cluster.duplicateIds
        .filter((id) => !selectedDupIds.has(id))
        .forEach((dupId) => markPairAsResolved(cluster.primaryId, dupId));

      selectedDupsForCluster.forEach((dupId) => {
        const dupItem = updatedBank.find((q) => q.id === dupId);
        if (dupItem) {
          (dupItem.companiesAsked || [dupItem.company]).forEach((c) => companies.add(c));
          if (dupItem.question.toLowerCase() !== primary.question.toLowerCase()) {
            aliases.add(dupItem.question);
          }
          (dupItem.aliases || []).forEach((a) => aliases.add(a));
          (dupItem.tags || []).forEach((t) => tags.add(t));
          addedFreq += dupItem.frequencyCount || 1;
          mergedTotal++;
          allDeletedIds.push(dupId);
        }
      });

      if (selectedDupsForCluster.length > 0) {
        updatedBank[primaryIdx] = {
          ...primary,
          frequencyCount: (primary.frequencyCount || 1) + addedFreq,
          companiesAsked: Array.from(companies),
          aliases: Array.from(aliases),
          tags: Array.from(tags),
          updatedAt: new Date().toISOString(),
        };
      }
    });

    const deletedSet = new Set(allDeletedIds);
    updatedBank = updatedBank.filter((q) => !deletedSet.has(q.id));

    updateState({ questionBank: updatedBank });
    setConsolidationClusters([]);
    setShowConsolidationModal(false);
    showToast(`Successfully consolidated ${mergedTotal} selected duplicate question${mergedTotal === 1 ? '' : 's'}!`);
  };

  // Stage 2: Single Question Enrichment
  const handleEnrichSingle = async (e: React.MouseEvent, item: QuestionBankItem) => {
    e.stopPropagation();
    setEnrichingCardId(item.id);
    try {
      const enriched = await copilotService.enrichQuestion(item.question, {
        company: item.company,
        role: item.role,
        tool: item.tool,
        topic: item.topic,
        existingAnswer: item.rawSource,
      });

      const toolNorm = normalizeTool(enriched.suggestedTool || item.tool);
      const topicNorm = normalizeTopic(enriched.suggestedTopic || item.topic);

      const updatedList = (state.questionBank || []).map((q) => {
        if (q.id === item.id) {
          return {
            ...q,
            question: sanitizeQuestionText(q.question),
            tool: toolNorm.primaryTool,
            topic: topicNorm.cleanTopic,
            tags: Array.from(new Set([...q.tags, ...enriched.suggestedTags])),
            difficulty: enriched.difficulty || q.difficulty,
            humanAnswer: {
              pitch: enriched.pitch,
              steps: enriched.steps,
              proTip: enriched.proTip,
              codeSnippet: enriched.codeSnippet,
            },
            enrichmentStatus: 'completed' as const,
            updatedAt: new Date().toISOString(),
          };
        }
        return q;
      });

      updateState({ questionBank: updatedList });
      showToast(`Generated interview answer for "${item.question.slice(0, 30)}..."`);
    } catch (err: any) {
      console.error('Single enrichment failed:', err);
      showToast(`Enrichment failed: ${err.message || 'API error'}`);
    } finally {
      setEnrichingCardId(null);
    }
  };

  // Stage 2: Relaxed Asynchronous Queue Enrichment
  const handleEnrichAllPending = async () => {
    let currentBankSnapshot = [...(state.questionBank || [])];
    const pendingList = currentBankSnapshot.filter((q) => q.enrichmentStatus === 'pending');

    if (pendingList.length === 0) {
      showToast('All questions are already enriched!');
      return;
    }

    setIsEnrichingQueue(true);
    abortQueueRef.current = false;
    setQueueProgress({ current: 0, total: pendingList.length });

    for (let i = 0; i < pendingList.length; i++) {
      if (abortQueueRef.current) {
        showToast('Enrichment queue paused.');
        break;
      }

      const targetItem = pendingList[i];
      setQueueProgress({ current: i + 1, total: pendingList.length });

      try {
        const enriched = await copilotService.enrichQuestion(targetItem.question, {
          company: targetItem.company,
          role: targetItem.role,
          tool: targetItem.tool,
          topic: targetItem.topic,
          existingAnswer: targetItem.rawSource,
        });

        const targetIdx = currentBankSnapshot.findIndex((q) => q.id === targetItem.id);
        if (targetIdx !== -1) {
          const toolNorm = normalizeTool(enriched.suggestedTool || currentBankSnapshot[targetIdx].tool);
          const topicNorm = normalizeTopic(enriched.suggestedTopic || currentBankSnapshot[targetIdx].topic);

          currentBankSnapshot[targetIdx] = {
            ...currentBankSnapshot[targetIdx],
            question: sanitizeQuestionText(currentBankSnapshot[targetIdx].question),
            tool: toolNorm.primaryTool,
            topic: topicNorm.cleanTopic,
            tags: Array.from(new Set([...currentBankSnapshot[targetIdx].tags, ...enriched.suggestedTags])),
            difficulty: enriched.difficulty || currentBankSnapshot[targetIdx].difficulty,
            humanAnswer: {
              pitch: enriched.pitch,
              steps: enriched.steps,
              proTip: enriched.proTip,
              codeSnippet: enriched.codeSnippet,
            },
            enrichmentStatus: 'completed' as const,
            updatedAt: new Date().toISOString(),
          };

          updateState({ questionBank: [...currentBankSnapshot] });
        }

        if (i < pendingList.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
      } catch (err: any) {
        console.error(`Failed to enrich question ID ${targetItem.id}:`, err);
      }
    }

    setIsEnrichingQueue(false);
    setQueueProgress(null);
    showToast('Batch enrichment finished!');
  };

  const handleStopQueue = () => {
    abortQueueRef.current = true;
  };

  // Confidence Status Updater
  const handleSetConfidence = (e: React.MouseEvent, id: string, confidence: QuestionConfidence) => {
    e.stopPropagation();
    const updated = questions.map((q) => (q.id === id ? { ...q, confidence } : q));
    updateState({ questionBank: updated });
  };

  // Push to Weaknesses
  const handlePushToWeakness = (e: React.MouseEvent, item: QuestionBankItem) => {
    e.stopPropagation();
    const newWeakness: Weakness = {
      id: uuidv4(),
      topic: item.topic || 'Interview Question',
      interviewCompany: item.company || 'General',
      dateIdentified: new Date().toISOString().split('T')[0],
      description: `Question: ${item.question}\n\nPitch: ${item.humanAnswer?.pitch || 'N/A'}`,
      resolutionPlan: `Master steps:\n${(item.humanAnswer?.steps || []).join('\n')}\n\nPro Tip: ${
        item.humanAnswer?.proTip || ''
      }`,
      status: 'Open',
    };

    updateState({ weaknesses: [newWeakness, ...(state.weaknesses || [])] });
    showToast(`Added to Weakness Tracker: "${item.topic}"`);
  };

  // Delete Question
  const handleDeleteQuestion = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = questions.filter((q) => q.id !== id);
    updateState({ questionBank: updated });
    showToast('Question deleted.');
  };

  // Copy Pitch
  const handleCopyPitch = (e: React.MouseEvent, id: string, text: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Edit Item Handlers
  const handleOpenEditModal = (e: React.MouseEvent, item: QuestionBankItem) => {
    e.stopPropagation();
    setEditingItem({ ...item, tags: [...item.tags] });
    setNewTagInput('');
  };

  const handleAddTagToEdit = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    if (!newTagInput.trim() || !editingItem) return;

    const cleanTag = newTagInput.trim().replace(/^#/, '');
    if (!editingItem.tags.includes(cleanTag)) {
      setEditingItem({
        ...editingItem,
        tags: [...editingItem.tags, cleanTag],
      });
    }
    setNewTagInput('');
  };

  const handleRemoveTagFromEdit = (tagToRemove: string) => {
    if (!editingItem) return;
    setEditingItem({
      ...editingItem,
      tags: editingItem.tags.filter((t) => t !== tagToRemove),
    });
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const toolNorm = normalizeTool(editingItem.tool);
    const topicNorm = normalizeTopic(editingItem.topic);
    const cleanTags = Array.from(
      new Set([
        ...editingItem.tags,
        ...toolNorm.extraTags,
        ...topicNorm.extraTags,
      ])
    ).map((t) => t.replace(/^#/, '').trim()).filter(Boolean);

    const updated = questions.map((q) =>
      q.id === editingItem.id
        ? {
            ...editingItem,
            question: sanitizeQuestionText(editingItem.question),
            tool: toolNorm.primaryTool,
            topic: topicNorm.cleanTopic,
            tags: cleanTags,
            updatedAt: new Date().toISOString(),
          }
        : q
    );

    updateState({ questionBank: updated });
    setEditingItem(null);
    showToast('Question details updated successfully!');
  };

  // Grouping Counts for Dropdowns (Supporting overlapping tools and companies)
  const companyCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    questions.forEach((q) => {
      const companies = getQuestionCompanies(q);
      companies.forEach((c) => {
        counts[c] = (counts[c] || 0) + 1;
      });
    });
    return counts;
  }, [questions]);

  const toolCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    questions.forEach((q) => {
      const tools = getQuestionTools(q);
      tools.forEach((t) => {
        counts[t] = (counts[t] || 0) + 1;
      });
    });
    return counts;
  }, [questions]);

  const topicCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    questions.forEach((q) => {
      const topicName = normalizeTopic(q.topic).cleanTopic;
      counts[topicName] = (counts[topicName] || 0) + 1;
    });
    return counts;
  }, [questions]);

  const uniqueCompanies = Object.keys(companyCounts);
  const uniqueTools = Object.keys(toolCounts);
  const uniqueTopics = Object.keys(topicCounts);
  const pendingCount = questions.filter((q) => q.enrichmentStatus === 'pending').length;

  // Filtered List with multi-tool & multi-company matching
  const filteredQuestions = questions.filter((item) => {
    const itemTools = getQuestionTools(item);
    const itemCompanies = getQuestionCompanies(item);
    const itemTopic = normalizeTopic(item.topic).cleanTopic;

    const matchesSearch =
      item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      itemTopic.toLowerCase().includes(searchTerm.toLowerCase()) ||
      itemCompanies.some((c) => c.toLowerCase().includes(searchTerm.toLowerCase())) ||
      itemTools.some((t) => t.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.humanAnswer?.pitch && item.humanAnswer.pitch.toLowerCase().includes(searchTerm.toLowerCase())) ||
      item.tags.some((t) => t.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCompany = selectedCompany === 'all' || itemCompanies.includes(selectedCompany);
    const matchesTool = selectedTool === 'all' || itemTools.includes(selectedTool);
    const matchesTopic = selectedTopic === 'all' || itemTopic === selectedTopic;
    const matchesConfidence = selectedConfidence === 'all' || item.confidence === selectedConfidence;
    const matchesStatus = selectedStatus === 'all' || item.enrichmentStatus === selectedStatus;

    return matchesSearch && matchesCompany && matchesTool && matchesTopic && matchesConfidence && matchesStatus;
  });

  const activeFlashItem = filteredQuestions[currentFlashIndex] || filteredQuestions[0];

  return (
    <div className="qb-container">
      {/* Toast Banner */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '1.5rem',
            right: '1.5rem',
            background: 'var(--bg-card)',
            color: 'var(--text-main)',
            border: '1px solid var(--accent-primary)',
            padding: '0.75rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontWeight: 500,
            fontSize: '0.9rem',
          }}
        >
          <CheckCircle2 size={18} color="var(--accent-primary)" />
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <header className="qb-header">
        <div className="qb-title-group">
          <h1>
            <Layers size={26} color="var(--accent-primary)" />
            Interview Question Bank
          </h1>
          <p className="text-muted">
            Fast capture from screenshots/posts with relaxed AI-generated practitioner answers.
          </p>
        </div>

        <div className="qb-header-actions">
          {/* Autonomous AI Agent Button */}
          <button
            className={`qb-agent-toggle-btn ${autoAgentEnabled ? 'active' : ''}`}
            onClick={toggleAutoAgent}
            title="When active, an autonomous background AI agent enriches pending questions silently without clicking."
          >
            <Bot size={15} />
            {autoAgentEnabled ? (
              <>
                <span className="qb-pulse-dot" /> Auto-Agent: Active {isAgentBusy ? '(Enriching...)' : ''}
              </>
            ) : (
              'Auto-Agent: Off'
            )}
          </button>

          {/* Audit / Consolidate Duplicates Button */}
          <button
            className="btn btn-secondary"
            onClick={() => handleAuditBankDuplicates(false)}
            disabled={isAuditingBank || questions.length < 2}
            title="Scan your entire bank to find and merge semantic duplicate questions"
          >
            {isAuditingBank ? <Loader2 size={15} className="animate-spin" /> : <GitMerge size={15} />}
            Audit Duplicates
          </button>

          <button
            className="btn btn-primary"
            onClick={() => {
              setShowIngestModal(true);
              setParseError('');
            }}
          >
            <Plus size={18} /> Quick Ingest (Ctrl+V)
          </button>
        </div>
      </header>

      {/* Pending Queue Banner */}
      {pendingCount > 0 && (
        <div className="qb-queue-banner">
          <div className="qb-queue-info">
            <div className="qb-queue-icon">
              <Sparkles size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                {pendingCount} question{pendingCount === 1 ? '' : 's'} waiting for AI enrichment
              </div>
              <div className="text-sm text-muted">
                {isEnrichingQueue && queueProgress
                  ? `Processing ${queueProgress.current} of ${queueProgress.total} questions with polite delays...`
                  : autoAgentEnabled
                  ? '🤖 Autonomous background agent is actively enriching these questions sequentially...'
                  : 'Fast-captured questions ready to receive practitioner answers, DAX recipes, and pro-tips.'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {isEnrichingQueue ? (
              <button className="btn btn-secondary" onClick={handleStopQueue} style={{ color: 'var(--danger)' }}>
                <X size={16} /> Pause Queue
              </button>
            ) : (
              <button className="btn btn-primary" onClick={handleEnrichAllPending}>
                <Sparkles size={16} /> Enrich All ({pendingCount})
              </button>
            )}
          </div>
        </div>
      )}

      {/* Consolidation Audit Banner */}
      {consolidationClusters.length > 0 && (
        <div className="qb-audit-banner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <GitMerge size={20} color="var(--accent-primary)" />
            <div>
              <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                🧹 Duplicate Audit: {consolidationClusters.length} duplicate cluster{consolidationClusters.length === 1 ? '' : 's'} detected in your bank!
              </div>
              <div className="text-xs text-muted">
                Merge overlapping questions to combine company frequencies and keep your bank clean.
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              className="btn btn-secondary"
              onClick={() => setConsolidationClusters([])}
              style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
            >
              Dismiss
            </button>
            <button
              className="btn btn-primary"
              onClick={() => setShowConsolidationModal(true)}
              style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
            >
              <Sparkles size={14} /> Review & Consolidate ({consolidationClusters.length})
            </button>
          </div>
        </div>
      )}

      {/* Toolbar: Search, Filters & View Toggle */}
      <div className="qb-toolbar">
        <div className="qb-search-box">
          <Search size={16} />
          <input
            type="text"
            className="input"
            placeholder="Search questions, DAX, topics, pitch..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Company Filter */}
        <select
          className="qb-filter-select"
          value={selectedCompany}
          onChange={(e) => setSelectedCompany(e.target.value)}
        >
          <option value="all">🏢 All Companies ({questions.length} Qs)</option>
          {uniqueCompanies.map((c) => (
            <option key={c} value={c}>
              🏢 {c} ({companyCounts[c] || 0} Qs)
            </option>
          ))}
        </select>

        {/* Tool Filter */}
        <select
          className="qb-filter-select"
          value={selectedTool}
          onChange={(e) => setSelectedTool(e.target.value)}
        >
          <option value="all">🛠️ All Tools ({questions.length} Qs)</option>
          {uniqueTools.map((t) => (
            <option key={t} value={t}>
              🛠️ {t} ({toolCounts[t] || 0} Qs)
            </option>
          ))}
        </select>

        {/* Topic Filter */}
        <select
          className="qb-filter-select"
          value={selectedTopic}
          onChange={(e) => setSelectedTopic(e.target.value)}
        >
          <option value="all">🏷️ All Topics ({questions.length} Qs)</option>
          {uniqueTopics.map((t) => (
            <option key={t} value={t}>
              🏷️ {t} ({topicCounts[t] || 0} Qs)
            </option>
          ))}
        </select>

        {/* Confidence Filter */}
        <select
          className="qb-filter-select"
          value={selectedConfidence}
          onChange={(e) => setSelectedConfidence(e.target.value)}
        >
          <option value="all">🎯 All Confidence</option>
          <option value="unseen">⚪ Unseen</option>
          <option value="struggled">🔴 Struggled</option>
          <option value="hesitant">🟡 Hesitant</option>
          <option value="mastered">🟢 Mastered</option>
        </select>

        {/* Status Filter */}
        <select
          className="qb-filter-select"
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
        >
          <option value="all">⚡ All Statuses</option>
          <option value="pending">⏳ Ingested / Pending</option>
          <option value="completed">🟢 Ready / Enriched</option>
        </select>

        {/* View Mode Toggle */}
        <div className="qb-view-toggle">
          <button
            className={`qb-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
            title="List View"
          >
            <Layers size={15} /> List
          </button>
          <button
            className={`qb-view-btn ${viewMode === 'flashcard' ? 'active' : ''}`}
            onClick={() => {
              setViewMode('flashcard');
              setCurrentFlashIndex(0);
              setShowFlashAnswer(false);
            }}
            title="Practice / Flashcard Mode"
          >
            <Eye size={15} /> Practice
          </button>
        </div>
      </div>

      {/* FLASHCARD MODE */}
      {viewMode === 'flashcard' && filteredQuestions.length > 0 && (
        <div className="qb-flashcard-container">
          <div className="qb-flashcard">
            <div className="qb-flashcard-header">
              <div className="qb-tags-row">
                <span className="qb-pill-tag qb-pill-company">🏢 {activeFlashItem.company}</span>
                {activeFlashItem.tool && (
                  <span className="qb-pill-tag qb-pill-tool">🛠️ {activeFlashItem.tool}</span>
                )}
                <span className="qb-pill-tag qb-pill-topic">🏷️ {activeFlashItem.topic}</span>
                {activeFlashItem.frequencyCount > 1 && (
                  <span className="qb-pill-tag qb-pill-freq">
                    <Flame size={12} /> {activeFlashItem.frequencyCount}x Asked
                  </span>
                )}
              </div>
              <div className="text-sm text-muted">
                {currentFlashIndex + 1} of {filteredQuestions.length}
              </div>
            </div>

            <div className="qb-flashcard-question">Q. {activeFlashItem.question}</div>

            {showFlashAnswer ? (
              <div className="qb-list-expanded-content">
                {activeFlashItem.humanAnswer ? (
                  <>
                    <div className="qb-pitch-preview-box">
                      <strong style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--accent-primary)', marginBottom: '0.25rem', fontSize: '0.8rem' }}>
                        <Sparkles size={14} /> 30s VERBAL PITCH:
                      </strong>
                      "{activeFlashItem.humanAnswer.pitch}"
                    </div>

                    {activeFlashItem.humanAnswer.steps?.length > 0 && (
                      <div>
                        <div style={{ fontWeight: 600, marginBottom: '0.25rem', fontSize: '0.85rem' }}>Practical Execution Recipe:</div>
                        <ol className="qb-steps-list">
                          {activeFlashItem.humanAnswer.steps.map((s, idx) => (
                            <li key={idx}>{s}</li>
                          ))}
                        </ol>
                      </div>
                    )}

                    {activeFlashItem.humanAnswer.proTip && (
                      <div className="qb-protip-box">
                        <strong>💡 Senior Gotcha:</strong> {activeFlashItem.humanAnswer.proTip}
                      </div>
                    )}

                    {activeFlashItem.humanAnswer.codeSnippet && (
                      <pre className="qb-code-block">
                        <code>{activeFlashItem.humanAnswer.codeSnippet}</code>
                      </pre>
                    )}

                    {activeFlashItem.rawSource && (
                      <div
                        style={{
                          marginTop: '0.4rem',
                          padding: '0.45rem 0.65rem',
                          background: 'rgba(100, 116, 139, 0.08)',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-color)',
                          fontSize: '0.75rem',
                          color: 'var(--text-muted)',
                        }}
                      >
                        <strong
                          style={{
                            color: 'var(--text-main)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            marginBottom: '0.2rem',
                          }}
                        >
                          <FileText size={12} /> Original Source / Raw Context:
                        </strong>
                        {activeFlashItem.rawSource}
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '1rem' }}>
                    <p className="text-muted" style={{ marginBottom: '0.75rem' }}>
                      Answer not yet enriched.
                    </p>
                    <button
                      className="btn btn-primary"
                      onClick={(e) => handleEnrichSingle(e, activeFlashItem)}
                      disabled={enrichingCardId === activeFlashItem.id}
                    >
                      {enrichingCardId === activeFlashItem.id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Sparkles size={16} />
                      )}{' '}
                      Enrich Now
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                className="qb-flashcard-reveal-btn"
                onClick={() => setShowFlashAnswer(true)}
              >
                <Eye size={18} /> Reveal Model Answer
              </button>
            )}

            {/* Confidence Selector in Flashcard */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '0.5rem',
                alignItems: 'center',
                paddingTop: '0.75rem',
                borderTop: '1px solid var(--border-color)',
              }}
            >
              <span className="text-xs text-muted">Self-Evaluation:</span>
              <button
                className={`qb-conf-btn ${activeFlashItem.confidence === 'struggled' ? 'active-struggled' : ''}`}
                onClick={(e) => handleSetConfidence(e, activeFlashItem.id, 'struggled')}
              >
                🔴 Struggled
              </button>
              <button
                className={`qb-conf-btn ${activeFlashItem.confidence === 'hesitant' ? 'active-hesitant' : ''}`}
                onClick={(e) => handleSetConfidence(e, activeFlashItem.id, 'hesitant')}
              >
                🟡 Hesitant
              </button>
              <button
                className={`qb-conf-btn ${activeFlashItem.confidence === 'mastered' ? 'active-mastered' : ''}`}
                onClick={(e) => handleSetConfidence(e, activeFlashItem.id, 'mastered')}
              >
                🟢 Mastered
              </button>
            </div>

            {/* Navigation Footer */}
            <div className="qb-flashcard-nav">
              <button
                className="btn btn-secondary"
                disabled={currentFlashIndex === 0}
                onClick={() => {
                  setCurrentFlashIndex((prev) => Math.max(0, prev - 1));
                  setShowFlashAnswer(false);
                }}
              >
                <ChevronLeft size={18} /> Previous
              </button>
              <button
                className="btn btn-primary"
                disabled={currentFlashIndex === filteredQuestions.length - 1}
                onClick={() => {
                  setCurrentFlashIndex((prev) => Math.min(filteredQuestions.length - 1, prev + 1));
                  setShowFlashAnswer(false);
                }}
              >
                Next <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN VIEW: LIST STACK (Mockup Style) */}
      {viewMode === 'grid' && (
        <>
          {filteredQuestions.length === 0 ? (
            <div
              className="card"
              style={{
                textAlign: 'center',
                padding: '3rem 1.5rem',
                color: 'var(--text-muted)',
              }}
            >
              <HelpCircle size={40} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
              <h3>No interview questions found</h3>
              <p style={{ marginTop: '0.5rem', marginBottom: '1.25rem' }}>
                Paste a screenshot from LinkedIn, Glassdoor, or a text dump to get started.
              </p>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setShowIngestModal(true);
                  setParseError('');
                }}
              >
                <Plus size={18} /> Ingest Your First Questions
              </button>
            </div>
          ) : (
            <div className="qb-list-stack">
              {filteredQuestions.map((item) => {
                const isExpanded = expandedCardIds.has(item.id);
                const isReady = item.enrichmentStatus === 'completed';

                return (
                  <div
                    key={item.id}
                    className={`qb-list-card ${isReady ? 'status-ready' : 'status-pending'}`}
                    onClick={() => toggleExpandCard(item.id)}
                  >
                    {/* Top Row: Q. Question & Actions */}
                    <div className="qb-card-header-row">
                      <div className="qb-card-title">
                        <span className="qb-q-prefix">Q.</span> {item.question}
                      </div>

                      <div className="qb-card-actions-row">
                        {/* Traffic Light Confidence */}
                        <div className="qb-confidence-group">
                          <button
                            className={`qb-conf-btn ${item.confidence === 'struggled' ? 'active-struggled' : ''}`}
                            onClick={(e) => handleSetConfidence(e, item.id, 'struggled')}
                            title="Mark as Struggled"
                          >
                            🔴
                          </button>
                          <button
                            className={`qb-conf-btn ${item.confidence === 'hesitant' ? 'active-hesitant' : ''}`}
                            onClick={(e) => handleSetConfidence(e, item.id, 'hesitant')}
                            title="Mark as Hesitant"
                          >
                            🟡
                          </button>
                          <button
                            className={`qb-conf-btn ${item.confidence === 'mastered' ? 'active-mastered' : ''}`}
                            onClick={(e) => handleSetConfidence(e, item.id, 'mastered')}
                            title="Mark as Mastered"
                          >
                            🟢
                          </button>
                        </div>

                        {/* Copy Pitch Button */}
                        {item.humanAnswer?.pitch && (
                          <button
                            className="btn-icon"
                            style={{
                              border: '1px solid var(--border-color)',
                              background: 'var(--bg-card)',
                              borderRadius: 'var(--radius-sm)',
                              padding: '5px',
                              cursor: 'pointer',
                              color: 'var(--text-main)',
                            }}
                            onClick={(e) => handleCopyPitch(e, item.id, item.humanAnswer!.pitch)}
                            title="Copy 30s Pitch to clipboard"
                          >
                            {copiedId === item.id ? (
                              <Check size={14} color="var(--accent-primary)" />
                            ) : (
                              <Copy size={14} />
                            )}
                          </button>
                        )}

                        {/* Edit Button */}
                        <button
                          className="btn-icon"
                          style={{
                            border: '1px solid var(--border-color)',
                            background: 'var(--bg-card)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '5px',
                            cursor: 'pointer',
                            color: 'var(--text-main)',
                          }}
                          onClick={(e) => handleOpenEditModal(e, item)}
                          title="Edit Question, Tags & Answers"
                        >
                          <Edit3 size={14} />
                        </button>

                        {/* Push to Weakness Button */}
                        <button
                          className="btn-icon"
                          style={{
                            border: '1px solid var(--border-color)',
                            background: 'var(--bg-card)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '5px',
                            cursor: 'pointer',
                            color: 'var(--warning)',
                          }}
                          onClick={(e) => handlePushToWeakness(e, item)}
                          title="Add to Weakness Tracker"
                        >
                          <AlertTriangle size={14} />
                        </button>

                        {/* Delete Button */}
                        <button
                          className="btn-icon"
                          style={{
                            border: '1px solid var(--border-color)',
                            background: 'var(--bg-card)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '5px',
                            cursor: 'pointer',
                            color: 'var(--danger)',
                          }}
                          onClick={(e) => handleDeleteQuestion(e, item.id)}
                          title="Delete question"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Middle: 30s Pitch Preview Box */}
                    {item.humanAnswer ? (
                      <div className="qb-pitch-preview-box">
                        {formatInlineMarkdown(item.humanAnswer.pitch)}
                      </div>
                    ) : (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: 'rgba(245, 158, 11, 0.12)',
                          padding: '0.4rem 0.75rem',
                          borderRadius: 'var(--radius-sm)',
                        }}
                      >
                        <span className="text-xs text-muted">
                          ⏳ Raw question captured. Ready for AI enrichment.
                        </span>
                        <button
                          className="btn btn-secondary text-xs"
                          style={{ padding: '0.25rem 0.6rem' }}
                          onClick={(e) => handleEnrichSingle(e, item)}
                          disabled={enrichingCardId === item.id || isAgentBusy}
                        >
                          {enrichingCardId === item.id ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Sparkles size={13} />
                          )}
                          Generate Answer
                        </button>
                      </div>
                    )}

                    {/* Expandable Deep Dive: Steps, Pro-Tip, Code & Raw Source */}
                    {isExpanded && item.humanAnswer && (
                      <div className="qb-list-expanded-content">
                        {item.humanAnswer.steps?.length > 0 && (
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-main)', marginBottom: '0.3rem' }}>
                              Execution Recipe:
                            </div>
                            <ol className="qb-steps-list">
                              {item.humanAnswer.steps.map((step, idx) => (
                                <li key={idx}>{formatInlineMarkdown(step)}</li>
                              ))}
                            </ol>
                          </div>
                        )}

                        {item.humanAnswer.proTip && (
                          <div className="qb-protip-box">
                            <strong>💡 Senior Gotcha:</strong> {formatInlineMarkdown(item.humanAnswer.proTip)}
                          </div>
                        )}

                        {item.humanAnswer.codeSnippet && (
                          <pre className="qb-code-block">
                            <code>{item.humanAnswer.codeSnippet}</code>
                          </pre>
                        )}

                        {/* Alternative Phrasings (Merged Semantic Duplicates) */}
                        {item.aliases && item.aliases.length > 0 && (
                          <div
                            style={{
                              marginTop: '0.35rem',
                              padding: '0.45rem 0.65rem',
                              background: 'rgba(99, 102, 241, 0.06)',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid rgba(99, 102, 241, 0.2)',
                              fontSize: '0.78rem',
                            }}
                          >
                            <strong style={{ color: 'var(--text-main)', display: 'block', marginBottom: '0.25rem' }}>
                              🔄 Also asked as (Merged variations):
                            </strong>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                              {item.aliases.map((aliasStr, aIdx) => (
                                <span key={aIdx} className="qb-alias-badge">
                                  "{aliasStr}"
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {item.rawSource && (
                          <div
                            style={{
                              marginTop: '0.2rem',
                              padding: '0.45rem 0.65rem',
                              background: 'rgba(100, 116, 139, 0.08)',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid var(--border-color)',
                              fontSize: '0.75rem',
                              color: 'var(--text-muted)',
                            }}
                          >
                            <strong
                              style={{
                                color: 'var(--text-main)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                marginBottom: '0.2rem',
                              }}
                            >
                              <FileText size={12} /> Original Source / Raw Context:
                            </strong>
                            {item.rawSource}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Bottom Row: Tags (Company, Tool, Topic, Subtags) */}
                    <div className="qb-tags-row">
                      {/* Company Badges (Supports multiple companies e.g. from merges) */}
                      {getQuestionCompanies(item).map((compName, cIdx) => {
                        const isCompActive = selectedCompany === compName;
                        return (
                          <span
                            key={cIdx}
                            className="qb-pill-tag qb-pill-company"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCompany((prev) => (prev === compName ? 'all' : compName));
                            }}
                            title={isCompActive ? `Clear filter: ${compName}` : `Filter by company "${compName}"`}
                            style={{
                              boxShadow: isCompActive ? '0 0 0 2px var(--bg-main), 0 0 0 4px #10b981' : undefined,
                              transform: isCompActive ? 'scale(1.05)' : undefined,
                            }}
                          >
                            🏢 {compName}
                          </span>
                        );
                      })}

                      {/* Tool Badge */}
                      {(() => {
                        const primaryTool = normalizeTool(item.tool).primaryTool;
                        const isToolActive = selectedTool === primaryTool;
                        return (
                          <span
                            className="qb-pill-tag qb-pill-tool"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTool((prev) => (prev === primaryTool ? 'all' : primaryTool));
                            }}
                            title={isToolActive ? `Clear filter: ${primaryTool}` : `Filter by tool "${primaryTool}"`}
                            style={{
                              boxShadow: isToolActive ? '0 0 0 2px var(--bg-main), 0 0 0 4px #0284c7' : undefined,
                              transform: isToolActive ? 'scale(1.05)' : undefined,
                            }}
                          >
                            🛠️ {primaryTool}
                          </span>
                        );
                      })()}

                      {/* Topic Badge */}
                      {(() => {
                        const cleanTopic = normalizeTopic(item.topic).cleanTopic;
                        const isTopicActive = selectedTopic === cleanTopic;
                        return (
                          <span
                            className="qb-pill-tag qb-pill-topic"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTopic((prev) => (prev === cleanTopic ? 'all' : cleanTopic));
                            }}
                            title={isTopicActive ? `Clear filter: ${cleanTopic}` : `Filter by topic "${cleanTopic}"`}
                            style={{
                              boxShadow: isTopicActive ? '0 0 0 2px var(--bg-main), 0 0 0 4px #059669' : undefined,
                              transform: isTopicActive ? 'scale(1.05)' : undefined,
                            }}
                          >
                            🏷️ {cleanTopic}
                          </span>
                        );
                      })()}

                      {/* Additional Sub-tags */}
                      {item.tags
                        ?.filter((t) => {
                          const lowerT = t.toLowerCase();
                          const compNames = getQuestionCompanies(item).map((c) => c.toLowerCase());
                          return (
                            !compNames.includes(lowerT) &&
                            lowerT !== normalizeTool(item.tool).primaryTool.toLowerCase() &&
                            lowerT !== normalizeTopic(item.topic).cleanTopic.toLowerCase()
                          );
                        })
                        .map((tagStr, idx) => {
                          const isTagActive = searchTerm.toLowerCase() === tagStr.toLowerCase();
                          return (
                            <span
                              key={idx}
                              className="qb-pill-tag qb-pill-subtag"
                              onClick={(e) => {
                                e.stopPropagation();
                                const toolMatch = uniqueTools.find((t) => t.toLowerCase() === tagStr.toLowerCase());
                                if (toolMatch) {
                                  setSelectedTool((prev) => (prev === toolMatch ? 'all' : toolMatch));
                                  return;
                                }
                                const compMatch = uniqueCompanies.find((c) => c.toLowerCase() === tagStr.toLowerCase());
                                if (compMatch) {
                                  setSelectedCompany((prev) => (prev === compMatch ? 'all' : compMatch));
                                  return;
                                }
                                setSearchTerm((prev) => (prev.toLowerCase() === tagStr.toLowerCase() ? '' : tagStr));
                              }}
                              title={isTagActive ? `Clear filter: #${tagStr}` : `Filter by #${tagStr}`}
                              style={{
                                boxShadow: isTagActive ? '0 0 0 2px var(--bg-main), 0 0 0 4px var(--accent-primary)' : undefined,
                                transform: isTagActive ? 'scale(1.05)' : undefined,
                                fontWeight: isTagActive ? 700 : 500,
                              }}
                            >
                              #{tagStr}
                            </span>
                          );
                        })}

                      {/* Frequency Counter */}
                      {item.frequencyCount > 1 && (
                        <span
                          className="qb-pill-tag qb-pill-freq"
                          title={`Reported at: ${item.companiesAsked?.join(', ')}`}
                        >
                          <Flame size={12} /> {item.frequencyCount}x Asked
                        </span>
                      )}

                      {/* Expand/Collapse Hint Button on the right */}
                      {item.humanAnswer && (
                        <span
                          className="text-xs text-muted"
                          style={{
                            marginLeft: 'auto',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            fontWeight: 500,
                          }}
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp size={14} /> Collapse
                            </>
                          ) : (
                            <>
                              <ChevronDown size={14} /> View Steps & Code
                            </>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* FULL EDIT MODAL */}
      {editingItem && (
        <div className="qb-modal-overlay" onClick={() => setEditingItem(null)}>
          <div className="qb-modal" onClick={(e) => e.stopPropagation()}>
            <div className="qb-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Edit3 size={20} color="var(--accent-primary)" />
                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Edit Question & Tags</h3>
              </div>
              <button
                className="btn-icon"
                style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
                onClick={() => setEditingItem(null)}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="qb-modal-body">
              {/* Question Statement */}
              <div>
                <label className="text-xs text-muted" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>
                  Question Statement:
                </label>
                <textarea
                  required
                  rows={3}
                  className="input"
                  value={editingItem.question}
                  onChange={(e) => setEditingItem({ ...editingItem, question: e.target.value })}
                />
              </div>

              {/* Company, Tool, Topic in 3 Columns */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-muted" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>
                    🏢 Company:
                  </label>
                  <input
                    type="text"
                    required
                    className="input text-sm"
                    value={editingItem.company}
                    onChange={(e) => setEditingItem({ ...editingItem, company: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-xs text-muted" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>
                    🛠️ Tool:
                  </label>
                  <input
                    type="text"
                    required
                    className="input text-sm"
                    value={editingItem.tool || 'Power BI'}
                    onChange={(e) => setEditingItem({ ...editingItem, tool: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-xs text-muted" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>
                    🏷️ Topic:
                  </label>
                  <input
                    type="text"
                    required
                    className="input text-sm"
                    value={editingItem.topic}
                    onChange={(e) => setEditingItem({ ...editingItem, topic: e.target.value })}
                  />
                </div>
              </div>

              {/* Interactive Tag Editor */}
              <div>
                <label className="text-xs text-muted" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>
                  Tags & Categories:
                </label>
                <div className="qb-edit-tag-container">
                  {editingItem.tags.map((tagStr, idx) => (
                    <span key={idx} className="qb-edit-tag-chip">
                      #{tagStr}
                      <button
                        type="button"
                        className="qb-edit-tag-remove"
                        onClick={() => handleRemoveTagFromEdit(tagStr)}
                        title="Remove tag"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flex: 1, minWidth: '120px' }}>
                    <input
                      type="text"
                      className="input text-xs"
                      style={{ padding: '0.2rem 0.5rem', height: '28px' }}
                      placeholder="+ Add tag (Press Enter)..."
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      onKeyDown={handleAddTagToEdit}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary text-xs"
                      style={{ padding: '0.2rem 0.5rem', height: '28px' }}
                      onClick={handleAddTagToEdit}
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>

              {/* 30s Verbal Pitch */}
              <div>
                <label className="text-xs text-muted" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>
                  ⚡ 30s Verbal Pitch:
                </label>
                <textarea
                  rows={3}
                  className="input text-sm"
                  value={editingItem.humanAnswer?.pitch || ''}
                  onChange={(e) =>
                    setEditingItem({
                      ...editingItem,
                      humanAnswer: {
                        pitch: e.target.value,
                        steps: editingItem.humanAnswer?.steps || [],
                        proTip: editingItem.humanAnswer?.proTip || '',
                        codeSnippet: editingItem.humanAnswer?.codeSnippet,
                      },
                    })
                  }
                />
              </div>

              {/* Execution Recipe Steps */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label className="text-xs text-muted" style={{ fontWeight: 600 }}>
                    📋 Execution Recipe (Steps):
                  </label>
                  <button
                    type="button"
                    className="btn btn-secondary text-xs"
                    style={{ padding: '0.2rem 0.5rem' }}
                    onClick={() => {
                      const currentSteps = editingItem.humanAnswer?.steps || [];
                      setEditingItem({
                        ...editingItem,
                        humanAnswer: {
                          pitch: editingItem.humanAnswer?.pitch || '',
                          steps: [...currentSteps, ''],
                          proTip: editingItem.humanAnswer?.proTip || '',
                          codeSnippet: editingItem.humanAnswer?.codeSnippet,
                        },
                      });
                    }}
                  >
                    + Add Step
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  {(editingItem.humanAnswer?.steps || []).map((stepText, sIdx) => (
                    <div key={sIdx} className="qb-step-edit-row">
                      <span className="qb-step-badge">Step {sIdx + 1}</span>
                      <textarea
                        rows={2}
                        className="input text-sm"
                        style={{ flex: 1 }}
                        value={stepText}
                        onChange={(e) => {
                          const updatedSteps = [...(editingItem.humanAnswer?.steps || [])];
                          updatedSteps[sIdx] = e.target.value;
                          setEditingItem({
                            ...editingItem,
                            humanAnswer: {
                              pitch: editingItem.humanAnswer?.pitch || '',
                              steps: updatedSteps,
                              proTip: editingItem.humanAnswer?.proTip || '',
                              codeSnippet: editingItem.humanAnswer?.codeSnippet,
                            },
                          });
                        }}
                      />
                      <button
                        type="button"
                        className="btn-icon"
                        style={{
                          border: '1px solid var(--border-color)',
                          background: 'var(--bg-card)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '6px',
                          cursor: 'pointer',
                          color: 'var(--danger)',
                          marginTop: '0.25rem',
                        }}
                        onClick={() => {
                          const updatedSteps = (editingItem.humanAnswer?.steps || []).filter((_, idx) => idx !== sIdx);
                          setEditingItem({
                            ...editingItem,
                            humanAnswer: {
                              pitch: editingItem.humanAnswer?.pitch || '',
                              steps: updatedSteps,
                              proTip: editingItem.humanAnswer?.proTip || '',
                              codeSnippet: editingItem.humanAnswer?.codeSnippet,
                            },
                          });
                        }}
                        title="Remove Step"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                  {(!editingItem.humanAnswer?.steps || editingItem.humanAnswer.steps.length === 0) && (
                    <div className="text-xs text-muted" style={{ fontStyle: 'italic', padding: '0.35rem 0' }}>
                      No execution recipe steps added yet. Click "+ Add Step" to add one.
                    </div>
                  )}
                </div>
              </div>

              {/* Senior Pro-Tip */}
              <div>
                <label className="text-xs text-muted" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>
                  💡 Senior Gotcha / Pro-Tip:
                </label>
                <textarea
                  rows={2}
                  className="input text-sm"
                  value={editingItem.humanAnswer?.proTip || ''}
                  onChange={(e) =>
                    setEditingItem({
                      ...editingItem,
                      humanAnswer: {
                        pitch: editingItem.humanAnswer?.pitch || '',
                        steps: editingItem.humanAnswer?.steps || [],
                        proTip: e.target.value,
                        codeSnippet: editingItem.humanAnswer?.codeSnippet,
                      },
                    })
                  }
                />
              </div>

              {/* Code Snippet */}
              <div>
                <label className="text-xs text-muted" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>
                  💻 Code Snippet (DAX / SQL / Python):
                </label>
                <textarea
                  rows={3}
                  className="input text-sm font-mono"
                  style={{ fontFamily: 'monospace' }}
                  value={editingItem.humanAnswer?.codeSnippet || ''}
                  onChange={(e) =>
                    setEditingItem({
                      ...editingItem,
                      humanAnswer: {
                        pitch: editingItem.humanAnswer?.pitch || '',
                        steps: editingItem.humanAnswer?.steps || [],
                        proTip: editingItem.humanAnswer?.proTip || '',
                        codeSnippet: e.target.value,
                      },
                    })
                  }
                />
              </div>

              {/* Modal Footer Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setEditingItem(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <Check size={16} /> Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK INGEST MODAL */}
      {showIngestModal && (
        <div className="qb-modal-overlay" onClick={() => setShowIngestModal(false)}>
          <div className="qb-modal" onClick={(e) => e.stopPropagation()}>
            <div className="qb-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sparkles size={20} color="var(--accent-primary)" />
                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Quick Question Ingestion</h3>
              </div>
              <button
                className="btn-icon"
                style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
                onClick={() => setShowIngestModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="qb-modal-body">
              <div className="qb-modal-tabs">
                <button
                  className={`qb-modal-tab ${ingestTab === 'image' ? 'active' : ''}`}
                  onClick={() => setIngestTab('image')}
                >
                  📸 Screenshot / Image (Ctrl+V)
                </button>
                <button
                  className={`qb-modal-tab ${ingestTab === 'text' ? 'active' : ''}`}
                  onClick={() => setIngestTab('text')}
                >
                  📝 Raw Text / Post Dump
                </button>
              </div>

              {parseError && (
                <div
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid #ef4444',
                    color: '#ef4444',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.85rem',
                  }}
                >
                  {parseError}
                </div>
              )}

              <form onSubmit={handleFastIngest} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {ingestTab === 'image' && (
                  <div>
                    <label className="qb-paste-dropzone">
                      <UploadCloud size={30} color="var(--accent-primary)" />
                      <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                        Press <kbd style={{ background: 'var(--bg-card)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>Ctrl+V</kbd> to paste screenshot(s)
                      </span>
                      <span className="text-xs text-muted">or click to browse multiple screenshots</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        style={{ display: 'none' }}
                        onChange={handleImageUpload}
                      />
                    </label>

                    {pastedImages.length > 0 && (
                      <div style={{ marginTop: '0.85rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                          <span className="text-xs text-muted" style={{ fontWeight: 600 }}>
                            📸 {pastedImages.length} Screenshot{pastedImages.length === 1 ? '' : 's'} Loaded:
                          </span>
                          <button
                            type="button"
                            className="text-xs text-muted"
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--danger)' }}
                            onClick={() => setPastedImages([])}
                          >
                            Clear All
                          </button>
                        </div>
                        <div className="qb-image-gallery">
                          {pastedImages.map((img, idx) => (
                            <div key={img.id} className="qb-image-card">
                              <img src={img.data} alt={`Screenshot ${idx + 1}`} className="qb-image-preview" />
                              <button
                                type="button"
                                className="qb-image-remove-btn"
                                onClick={() => removePastedImage(img.id)}
                                title="Remove screenshot"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {ingestTab === 'text' && (
                  <div>
                    <label className="text-sm text-muted" style={{ display: 'block', marginBottom: '0.25rem' }}>
                      Paste Raw Post / Unstructured Questions:
                    </label>
                    <textarea
                      className="input"
                      rows={7}
                      placeholder="e.g. Paste entire LinkedIn post, Glassdoor interview debrief, or email dump..."
                      value={rawText}
                      onChange={(e) => setRawText(e.target.value)}
                    />
                  </div>
                )}

                {/* Optional Hints */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted">Company (Optional Hint):</label>
                    <input
                      type="text"
                      className="input text-sm"
                      placeholder="e.g. PwC, Accenture"
                      value={companyHint}
                      onChange={(e) => setCompanyHint(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted">Role (Optional Hint):</label>
                    <input
                      type="text"
                      className="input text-sm"
                      placeholder="e.g. Power BI Developer"
                      value={roleHint}
                      onChange={(e) => setRoleHint(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowIngestModal(false)}
                    disabled={isParsing}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={isParsing}>
                    {isParsing ? (
                      <>
                        <Loader2 size={16} className="animate-spin" /> Fast Extracting...
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} /> Fast Extract & Save
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* CLARIFICATION MODAL (LAYER 2: HUMAN-IN-THE-LOOP) */}
      {clarificationQueue && clarificationQueue.items.length > 0 && (
        <div className="qb-modal-overlay">
          <div
            className="qb-modal"
            style={{ maxWidth: '780px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
          >
            <div className="qb-modal-header">
              <div>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <ShieldCheck size={20} color="var(--accent-primary)" />
                  Duplicate Sentinel: Clarification Required
                </h3>
                <p className="text-xs text-muted" style={{ marginTop: '0.2rem' }}>
                  We detected {clarificationQueue.items.length} question
                  {clarificationQueue.items.length === 1 ? '' : 's'} with close semantic overlap to your existing bank.
                  Choose whether to merge or keep separate:
                </p>
              </div>
            </div>

            <div style={{ overflowY: 'auto', paddingRight: '0.25rem', marginTop: '0.75rem' }}>
              <div className="qb-clarify-list">
                {clarificationQueue.items.map((item, idx) => (
                  <div key={idx} className="qb-clarify-card">
                    <div className="qb-clarify-grid">
                      {/* Existing Question */}
                      <div className="qb-clarify-box existing">
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                          📁 EXISTING IN YOUR BANK:
                        </div>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.88rem' }}>
                          {item.matchedItem.question}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          🏢 {item.matchedItem.company} • 🛠️ {normalizeTool(item.matchedItem.tool).primaryTool}
                        </div>
                      </div>

                      {/* Incoming New Question */}
                      <div className="qb-clarify-box incoming">
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f59e0b' }}>
                          📸 INCOMING NEW EXTRACT:
                        </div>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.88rem' }}>
                          {sanitizeQuestionText(item.newQuestion.question)}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          🏢 {item.finalCompany} • 🛠️ {normalizeTool(item.newQuestion.tool).primaryTool}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.25rem' }}>
                      <span className="text-xs text-muted">
                        💡 <em>{item.reason || 'Similar technical concept'}</em> (~{item.similarityScore || 80}% match)
                      </span>

                      <div className="qb-clarify-actions">
                        <button
                          type="button"
                          className={`btn ${item.userDecision === 'merge' ? 'btn-primary' : 'btn-secondary'} text-xs`}
                          style={{ padding: '0.3rem 0.65rem' }}
                          onClick={() => {
                            const updatedItems = [...clarificationQueue.items];
                            updatedItems[idx].userDecision = 'merge';
                            setClarificationQueue({ ...clarificationQueue, items: updatedItems });
                          }}
                        >
                          <GitMerge size={13} /> Merge (Combine +1 Freq)
                        </button>

                        <button
                          type="button"
                          className={`btn ${item.userDecision === 'separate' ? 'btn-primary' : 'btn-secondary'} text-xs`}
                          style={{ padding: '0.3rem 0.65rem' }}
                          onClick={() => {
                            const updatedItems = [...clarificationQueue.items];
                            updatedItems[idx].userDecision = 'separate';
                            setClarificationQueue({ ...clarificationQueue, items: updatedItems });
                          }}
                        >
                          <Plus size={13} /> Keep as Separate
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '1.25rem',
                paddingTop: '0.75rem',
                borderTop: '1px solid var(--border-color)',
              }}
            >
              <div className="text-xs text-muted">
                {clarificationQueue.autoMergedCount > 0 && (
                  <span>⚡ {clarificationQueue.autoMergedCount} exact duplicate(s) auto-merged. </span>
                )}
                {clarificationQueue.pendingUniques.length > 0 && (
                  <span>✨ {clarificationQueue.pendingUniques.length} unique question(s) ready to save.</span>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setClarificationQueue(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleConfirmClarification}
                >
                  <Check size={16} /> Confirm & Save All
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONSOLIDATION REVIEW MODAL (LAYER 3: BANK-WIDE CONSOLIDATOR) */}
      {showConsolidationModal && consolidationClusters.length > 0 && (
        <div className="qb-modal-overlay" onClick={() => setShowConsolidationModal(false)}>
          <div
            className="qb-modal"
            style={{ maxWidth: '820px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="qb-modal-header">
              <div>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <GitMerge size={20} color="var(--accent-primary)" />
                  Consolidate Bank Duplicates
                </h3>
                <p className="text-xs text-muted" style={{ marginTop: '0.2rem' }}>
                  The AI Consolidator scanned your repository and identified {consolidationClusters.length} duplicate cluster
                  {consolidationClusters.length === 1 ? '' : 's'}. Review before combining:
                </p>
              </div>
              <button
                className="btn-icon"
                onClick={() => setShowConsolidationModal(false)}
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Quick Select / Deselect Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', padding: '0.4rem 0.6rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
              <span className="text-xs" style={{ fontWeight: 600 }}>
                {selectedDupIds.size} of {consolidationClusters.flatMap((c) => c.duplicateIds).length} questions selected for merge
              </span>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary text-xs"
                  style={{ padding: '0.2rem 0.5rem' }}
                  onClick={() => setSelectedDupIds(new Set(consolidationClusters.flatMap((c) => c.duplicateIds)))}
                >
                  Select All
                </button>
                <button
                  type="button"
                  className="btn btn-secondary text-xs"
                  style={{ padding: '0.2rem 0.5rem' }}
                  onClick={() => setSelectedDupIds(new Set())}
                >
                  Deselect All
                </button>
              </div>
            </div>

            <div style={{ overflowY: 'auto', paddingRight: '0.25rem', marginTop: '0.75rem' }}>
              <div className="qb-clarify-list">
                {consolidationClusters.map((cluster, cIdx) => {
                  const primary = questions.find((q) => q.id === cluster.primaryId);
                  const duplicates = questions.filter((q) => cluster.duplicateIds.includes(q.id));
                  if (!primary) return null;

                  return (
                    <div key={cIdx} className="qb-clarify-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <CheckCircle2 size={14} /> KEEP PRIMARY QUESTION:
                          </div>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.92rem' }}>
                            {primary.question}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            🏢 {primary.company} • 🛠️ {normalizeTool(primary.tool).primaryTool} • 🔥 {primary.frequencyCount}x Asked
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn btn-secondary text-xs"
                          style={{ padding: '0.2rem 0.5rem', flexShrink: 0 }}
                          onClick={() => handleDismissCluster(cluster)}
                          title="Mark as distinct questions so they never appear in future audits"
                        >
                          ✕ Mark Distinct
                        </button>
                      </div>

                      <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--warning)', marginBottom: '0.35rem' }}>
                          🔄 SELECT DUPLICATES TO MERGE INTO THIS PRIMARY:
                        </div>
                        {duplicates.map((dup, dIdx) => {
                          const isChecked = selectedDupIds.has(dup.id);
                          return (
                            <label
                              key={dIdx}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.6rem',
                                background: isChecked ? 'var(--bg-card)' : 'rgba(100, 116, 139, 0.06)',
                                opacity: isChecked ? 1 : 0.6,
                                padding: '0.45rem 0.65rem',
                                borderRadius: 'var(--radius-sm)',
                                border: isChecked ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                                marginBottom: '0.35rem',
                                fontSize: '0.82rem',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  const next = new Set(selectedDupIds);
                                  if (e.target.checked) next.add(dup.id);
                                  else next.delete(dup.id);
                                  setSelectedDupIds(next);
                                }}
                              />
                              <div style={{ flex: 1 }}>
                                <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>"{dup.question}"</span>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginLeft: '0.45rem' }}>
                                  (🏢 {dup.company} • 🛠️ {normalizeTool(dup.tool).primaryTool})
                                </span>
                              </div>
                            </label>
                          );
                        })}
                      </div>

                      <div className="text-xs text-muted" style={{ fontStyle: 'italic', marginTop: '0.2rem' }}>
                        💡 {cluster.reason}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '1.25rem',
                paddingTop: '0.75rem',
                borderTop: '1px solid var(--border-color)',
              }}
            >
              <span className="text-xs text-muted">
                Zero data loss: Selected duplicates will merge companies, frequencies, and aliases into primary cards.
              </span>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowConsolidationModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleApplyConsolidation}
                  disabled={selectedDupIds.size === 0}
                >
                  <GitMerge size={16} /> Apply Merges ({selectedDupIds.size})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default QuestionBank;
