import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/StoreContext';
import {
  Search,
  LayoutDashboard,
  BookOpen,
  Library,
  Calculator,
  Briefcase,
  MessageSquare,
  Mic,
  FileQuestion,
  AlertTriangle,
  FolderGit2,
  FileText,
  Files,
  Code2,
  Brain,
  Sun,
  Moon,
  Key,
  PanelLeftClose,
  ArrowRight,
  Sparkles,
  PlusCircle,
  Database,
  Table,
  Zap,
  Maximize2,
  LogOut,
  FolderPlus,
  Compass,
  Timer,
  XCircle,
} from 'lucide-react';
import './CommandPalette.css';

interface CommandItem {
  id: string;
  title: string;
  category: 'Modules' | 'Sub-Views' | 'Formatter' | 'Quick Actions' | 'My Data' | 'System';
  description?: string;
  icon: React.ReactNode;
  keywords: string[];
  badge?: string;
  action: () => void;
}

interface CommandPaletteProps {
  onOpenAiSettings?: () => void;
  onToggleTheme?: () => void;
  onToggleSidebar?: () => void;
}

const AUTO_REDIRECT_DELAY_MS = 1500; // 1.5 seconds idle auto-redirect

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  onOpenAiSettings,
  onToggleTheme,
  onToggleSidebar,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [countdownRemaining, setCountdownRemaining] = useState<number | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<any>(null);
  const intervalRef = useRef<any>(null);
  const isCancelledRef = useRef<boolean>(false);

  const navigate = useNavigate();
  const { state } = useStore();

  const clearAutoRedirectTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setCountdownRemaining(null);
  };

  const openPalette = () => {
    isCancelledRef.current = false;
    clearAutoRedirectTimer();
    setIsOpen(true);
    setQuery('');
    setSelectedIndex(0);
  };

  const closePalette = () => {
    isCancelledRef.current = true;
    clearAutoRedirectTimer();
    setIsOpen(false);
    setQuery('');
  };

  // Keyboard shortcut listener: "/" (slash) or Ctrl+F / Cmd+F
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Intercept Control+F or Cmd+F
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        e.stopPropagation();
        if (isOpen) {
          closePalette();
        } else {
          openPalette();
        }
        return;
      }

      // Quick slash "/" when not focused on an input/textarea
      if (e.key === '/' && !isOpen) {
        const activeEl = document.activeElement;
        const isInput =
          activeEl instanceof HTMLInputElement ||
          activeEl instanceof HTMLTextAreaElement ||
          activeEl?.getAttribute('contenteditable') === 'true';
        if (!isInput) {
          e.preventDefault();
          openPalette();
          return;
        }
      }

      // Close on Escape - explicitly guarantees NO auto-redirect
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        e.stopPropagation();
        closePalette();
      }
    };

    const handleCustomOpen = () => openPalette();

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('ces:open-command-palette', handleCustomOpen);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('ces:open-command-palette', handleCustomOpen);
    };
  }, [isOpen]);

  // Focus input whenever opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isOpen]);

  // Build the complete universe of commands
  const staticCommands: CommandItem[] = useMemo(() => {
    const nav = (path: string) => {
      clearAutoRedirectTimer();
      navigate(path);
      closePalette();
    };

    return [
      // 1. TOP-LEVEL MODULES
      {
        id: 'mod-formatter',
        title: 'Universal Formatter & Studio',
        category: 'Modules',
        description: 'Auto-format DAX, SQL, JSON, Python, M-Code, Excel formulas with 1-click copy',
        icon: <Code2 size={18} />,
        keywords: ['formatter', 'universal formatter', 'format', 'beautify', 'clean code', 'lint', 'json', 'sql', 'dax'],
        badge: 'Tool',
        action: () => nav('/formatter'),
      },
      {
        id: 'mod-dax-mastery',
        title: 'DEXer — DAX & Power BI Mastery Tracker',
        category: 'Modules',
        description: 'DAX patterns, calculate/filter context, recipes, Power BI interview scenarios',
        icon: <Calculator size={18} />,
        keywords: ['dax', 'dax log', 'daxer', 'dexer', 'power bi', 'powerbi', 'pbi', 'dax mastery', 'formulas', 'measures'],
        badge: 'Core',
        action: () => nav('/dax-mastery'),
      },
      {
        id: 'mod-dashboard',
        title: 'Mission Control Dashboard',
        category: 'Modules',
        description: 'Global career KPI metrics, daily targets, pipeline progression',
        icon: <LayoutDashboard size={18} />,
        keywords: ['dashboard', 'home', 'overview', 'mission control', 'analytics', 'kpi', 'summary'],
        badge: 'Nav',
        action: () => nav('/'),
      },
      {
        id: 'mod-decision-intelligence',
        title: 'Decision Intelligence',
        category: 'Modules',
        description: 'Strategic career decision engine, trade-off matrices, opportunity scoring',
        icon: <Brain size={18} />,
        keywords: ['decision', 'decision intelligence', 'matrix', 'strategy', 'tradeoffs', 'evaluation', 'choices'],
        badge: 'Strategy',
        action: () => nav('/decision-intelligence'),
      },
      {
        id: 'mod-interview-arena',
        title: 'Interview Arena (AI Voice Simulator)',
        category: 'Modules',
        description: 'Real-time mock interview arena with AI speech critique and scoring',
        icon: <Mic size={18} />,
        keywords: ['arena', 'interview arena', 'mock', 'simulation', 'practice', 'voice', 'speech', 'ai interview'],
        badge: 'Practice',
        action: () => nav('/interview-arena'),
      },
      {
        id: 'mod-interviews',
        title: 'Interviews Pipeline',
        category: 'Modules',
        description: 'Track scheduled interview rounds, interviewer debriefs, and lessons learned',
        icon: <MessageSquare size={18} />,
        keywords: ['interviews', 'rounds', 'technical round', 'hr round', 'debrief', 'feedback', 'pipeline'],
        badge: 'Nav',
        action: () => nav('/interviews'),
      },
      {
        id: 'mod-applications',
        title: 'Job Applications Tracker',
        category: 'Modules',
        description: 'Application statuses, recruiter contacts, follow-up dates, job URLs',
        icon: <Briefcase size={18} />,
        keywords: ['applications', 'jobs', 'applied', 'company', 'positions', 'openings', 'tracker'],
        badge: 'Nav',
        action: () => nav('/applications'),
      },
      {
        id: 'mod-question-bank',
        title: 'Question Bank',
        category: 'Modules',
        description: 'Comprehensive bank of Power BI, SQL, Python, and behavioral interview questions',
        icon: <FileQuestion size={18} />,
        keywords: ['question bank', 'questions', 'faq', 'answers', 'interview questions', 'behavioral', 'star method'],
        badge: 'Knowledge',
        action: () => nav('/question-bank'),
      },
      {
        id: 'mod-weaknesses',
        title: 'Weaknesses & Mistake Tracker',
        category: 'Modules',
        description: 'Post-mortem mistake logging, blind spots, recurring technical gaps',
        icon: <AlertTriangle size={18} />,
        keywords: ['weaknesses', 'mistakes', 'errors', 'gaps', 'post-mortem', 'improvements', 'blind spots'],
        badge: 'Improve',
        action: () => nav('/weaknesses'),
      },
      {
        id: 'mod-tracks',
        title: 'Learning Tracks & Roadmaps',
        category: 'Modules',
        description: 'Power BI, SQL, and Python curriculum modules and progress roadmaps',
        icon: <BookOpen size={18} />,
        keywords: ['tracks', 'learning tracks', 'curriculum', 'roadmap', 'study', 'syllabus', 'modules'],
        badge: 'Study',
        action: () => nav('/tracks'),
      },
      {
        id: 'mod-concept-library',
        title: 'Concept Library',
        category: 'Modules',
        description: 'Data architecture patterns, ETL designs, deep-dive technical notes',
        icon: <Library size={18} />,
        keywords: ['concept', 'concepts', 'concept library', 'notes', 'knowledge', 'cheatsheets', 'architecture'],
        badge: 'Library',
        action: () => nav('/concept-library'),
      },
      {
        id: 'mod-projects',
        title: 'Project Portfolio Tracker',
        category: 'Modules',
        description: 'Enterprise projects, GitHub repositories, architecture documentation',
        icon: <FolderGit2 size={18} />,
        keywords: ['projects', 'portfolio', 'github', 'repos', 'case studies', 'code'],
        badge: 'Nav',
        action: () => nav('/projects'),
      },
      {
        id: 'mod-resumes',
        title: 'Resume Tracker & ATS Versions',
        category: 'Modules',
        description: 'Targeted resume versions, ATS keyword optimization, cover letters',
        icon: <FileText size={18} />,
        keywords: ['resumes', 'resume tracker', 'cv', 'ats', 'curriculum vitae', 'versions'],
        badge: 'Nav',
        action: () => nav('/resumes'),
      },
      {
        id: 'mod-documents',
        title: 'Documents & Credentials',
        category: 'Modules',
        description: 'Offer letters, certifications, ID proofs, academic transcripts',
        icon: <Files size={18} />,
        keywords: ['documents', 'docs', 'certificates', 'files', 'credentials', 'offer letters'],
        badge: 'Nav',
        action: () => nav('/documents'),
      },

      // 2. DEEP SUB-VIEWS & DIRECT TABS
      {
        id: 'sub-dax-tracker',
        title: 'DEXer: DAX Learning & Function Log',
        category: 'Sub-Views',
        description: 'Filter context functions (TREATAS, USERELATIONSHIP, CALCULATE, CROSSFILTER)',
        icon: <Calculator size={18} />,
        keywords: ['dax log', 'dax functions', 'dax learning tracker', 'filter context', 'treatas', 'userelationship', 'calculate'],
        badge: 'DEXer Tab',
        action: () => nav('/dax-mastery?tab=tracker'),
      },
      {
        id: 'sub-dax-recipes',
        title: 'DEXer: Battle-Tested DAX Recipes',
        category: 'Sub-Views',
        description: 'YoY Growth, Running Totals, Dynamic Ranking, New vs Returning Customers',
        icon: <Sparkles size={18} />,
        keywords: ['dax recipes', 'dax patterns', 'yoy growth', 'running totals', 'recipes', 'dax formulas'],
        badge: 'DEXer Tab',
        action: () => nav('/dax-mastery?tab=recipes'),
      },
      {
        id: 'sub-dax-pbi',
        title: 'DEXer: Power BI Interview Scenarios',
        category: 'Sub-Views',
        description: 'RLS, incremental refresh, dual storage, aggregation tables, performance optimization',
        icon: <Table size={18} />,
        keywords: ['pbi interview', 'power bi scenarios', 'rls', 'incremental refresh', 'performance tuning'],
        badge: 'DEXer Tab',
        action: () => nav('/dax-mastery?tab=pbi'),
      },
      {
        id: 'sub-arena-45m',
        title: 'Interview Arena: 45m Comprehensive Workout',
        category: 'Sub-Views',
        description: 'Full-length simulated technical interview with timed voice/text responses',
        icon: <Mic size={18} />,
        keywords: ['45m workout', 'full mock interview', 'timed interview', 'arena workout'],
        badge: 'Arena Mode',
        action: () => nav('/interview-arena'),
      },
      {
        id: 'sub-arena-15m',
        title: 'Interview Arena: 15m Sprint Drill',
        category: 'Sub-Views',
        description: 'High-intensity rapid-fire questioning drill',
        icon: <Zap size={18} />,
        keywords: ['15m sprint', 'sprint drill', 'rapid fire interview', 'quick practice'],
        badge: 'Arena Mode',
        action: () => nav('/interview-arena'),
      },
      {
        id: 'sub-qb-pbi',
        title: 'Question Bank: Power BI & DAX Questions',
        category: 'Sub-Views',
        description: 'Curated DAX, data modeling, M-code, and Power BI interview questions',
        icon: <FileQuestion size={18} />,
        keywords: ['power bi questions', 'dax questions', 'powerbi interview qna'],
        badge: 'Question Bank',
        action: () => nav('/question-bank'),
      },
      {
        id: 'sub-qb-sql',
        title: 'Question Bank: SQL & Data Warehouse Questions',
        category: 'Sub-Views',
        description: 'Window functions, CTEs, self joins, indexing, query execution plans',
        icon: <Database size={18} />,
        keywords: ['sql questions', 'database questions', 'sql interview', 'joins questions'],
        badge: 'Question Bank',
        action: () => nav('/question-bank'),
      },

      // 3. UNIVERSAL FORMATTER DIRECT LANGUAGE MODES
      {
        id: 'fmt-dax',
        title: 'Format DAX Formula',
        category: 'Formatter',
        description: 'CALCULATE, FILTER, VAR/RETURN, Time Intelligence formatting with indentation',
        icon: <Calculator size={18} />,
        keywords: ['format dax', 'dax formatter', 'dax beautifier', 'clean dax', 'beautify dax'],
        badge: 'DAX',
        action: () => nav('/formatter?lang=dax'),
      },
      {
        id: 'fmt-sql',
        title: 'Format SQL Query',
        category: 'Formatter',
        description: 'Uppercase keywords (SELECT, FROM, WHERE, JOIN), CTE alignment, indentation',
        icon: <Database size={18} />,
        keywords: ['format sql', 'sql formatter', 'sql beautifier', 'clean sql', 'beautify sql'],
        badge: 'SQL',
        action: () => nav('/formatter?lang=sql'),
      },
      {
        id: 'fmt-json',
        title: 'Format & Validate JSON',
        category: 'Formatter',
        description: 'Beautify JSON, fix trailing commas/quotes, minify, inspect syntax errors',
        icon: <Code2 size={18} />,
        keywords: ['format json', 'json formatter', 'validate json', 'beautify json', 'clean json'],
        badge: 'JSON',
        action: () => nav('/formatter?lang=json'),
      },
      {
        id: 'fmt-python',
        title: 'Format Python / Pandas Script',
        category: 'Formatter',
        description: 'Format Python scripts, dictionary formatting, list comprehension cleaning',
        icon: <Code2 size={18} />,
        keywords: ['format python', 'python formatter', 'pandas code', 'clean python'],
        badge: 'Python',
        action: () => nav('/formatter?lang=python'),
      },
      {
        id: 'fmt-excel',
        title: 'Format Excel Formulas (LET / LAMBDA / IF)',
        category: 'Formatter',
        description: 'Format complex nested Excel formulas, XLOOKUP, INDEX/MATCH, LET blocks',
        icon: <Table size={18} />,
        keywords: ['format excel', 'excel formatter', 'let formula', 'xlookup', 'nested if format'],
        badge: 'Excel',
        action: () => nav('/formatter?lang=excel'),
      },
      {
        id: 'fmt-powerquery',
        title: 'Format Power Query (M Code)',
        category: 'Formatter',
        description: 'Let/In step indentation, Table transformations, Promoted Headers formatting',
        icon: <Zap size={18} />,
        keywords: ['format power query', 'm code formatter', 'powerquery format', 'm code'],
        badge: 'M Code',
        action: () => nav('/formatter?lang=powerquery'),
      },
      {
        id: 'fmt-markdown',
        title: 'Format Markdown & Tables',
        category: 'Formatter',
        description: 'Align Markdown data dictionary schema tables and technical notes',
        icon: <FileText size={18} />,
        keywords: ['format markdown', 'markdown table', 'table align', 'markdown formatter'],
        badge: 'Markdown',
        action: () => nav('/formatter?lang=markdown'),
      },

      // 4. QUICK ACTIONS & CREATION SHORTCUTS
      {
        id: 'act-new-app',
        title: 'Add New Job Application',
        category: 'Quick Actions',
        description: 'Log a new company, target position, salary range, and job link',
        icon: <PlusCircle size={18} />,
        keywords: ['new application', 'add job', 'create application', 'log job', 'apply'],
        badge: 'Create',
        action: () => nav('/applications'),
      },
      {
        id: 'act-new-interview',
        title: 'Log New Interview Round',
        category: 'Quick Actions',
        description: 'Record an upcoming or completed technical/HR round and questions asked',
        icon: <PlusCircle size={18} />,
        keywords: ['new interview', 'add interview', 'log interview', 'record round'],
        badge: 'Create',
        action: () => nav('/interviews'),
      },
      {
        id: 'act-new-weakness',
        title: 'Log Mistake or Weakness',
        category: 'Quick Actions',
        description: 'Add an identified gap from an interview with resolution plan',
        icon: <PlusCircle size={18} />,
        keywords: ['new weakness', 'add mistake', 'log error', 'record weakness'],
        badge: 'Create',
        action: () => nav('/weaknesses'),
      },
      {
        id: 'act-new-project',
        title: 'Add Portfolio Project',
        category: 'Quick Actions',
        description: 'Create a new project record with tech stack and GitHub link',
        icon: <FolderPlus size={18} />,
        keywords: ['new project', 'add project', 'portfolio add', 'create project'],
        badge: 'Create',
        action: () => nav('/projects'),
      },
      {
        id: 'act-new-resume',
        title: 'Add Resume Version',
        category: 'Quick Actions',
        description: 'Track a customized resume version tailored to specific roles',
        icon: <FileText size={18} />,
        keywords: ['new resume', 'add cv', 'upload resume', 'resume version'],
        badge: 'Create',
        action: () => nav('/resumes'),
      },
      {
        id: 'act-new-doc',
        title: 'Upload Document / Certificate',
        category: 'Quick Actions',
        description: 'Store certificate, offer letter, or credential record',
        icon: <Files size={18} />,
        keywords: ['upload document', 'add certificate', 'upload file', 'new document'],
        badge: 'Create',
        action: () => nav('/documents'),
      },

      // 5. GLOBAL SYSTEM & PREFERENCE ACTIONS
      {
        id: 'sys-toggle-theme',
        title: 'Toggle Obsidian Night / Clean Day Theme',
        category: 'System',
        description: 'Instantly toggle theme aesthetic between Obsidian Night and Clean Day',
        icon: document.documentElement.getAttribute('data-theme') === 'night' ? <Sun size={18} /> : <Moon size={18} />,
        keywords: ['toggle theme', 'theme', 'dark mode', 'night mode', 'light mode', 'day mode'],
        badge: 'Theme',
        action: () => {
          if (onToggleTheme) {
            onToggleTheme();
          } else {
            const current = document.documentElement.getAttribute('data-theme') || 'night';
            const next = current === 'night' ? 'day' : 'night';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('ces_theme', next);
          }
          closePalette();
        },
      },
      {
        id: 'sys-theme-night',
        title: 'Set Theme to Obsidian Night Mode',
        category: 'System',
        description: 'Dark cyber-obsidian background with Matrix emerald accents',
        icon: <Moon size={18} />,
        keywords: ['night mode', 'dark mode', 'obsidian', 'black theme'],
        badge: 'Theme',
        action: () => {
          document.documentElement.setAttribute('data-theme', 'night');
          localStorage.setItem('ces_theme', 'night');
          closePalette();
        },
      },
      {
        id: 'sys-theme-day',
        title: 'Set Theme to Clean Day Mode',
        category: 'System',
        description: 'Clean monochrome light interface with crisp contrast',
        icon: <Sun size={18} />,
        keywords: ['day mode', 'light mode', 'white theme'],
        badge: 'Theme',
        action: () => {
          document.documentElement.setAttribute('data-theme', 'day');
          localStorage.setItem('ces_theme', 'day');
          closePalette();
        },
      },
      {
        id: 'sys-ai-settings',
        title: 'AI Copilot API Key Settings',
        category: 'System',
        description: 'Configure Gemini API keys, OpenRouter, and model parameters',
        icon: <Key size={18} />,
        keywords: ['ai settings', 'api key', 'gemini', 'openrouter', 'copilot', 'llm', 'ai key'],
        badge: 'Settings',
        action: () => {
          if (onOpenAiSettings) {
            onOpenAiSettings();
          } else {
            window.dispatchEvent(new CustomEvent('ces:open-ai-settings'));
          }
          closePalette();
        },
      },
      {
        id: 'sys-toggle-sidebar',
        title: 'Toggle Navigation Sidebar',
        category: 'System',
        description: 'Expand or collapse the sidebar for widescreen focus (Ctrl+B)',
        icon: <PanelLeftClose size={18} />,
        keywords: ['toggle sidebar', 'collapse sidebar', 'expand sidebar', 'sidebar'],
        badge: 'Ctrl+B',
        action: () => {
          if (onToggleSidebar) {
            onToggleSidebar();
          } else {
            window.dispatchEvent(new CustomEvent('ces:toggle-sidebar'));
          }
          closePalette();
        },
      },
      {
        id: 'sys-fullscreen',
        title: 'Toggle Fullscreen Mode',
        category: 'System',
        description: 'Toggle browser fullscreen display for distraction-free execution',
        icon: <Maximize2 size={18} />,
        keywords: ['fullscreen', 'maximize', 'zen mode', 'focus mode'],
        badge: 'Screen',
        action: () => {
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => null);
          } else {
            document.exitFullscreen().catch(() => null);
          }
          closePalette();
        },
      },
      {
        id: 'sys-logout',
        title: 'Log Out of MYCES',
        category: 'System',
        description: 'Terminate local session and return to authentication gateway',
        icon: <LogOut size={18} />,
        keywords: ['logout', 'sign out', 'exit', 'lock'],
        badge: 'Auth',
        action: async () => {
          await fetch('/api/logout', { method: 'POST' }).catch(() => null);
          navigate('/login', { replace: true });
          closePalette();
        },
      },
    ];
  }, [navigate, onOpenAiSettings, onToggleTheme, onToggleSidebar]);

  // Dynamic items from user's live store state
  const storeCommands: CommandItem[] = useMemo(() => {
    const items: CommandItem[] = [];

    // Job applications
    if (state.applications && state.applications.length > 0) {
      state.applications.slice(0, 15).forEach((app) => {
        items.push({
          id: `data-app-${app.id}`,
          title: `${app.company} — ${app.position}`,
          category: 'My Data',
          description: `Status: ${app.status} | Priority: ${app.priorityLevel}${app.location ? ` | ${app.location}` : ''}`,
          icon: <Briefcase size={18} />,
          keywords: [app.company, app.position, app.status, app.location || '', 'job', 'application'],
          badge: 'Application',
          action: () => {
            clearAutoRedirectTimer();
            navigate('/applications');
            closePalette();
          },
        });
      });
    }

    // Projects
    if (state.projects && state.projects.length > 0) {
      state.projects.slice(0, 10).forEach((proj) => {
        items.push({
          id: `data-proj-${proj.id}`,
          title: `Project: ${proj.name}`,
          category: 'My Data',
          description: `Status: ${proj.status} | Tech: ${(proj.technologiesUsed || []).join(', ')}`,
          icon: <FolderGit2 size={18} />,
          keywords: [proj.name, proj.status, ...(proj.technologiesUsed || []), 'project', 'portfolio'],
          badge: 'Project',
          action: () => {
            clearAutoRedirectTimer();
            navigate('/projects');
            closePalette();
          },
        });
      });
    }

    // Weaknesses
    if (state.weaknesses && state.weaknesses.length > 0) {
      state.weaknesses.slice(0, 10).forEach((w) => {
        items.push({
          id: `data-weak-${w.id}`,
          title: `Gap: ${w.topic}`,
          category: 'My Data',
          description: `From: ${w.interviewCompany || 'Practice'} | Status: ${w.status}`,
          icon: <AlertTriangle size={18} />,
          keywords: [w.topic, w.interviewCompany || '', w.status, 'weakness', 'mistake'],
          badge: 'Weakness',
          action: () => {
            clearAutoRedirectTimer();
            navigate('/weaknesses');
            closePalette();
          },
        });
      });
    }

    // Resumes
    if (state.resumes && state.resumes.length > 0) {
      state.resumes.slice(0, 5).forEach((res) => {
        items.push({
          id: `data-resume-${res.id}`,
          title: `Resume: ${res.versionName}`,
          category: 'My Data',
          description: `Target Role: ${res.roleTargeted}`,
          icon: <FileText size={18} />,
          keywords: [res.versionName, res.roleTargeted, 'resume', 'cv'],
          badge: 'Resume',
          action: () => {
            clearAutoRedirectTimer();
            navigate('/resumes');
            closePalette();
          },
        });
      });
    }

    return items;
  }, [state, navigate]);

  // Combine static and store commands
  const allCommands = useMemo(() => {
    return [...staticCommands, ...storeCommands];
  }, [staticCommands, storeCommands]);

  // Intelligent Multi-Term Filtering with Relevance Scoring
  const filteredCommands = useMemo(() => {
    const raw = query.trim().toLowerCase();
    if (!raw) {
      return allCommands.filter((cmd) => cmd.category !== 'My Data');
    }

    const searchTokens = raw.split(/\s+/).filter(Boolean);

    // Score each command
    const scored = allCommands
      .map((cmd) => {
        const titleLower = cmd.title.toLowerCase();
        const descLower = (cmd.description || '').toLowerCase();
        const catLower = cmd.category.toLowerCase();
        const titleWords = titleLower.split(/[\s—:–\-()]+/).filter(Boolean);
        const descWords = descLower.split(/[\s—:–\-()]+/).filter(Boolean);

        // Every search token must match somewhere
        const allTokensMatch = searchTokens.every((token) => {
          const inTitle = titleLower.includes(token);
          const inDesc = descLower.includes(token);
          const inCat = catLower.includes(token);
          const inKeywords = cmd.keywords.some((k) => k.toLowerCase().includes(token));
          return inTitle || inDesc || inCat || inKeywords;
        });

        if (!allTokensMatch) return null;

        let score = 0;

        // 1. Title matching (HIGHEST PRIORITY)
        // Exact start of title (e.g. "lea" -> "Learning Tracks...")
        if (titleLower.startsWith(raw)) {
          score += 15000;
        }

        // Any word in title starts with token (e.g. "DEXer: DAX Learning...")
        searchTokens.forEach((token) => {
          if (titleWords.some((w) => w.startsWith(token))) {
            score += 5000;
          } else if (titleLower.includes(token)) {
            score += 1500;
          }
        });

        // 2. Category Priority: Core Sections / Modules appear before sub-tools and actions
        if (cmd.category === 'Modules') {
          score += 2500;
        } else if (cmd.category === 'Sub-Views') {
          score += 1000;
        }

        // 3. Keyword matching (prioritize exact word matches over internal substrings)
        searchTokens.forEach((token) => {
          for (const kw of cmd.keywords) {
            const kwLower = kw.toLowerCase();
            if (kwLower === token) {
              score += 2000; // exact keyword match e.g. "dax"
            } else if (kwLower.startsWith(token)) {
              score += 1000;
            } else if (kwLower.split(/\s+/).some((w) => w.startsWith(token))) {
              score += 800;
            } else if (kwLower.includes(token)) {
              score += 50; // substring inside keyword e.g. "c[lea]n"
            }
          }
        });

        // 4. Description matching
        searchTokens.forEach((token) => {
          if (descWords.some((w) => w.startsWith(token))) {
            score += 200;
          } else if (descLower.includes(token)) {
            score += 30;
          }
        });

        return { cmd, score };
      })
      .filter((item): item is { cmd: CommandItem; score: number } => item !== null);

    // Sort descending by score
    scored.sort((a, b) => b.score - a.score);

    return scored.map((item) => item.cmd);
  }, [allCommands, query]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredCommands.length, query]);

  // =========================================================================
  // AUTO-REDIRECT ENGINE:
  // If user types query (e.g. "dax", "formatter") and stops movement for 1.5s,
  // automatically redirect to the top result! Pressing ESC cancels completely.
  // =========================================================================
  useEffect(() => {
    clearAutoRedirectTimer();

    const trimmed = query.trim();
    if (!isOpen || !trimmed || filteredCommands.length === 0 || isCancelledRef.current) {
      setCountdownRemaining(null);
      return;
    }

    const targetCommand = filteredCommands[selectedIndex] || filteredCommands[0];
    if (!targetCommand) return;

    let timeLeft = AUTO_REDIRECT_DELAY_MS;
    setCountdownRemaining(timeLeft);

    // Update countdown tick every 100ms
    intervalRef.current = setInterval(() => {
      timeLeft -= 100;
      if (timeLeft <= 0) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        setCountdownRemaining(0);
      } else {
        setCountdownRemaining(timeLeft);
      }
    }, 100);

    // Execute redirection on timer completion
    timerRef.current = setTimeout(() => {
      if (!isCancelledRef.current) {
        targetCommand.action();
      }
      clearAutoRedirectTimer();
    }, AUTO_REDIRECT_DELAY_MS);

    return () => {
      clearAutoRedirectTimer();
    };
  }, [query, selectedIndex, isOpen, filteredCommands]);

  // User movement or activity resets/cancels the timer to give control
  const handleUserActivity = () => {
    // If user is actively moving mouse or navigating, delay the redirect
    if (timerRef.current && countdownRemaining !== null) {
      clearAutoRedirectTimer();
    }
  };

  // Keyboard navigation within list
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closePalette();
      return;
    }

    if (filteredCommands.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      clearAutoRedirectTimer();
      setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
      scrollSelectedIntoView((selectedIndex + 1) % filteredCommands.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      clearAutoRedirectTimer();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      scrollSelectedIntoView((selectedIndex - 1 + filteredCommands.length) % filteredCommands.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      clearAutoRedirectTimer();
      const selected = filteredCommands[selectedIndex];
      if (selected) {
        selected.action();
      }
    }
  };

  const scrollSelectedIntoView = (index: number) => {
    if (!listRef.current) return;
    const items = listRef.current.querySelectorAll('.cmd-palette-item');
    const target = items[index] as HTMLElement;
    if (target) {
      target.scrollIntoView({ block: 'nearest' });
    }
  };

  if (!isOpen) return null;

  const topTarget = filteredCommands[selectedIndex] || filteredCommands[0];
  const progressPercent = countdownRemaining !== null
    ? Math.max(0, Math.min(100, ((AUTO_REDIRECT_DELAY_MS - countdownRemaining) / AUTO_REDIRECT_DELAY_MS) * 100))
    : 0;

  return (
    <div className="cmd-palette-backdrop" onClick={closePalette}>
      <div
        className="cmd-palette-modal"
        onClick={(e) => e.stopPropagation()}
        onMouseMove={handleUserActivity}
        role="dialog"
        aria-modal="true"
        aria-label="Global Command Palette"
      >
        {/* Auto-Redirect Progress Bar */}
        {countdownRemaining !== null && (
          <div className="cmd-auto-redirect-bar-container">
            <div
              className="cmd-auto-redirect-bar-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}

        {/* Header / Input */}
        <div className="cmd-palette-header">
          <div className="cmd-palette-search-icon">
            <Search size={20} />
          </div>
          <input
            ref={inputRef}
            type="text"
            className="cmd-palette-input"
            placeholder="Type anything... (e.g. 'dax', 'formatter', 'arena', 'sql')"
            value={query}
            onChange={(e) => {
              isCancelledRef.current = false;
              setQuery(e.target.value);
            }}
            onKeyDown={handleInputKeyDown}
            autoComplete="off"
            spellCheck="false"
          />

          {countdownRemaining !== null && topTarget && (
            <div className="cmd-countdown-pill" title="Press Escape to cancel auto-redirect">
              <Timer size={13} className="cmd-countdown-pulse" />
              <span>Jumping in {(countdownRemaining / 1000).toFixed(1)}s</span>
              <button
                type="button"
                className="cmd-countdown-cancel-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  isCancelledRef.current = true;
                  clearAutoRedirectTimer();
                }}
                title="Cancel Auto-jump"
              >
                <XCircle size={13} />
              </button>
            </div>
          )}

          {query ? (
            <button
              type="button"
              className="cmd-palette-clear-btn"
              onClick={() => {
                clearAutoRedirectTimer();
                setQuery('');
              }}
              title="Clear search"
            >
              Clear
            </button>
          ) : (
            <div className="cmd-palette-esc-badge">ESC</div>
          )}
        </div>

        {/* Results List */}
        <div className="cmd-palette-list" ref={listRef}>
          {filteredCommands.length === 0 ? (
            <div className="cmd-palette-empty">
              <Sparkles size={28} className="cmd-palette-empty-icon" />
              <p className="cmd-palette-empty-title">No matching modules or data found</p>
              <p className="cmd-palette-empty-sub">
                Try searching for "dax", "formatter", "sql", "arena", or a company name.
              </p>
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={cmd.id}
                  className={`cmd-palette-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => cmd.action()}
                  onMouseEnter={() => {
                    clearAutoRedirectTimer();
                    setSelectedIndex(idx);
                  }}
                >
                  <div className="cmd-palette-item-icon">{cmd.icon}</div>
                  <div className="cmd-palette-item-content">
                    <div className="cmd-palette-item-header">
                      <span className="cmd-palette-item-title">{cmd.title}</span>
                      <span className={`cmd-palette-item-badge badge-${cmd.category.toLowerCase().replace(/\s+/g, '-')}`}>
                        {cmd.badge || cmd.category}
                      </span>
                    </div>
                    {cmd.description && (
                      <div className="cmd-palette-item-desc">{cmd.description}</div>
                    )}
                  </div>
                  <div className="cmd-palette-item-enter">
                    {isSelected && (
                      <span className="cmd-palette-enter-hint">
                        {countdownRemaining !== null && idx === 0 ? (
                          <>Auto-jump <Timer size={13} /></>
                        ) : (
                          <>Jump <ArrowRight size={13} /></>
                        )}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="cmd-palette-footer">
          <div className="cmd-palette-footer-item">
            <kbd className="cmd-kbd">Ctrl+F</kbd> / <kbd className="cmd-kbd">/</kbd> to open
          </div>
          <div className="cmd-palette-footer-item">
            <kbd className="cmd-kbd">ESC</kbd> to cancel / close
          </div>
          <div className="cmd-palette-footer-item">
            <kbd className="cmd-kbd">↵</kbd> jump now
          </div>
          <div className="cmd-palette-footer-brand">
            <Compass size={13} /> MYCES Spotlight
          </div>
        </div>
      </div>
    </div>
  );
};
