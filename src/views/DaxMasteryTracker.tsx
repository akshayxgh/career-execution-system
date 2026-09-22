import React, { useState, useEffect, useRef } from 'react';
import { 
  Calculator, 
  Search, 
  Sparkles, 
  Bot, 
  Send, 
  Copy, 
  Check, 
  Layers, 
  ShieldCheck, 
  RefreshCw,
  X,
  MessageSquare,
  AlertTriangle,
  Sliders,
  Play,
  Wrench,
  ChevronDown,
  ChevronUp,
  Table,
  GraduationCap,
  Download,
  Plus,
  Trash2,
  AlertCircle,
  RotateCcw
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { DAX_RECIPES } from '../data/daxMasteryData';
import { DAX_LEARNING_TRACKER_DATA, type DaxLearningItem } from '../data/daxLearningTrackerData';
import { copilotService } from '../services/copilotService';
import './DaxMasteryTracker.css';

const SMART_DAX_DEFAULTS: Record<string, Partial<DaxLearningItem>> = {
  treatas: {
    category: 'Filter context',
    syntax: 'TREATAS(<table>, <column>[, <column>...])',
    parameter: 'table',
    parameterAccepts: 'Table expression',
    whatItDoes: 'Applies the result of a table expression as filters to columns from an unrelated table.',
    example: 'CALCULATE([Total Sales], TREATAS(VALUES(Targets[Category]), FactSales[Category]))'
  },
  userelationship: {
    category: 'Filter context',
    syntax: 'USERELATIONSHIP(<column1>, <column2>)',
    parameter: 'column1',
    parameterAccepts: 'Column name in inactive relationship',
    whatItDoes: 'Activates an inactive physical model relationship for the duration of the calculation.',
    example: 'CALCULATE([Total Sales], USERELATIONSHIP(FactSales[ShipDate], DimDate[Date]))'
  },
  crossfilter: {
    category: 'Filter context',
    syntax: 'CROSSFILTER(<column1>, <column2>, <direction>)',
    parameter: 'direction',
    parameterAccepts: 'Both, None, or OneWay',
    whatItDoes: 'Specifies the cross-filtering direction to be used in a calculation.',
    example: 'CALCULATE([Total Sales], CROSSFILTER(DimCustomer[ID], FactSales[CustID], Both))'
  },
  lookupvalue: {
    category: 'Virtual tables',
    syntax: 'LOOKUPVALUE(<result_column>, <search_column1>, <search_value1>[, ...])',
    parameter: 'result_column',
    parameterAccepts: 'Column to retrieve value from',
    whatItDoes: 'Returns the value for the row that satisfies all criteria specified by search conditions.',
    example: 'LOOKUPVALUE(DimCustomer[City], DimCustomer[ID], FactSales[CustomerID])'
  },
  window: {
    category: 'Iterators',
    syntax: 'WINDOW(<from>, <from_type>, <to>, <to_type>[, <relation>][, <orderBy>])',
    parameter: 'relation',
    parameterAccepts: 'Table expression',
    whatItDoes: 'Returns a window of rows within the partition defined by relative or absolute boundaries.',
    example: 'CALCULATE([Total Sales], WINDOW(1, ABS, 0, REL, ALLSELECTED(DimDate[Date]), ORDERBY(DimDate[Date], ASC)))'
  },
  index: {
    category: 'Virtual tables',
    syntax: 'INDEX(<position>[, <relation>][, <orderBy>][, <blanks>][, <partitionBy>])',
    parameter: 'position',
    parameterAccepts: 'Absolute (positive/negative) integer',
    whatItDoes: 'Returns a row at an absolute position within the specified partition.',
    example: 'CALCULATE([Total Sales], INDEX(1, ALLSELECTED(DimProduct[Category]), ORDERBY([Total Sales], DESC)))'
  },
  offset: {
    category: 'Virtual tables',
    syntax: 'OFFSET(<delta>[, <relation>][, <orderBy>][, <blanks>][, <partitionBy>])',
    parameter: 'delta',
    parameterAccepts: 'Relative integer shift',
    whatItDoes: 'Returns a row at an offset position relative to current row.',
    example: 'CALCULATE([Total Sales], OFFSET(-1, ALLSELECTED(DimDate[YearMonth]), ORDERBY(DimDate[YearMonth], ASC)))'
  },
  concatx: {
    category: 'Iterators',
    syntax: 'CONCATENATEX(<table>, <expression>[, <delimiter>][, <orderBy>])',
    parameter: 'expression',
    parameterAccepts: 'Scalar expression evaluated per row',
    whatItDoes: 'Evaluates an expression for each row in a table and concatenates the results.',
    example: 'CONCATENATEX(VALUES(DimProduct[Category]), DimProduct[Category], ", ")'
  },
  earlier: {
    category: 'Context inspection',
    syntax: 'EARLIER(<column>[, <number>])',
    parameter: 'column',
    parameterAccepts: 'Column in an outer evaluation row context',
    whatItDoes: 'Returns the value in that column from an earlier evaluation pass of that table.',
    example: 'COUNTROWS(FILTER(Sales, Sales[Amount] <= EARLIER(Sales[Amount])))'
  }
};

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
}

export interface AuditIssue {
  id: string;
  title: string;
  desc: string;
  severity: 'critical' | 'warning' | 'info';
  engineImpact: string;
}

export interface AuditResult {
  score: number;
  healthStatus: 'OPTIMAL' | 'MODERATE' | 'CRITICAL';
  engineBreakdown: {
    sePct: number;
    fePct: number;
    description: string;
  };
  issues: AuditIssue[];
  optimizedRewrite: string;
  rationale: string;
}

const AUDIT_PRESETS = [
  {
    label: '⚠️ Table in FILTER',
    code: `HighValueSales = 
CALCULATE(
    SUM(FactSales[SalesAmount]),
    FILTER(
        FactSales,
        FactSales[SalesAmount] > 1000
    )
)`
  },
  {
    label: '⚠️ Unsafe / Division',
    code: `GrossMarginPct = 
VAR Margin = [Total Revenue] - [Total Cost]
RETURN
    Margin / [Total Revenue]`
  },
  {
    label: '⚠️ Broken Matrix Subtotal',
    code: `AverageUnitPrice = 
AVERAGE(FactSales[UnitPrice])`
  },
  {
    label: '⚠️ SUMMARIZE Trap',
    code: `CategorySummary = 
SUMMARIZE(
    FactSales,
    DimProduct[Category],
    "SubtotalSales", SUM(FactSales[SalesAmount])
)`
  },
  {
    label: '⚠️ Overwrite Filter',
    code: `RedProductSales = 
CALCULATE(
    [Total Sales],
    DimProduct[Color] = "Red"
)`
  }
];

const analyzeDaxCode = (code: string): AuditResult => {
  const cleanCode = code.trim();
  const issues: AuditIssue[] = [];
  let score = 100;
  let optimizedRewrite = cleanCode;
  let rationale = '';

  // 1. Full Table in FILTER() anti-pattern
  const filterFactRegex = /FILTER\s*\(\s*(ALL\s*\(\s*)?([A-Za-z0-9_]*fact|[A-Za-z0-9_]*sales|[A-Za-z0-9_]*orders|[A-Za-z0-9_]*trans[a-z]*)\b/i;
  const filterTableRegex = /FILTER\s*\(\s*ALL\s*\(\s*([A-Za-z0-9_]+)\s*\)/i;
  
  if (filterFactRegex.test(cleanCode) || (filterTableRegex.test(cleanCode) && !cleanCode.includes('['))) {
    issues.push({
      id: 'fact-in-filter',
      title: 'Full Fact Table Passed to FILTER()',
      desc: 'Passing an entire table to FILTER forces VertiPaq into unindexed, row-by-row iteration in the single-threaded Formula Engine (FE).',
      severity: 'critical',
      engineImpact: 'Forces Formula Engine single-threaded scan across all rows'
    });
    score -= 40;
  }

  // 2. Raw '/' Division instead of DIVIDE()
  const linesWithoutComments = cleanCode
    .split('\n')
    .filter(l => !l.trim().startsWith('--'))
    .join('\n');
  const slashDivRegex = /(?<!\/|\*)\/(?!\/|\*)/;
  if (slashDivRegex.test(linesWithoutComments)) {
    issues.push({
      id: 'raw-division',
      title: 'Unsafe Division Operator (/)',
      desc: 'Raw "/" produces NaN or division-by-zero crashes when the denominator is 0 or BLANK. Always use DIVIDE().',
      severity: 'warning',
      engineImpact: 'Breaks error suppression; crashes visuals or generates NaN cards'
    });
    score -= 20;
  }

  // 3. SUMMARIZE with Aggregations Trap
  const summarizeAggRegex = /SUMMARIZE\s*\([^,]+,\s*[^,]+,\s*["'][^"']+["']\s*,\s*(SUM|COUNT|AVERAGE|MIN|MAX|CALCULATE)\b/i;
  if (summarizeAggRegex.test(cleanCode)) {
    issues.push({
      id: 'summarize-agg-trap',
      title: 'Deprecated SUMMARIZE with Aggregated Metrics',
      desc: 'Adding measures directly inside SUMMARIZE causes cluster-calculation bugs in totals. Deprecated by Microsoft since 2016.',
      severity: 'critical',
      engineImpact: 'Causes wrong subtotal rollups; use SUMMARIZECOLUMNS or ADDCOLUMNS(SUMMARIZE(...))'
    });
    score -= 35;
  }

  // 4. Matrix Subtotal Trap (AVERAGE on fact column without weighting)
  const averageFactRegex = /AVERAGE\s*\(\s*([A-Za-z0-9_]+\[[A-Za-z0-9_]+\])\s*\)/i;
  if (averageFactRegex.test(cleanCode) && !cleanCode.includes('HASONEVALUE') && !cleanCode.includes('ISINSCOPE') && !cleanCode.includes('DIVIDE')) {
    issues.push({
      id: 'matrix-subtotal-distortion',
      title: 'Matrix Subtotal Distortion Risk',
      desc: 'Simple AVERAGE() inside matrix visuals calculates overall transaction average at the subtotal row rather than averaging the visible rows.',
      severity: 'warning',
      engineImpact: 'Subtotal row shows inaccurate overall ratio instead of row-weighted metric'
    });
    score -= 20;
  }

  // 5. Missing KEEPFILTERS on Column Overwrites
  const filterOverwriteRegex = /CALCULATE\s*\([^,]+,\s*['"]?[A-Za-z0-9_]+['"]?\[[A-Za-z0-9_]+\]\s*=\s*[^,)]+\)/i;
  if (filterOverwriteRegex.test(cleanCode) && !cleanCode.includes('KEEPFILTERS')) {
    issues.push({
      id: 'missing-keepfilters',
      title: 'Filter Overwrite Hazard (Missing KEEPFILTERS)',
      desc: 'Direct column predicate "Table[Col] = value" silently generates FILTER(ALL(Col)), overriding external visual slicers on that column.',
      severity: 'info',
      engineImpact: 'Slicers overridden; wrap in KEEPFILTERS() to intersect instead of overwrite'
    });
    score -= 10;
  }

  // 6. EARLIER() Legacy Keyword
  if (/\bEARLIER\b/i.test(cleanCode)) {
    issues.push({
      id: 'earlier-legacy',
      title: 'Legacy EARLIER() Function',
      desc: 'EARLIER() forces multiple full table scans and is deprecated in modern DAX in favor of variables (VAR).',
      severity: 'warning',
      engineImpact: 'Forces quadratic table scans O(N^2); refactor with VAR or OFFSET()'
    });
    score -= 25;
  }

  // Ensure score bounds
  score = Math.max(15, Math.min(100, score));

  // Determine Grade & Engine Breakdown
  let healthStatus: 'OPTIMAL' | 'MODERATE' | 'CRITICAL' = 'OPTIMAL';
  let sePct = 90;
  let fePct = 10;
  let engineDesc = 'Dominant Storage Engine execution. Near-instant VertiPaq in-memory scan.';

  if (score < 60) {
    healthStatus = 'CRITICAL';
    sePct = 25;
    fePct = 75;
    engineDesc = 'Heavy Formula Engine bottleneck. Single-threaded unindexed row evaluation.';
  } else if (score < 85) {
    healthStatus = 'MODERATE';
    sePct = 60;
    fePct = 40;
    engineDesc = 'Hybrid execution. Moderate FE transition overhead or subtotal computation.';
  }

  // Generate Senior Rewrite
  if (issues.some(i => i.id === 'fact-in-filter')) {
    const dynamicFilterFix = cleanCode.replace(
      /FILTER\s*\(\s*(?:ALL\s*\(\s*)?['"]?([A-Za-z0-9_ ]+)['"]?\s*,\s*([^)]+)\)/i,
      'KEEPFILTERS($2)'
    );
    if (dynamicFilterFix !== cleanCode) {
      optimizedRewrite = `-- ⚡ Senior Production Rewrite (VertiPaq Optimized):\n${dynamicFilterFix}`;
    } else {
      optimizedRewrite = `-- ⚡ Senior Production Rewrite (VertiPaq Optimized):
-- Replaced full fact table FILTER with column predicate or KEEPFILTERS
Optimized High Sales = 
CALCULATE(
    SUM(FactSales[SalesAmount]),
    KEEPFILTERS(FactSales[SalesAmount] > 1000)
)`;
    }
    rationale = 'Passing a column predicate allows VertiPaq to execute multi-threaded bitmask filtering in the Storage Engine (SE), skipping Formula Engine materialization.';
  } else if (issues.some(i => i.id === 'summarize-agg-trap')) {
    const dynamicSummarizeFix = cleanCode.replace(/\bSUMMARIZE\b/i, 'SUMMARIZECOLUMNS');
    optimizedRewrite = `-- ⚡ Senior Production Rewrite (SUMMARIZECOLUMNS):\n${dynamicSummarizeFix}`;
    rationale = 'SUMMARIZECOLUMNS computes subtotals accurately and pushes aggregations directly down into the Storage Engine.';
  } else if (issues.some(i => i.id === 'raw-division')) {
    const dynamicDivFix = cleanCode.replace(
      /(RETURN\s+|=|\n\s*)([A-Za-z0-9_\[\]() -]+?)\s*\/\s*([A-Za-z0-9_\[\]() ]+)/i,
      '$1DIVIDE($2, $3, 0)'
    );
    if (dynamicDivFix !== cleanCode) {
      optimizedRewrite = `-- ⚡ Senior Production Rewrite (Safe Division):\n${dynamicDivFix}`;
    } else {
      optimizedRewrite = `-- ⚡ Senior Production Rewrite (Safe Division):
Safe Measure = 
VAR Margin = [Total Revenue] - [Total Cost]
RETURN
    DIVIDE(Margin, [Total Revenue], 0)`;
    }
    rationale = 'DIVIDE handles 0 and BLANK gracefully, eliminating NaN cards and protecting downstream visuals.';
  } else if (issues.some(i => i.id === 'matrix-subtotal-distortion')) {
    const measureNameMatch = cleanCode.match(/^([^=]+)=/);
    const mName = measureNameMatch ? measureNameMatch[1].trim() : 'Corrected Average';
    optimizedRewrite = `-- ⚡ Senior Production Rewrite (Matrix Subtotal Corrected):
${mName} = 
VAR IsSubtotal = NOT(HASONEVALUE(DimProduct[ProductName]))
RETURN
    IF(
        IsSubtotal,
        -- Subtotal Line: force row iteration over visible dimension
        SUMX(
            VALUES(DimProduct[ProductName]),
            [RowLevelPrice]
        ),
        -- Normal Row Line:
        [RowLevelPrice]
    )`;
    rationale = 'Detects the Subtotal row with HASONEVALUE and re-aggregates visible values with SUMX, ensuring matrix totals match visual rows.';
  } else if (issues.some(i => i.id === 'missing-keepfilters')) {
    optimizedRewrite = cleanCode.replace(
      /([A-Za-z0-9_]+\[[A-Za-z0-9_]+\]\s*=\s*[^,)]+)/i,
      'KEEPFILTERS($1)'
    );
    rationale = 'KEEPFILTERS preserves existing visual and slicer filters on this column instead of clearing them with ALL().';
  } else {
    optimizedRewrite = cleanCode;
    rationale = 'Measure structure adheres to enterprise best practices. Execution is optimized for the VertiPaq engine with no Formula Engine bottlenecks detected.';
  }

  return {
    score,
    healthStatus,
    engineBreakdown: {
      sePct,
      fePct,
      description: engineDesc
    },
    issues,
    optimizedRewrite,
    rationale
  };
};

export const DaxMasteryTracker: React.FC = () => {
  // Copilot panel visibility (Saved to localStorage)
  const [isCopilotOpen, setIsCopilotOpen] = useState<boolean>(() => {
    return localStorage.getItem('myces_dax_copilot_open') !== 'false';
  });

  const toggleCopilot = () => {
    setIsCopilotOpen(prev => {
      const next = !prev;
      localStorage.setItem('myces_dax_copilot_open', String(next));
      return next;
    });
  };

  // Active view tab (Functions catalog removed)
  const [activeTab, setActiveTab] = useState<'tracker' | 'recipes' | 'pbi'>('tracker');

  // Custom User-Added Learning Tracker Items
  const CUSTOM_TRACKER_STORAGE_KEY = 'dax_custom_learning_items_v1';
  const [customTrackerItems, setCustomTrackerItems] = useState<DaxLearningItem[]>(() => {
    try {
      const raw = localStorage.getItem(CUSTOM_TRACKER_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // DAX Learning Tracker Storage & State
  const TRACKER_STORAGE_KEY = 'dax_learning_tracker_status_v1';
  const [trackerStatusMap, setTrackerStatusMap] = useState<Record<string, 'Completed' | 'Introduced/Practiced' | 'Planned'>>(() => {
    try {
      const raw = localStorage.getItem(TRACKER_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const setTrackerStatus = (id: string, status: 'Completed' | 'Introduced/Practiced' | 'Planned') => {
    const updated = { ...trackerStatusMap, [id]: status };
    setTrackerStatusMap(updated);
    try {
      localStorage.setItem(TRACKER_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save DAX tracker status', e);
    }
  };

  // Learning Tracker Filters
  const [trackerSearchQuery, setTrackerSearchQuery] = useState('');
  const [trackerCategoryFilter, setTrackerCategoryFilter] = useState('ALL');
  const [trackerStatusFilter, setTrackerStatusFilter] = useState('ALL');
  const [trackerGrouping, setTrackerGrouping] = useState<'flat' | 'grouped'>('flat');

  // Add Item Modal & Form State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAiFilling, setIsAiFilling] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [newItemForm, setNewItemForm] = useState<{
    functionName: string;
    category: string;
    parameter: string;
    parameterAccepts: string;
    whatItDoes: string;
    syntax: string;
    example: string;
    status: 'Completed' | 'Introduced/Practiced' | 'Planned';
  }>({
    functionName: '',
    category: 'Filter context',
    parameter: '',
    parameterAccepts: '',
    whatItDoes: '',
    syntax: '',
    example: '',
    status: 'Planned'
  });

  // Copy indicator
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Tab 2: Smart Recipes Studio parameters & state
  const [recipeParams, setRecipeParams] = useState({
    factTable: 'FactSales',
    metricCol: 'SalesAmount',
    dateTable: 'DimDate',
    dateCol: 'Date',
    dimTable: 'DimProduct'
  });
  const [isParamsOpen, setIsParamsOpen] = useState(true);
  const [recipeModeMap, setRecipeModeMap] = useState<Record<string, 'senior' | 'naive'>>({});
  const [showSimMap, setShowSimMap] = useState<Record<string, boolean>>({});

  // Dynamic Parameter Replacement Helper
  const formatRecipeCode = (template: string) => {
    return template
      .replaceAll('{{FACT}}', recipeParams.factTable || 'FactSales')
      .replaceAll('{{METRIC}}', recipeParams.metricCol || 'SalesAmount')
      .replaceAll('{{DATE_TABLE}}', recipeParams.dateTable || 'DimDate')
      .replaceAll('{{DATE_COL}}', recipeParams.dateCol || 'Date')
      .replaceAll('{{DIM_TABLE}}', recipeParams.dimTable || 'DimProduct');
  };

  // Copilot Subtabs: 'chat' | 'audit'
  const [copilotSubTab, setCopilotSubTab] = useState<'chat' | 'audit'>('chat');
  
  // Auditor State
  const [auditInput, setAuditInput] = useState(`HighValueSales = 
CALCULATE(
    SUM(FactSales[SalesAmount]),
    FILTER(
        FactSales,
        FactSales[SalesAmount] > 1000
    )
)`);
  const [auditResult, setAuditResult] = useState<AuditResult | null>(() => {
    return analyzeDaxCode(`HighValueSales = 
CALCULATE(
    SUM(FactSales[SalesAmount]),
    FILTER(
        FactSales,
        FactSales[SalesAmount] > 1000
    )
)`);
  });
  const [isAuditing, setIsAuditing] = useState(false);

  const runDaxAudit = (codeToAudit?: string) => {
    const code = (codeToAudit !== undefined ? codeToAudit : auditInput).trim();
    if (!code) return;
    setIsAuditing(true);
    setTimeout(() => {
      const result = analyzeDaxCode(code);
      setAuditResult(result);
      setIsAuditing(false);
    }, 150);
  };

  const handleSendRecipeToAudit = (code: string) => {
    setAuditInput(code);
    if (!isCopilotOpen) setIsCopilotOpen(true);
    setCopilotSubTab('audit');
    setAiAuditReview(null);
    runDaxAudit(code);
  };

  // AI Deep Audit State & Handler
  const [aiAuditReview, setAiAuditReview] = useState<string | null>(null);
  const [isAiAuditing, setIsAiAuditing] = useState(false);

  const runAiDeepAudit = async () => {
    const code = auditInput.trim();
    if (!code || isAiAuditing) return;
    setIsAiAuditing(true);
    setAiAuditReview(null);

    try {
      const prompt = `You are an elite Senior DAX Architect & VertiPaq Performance Engineer.
Perform an architectural audit of this DAX measure:
\`\`\`DAX
${code}
\`\`\`

Strictly under 120 words. Output in 3 sections:
1. 🏎️ **Storage Engine (SE) vs Formula Engine (FE):** (1-2 sentences on VertiPaq performance impact)
2. ⚠️ **Identified Anti-Patterns & Traps:** (Specific performance or subtotal traps)
3. ⚡ **Optimized Senior DAX Rewrite:** (One clean copyable code block)
Be direct and authoritative.`;

      const reply = await copilotService.generateResponse(prompt);
      setAiAuditReview(reply);
    } catch (err: any) {
      console.warn('[DEXer Copilot] AI deep audit error:', err);
      setAiAuditReview(`⚠️ **AI Audit Notice:** Unable to reach AI API with current MyCES key. 
Please ensure your Groq or Gemini API key is configured in the AI Settings (🔑 in sidebar). 
The static rule-based audit results above are 100% active and running locally.`);
    } finally {
      setIsAiAuditing(false);
    }
  };

  // Chatbot State
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      sender: 'bot',
      text: "⚡ **DEXer Copilot Ready.**\n\nAsk for any formula or pattern. Answers are **short, practical flashcards**.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isBotThinking, setIsBotThinking] = useState(false);
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isBotThinking]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Learning Tracker Metrics & State
  const allTrackerItems = [...DAX_LEARNING_TRACKER_DATA, ...customTrackerItems];
  const trackerTotalCount = allTrackerItems.length;
  let trackerCompletedCount = 0;
  let trackerPracticedCount = 0;
  let trackerPlannedCount = 0;

  allTrackerItems.forEach(item => {
    const s = trackerStatusMap[item.id] || item.status;
    if (s === 'Completed') trackerCompletedCount++;
    else if (s === 'Introduced/Practiced') trackerPracticedCount++;
    else trackerPlannedCount++;
  });

  const trackerCompletionPct = trackerTotalCount > 0 
    ? Math.round((trackerCompletedCount / trackerTotalCount) * 100) 
    : 0;

  // Learning Tracker Filtered List
  const filteredTrackerItems = allTrackerItems.filter(item => {
    const s = trackerStatusMap[item.id] || item.status;
    if (trackerCategoryFilter !== 'ALL' && item.category !== trackerCategoryFilter) return false;
    if (trackerStatusFilter !== 'ALL' && s !== trackerStatusFilter) return false;

    if (trackerSearchQuery.trim()) {
      const q = trackerSearchQuery.trim().toLowerCase();
      return (
        item.functionName.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.parameter.toLowerCase().includes(q) ||
        item.parameterAccepts.toLowerCase().includes(q) ||
        item.whatItDoes.toLowerCase().includes(q) ||
        item.syntax.toLowerCase().includes(q) ||
        item.example.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const TRACKER_CATEGORIES = Array.from(new Set(allTrackerItems.map(d => d.category)));

  // AI Auto-Fill Helper for Learning Tracker
  const fetchAiDetailsForFunction = async (funcName: string, categoryHint?: string, paramHint?: string) => {
    const cleanName = funcName.trim().toUpperCase().replace(/\(\)$/, '');
    const lower = cleanName.toLowerCase();

    // 1. Try AI via copilotService
    try {
      const prompt = `You are a World-Class Senior DAX Architect & VertiPaq Performance Engineer.
Provide parameter specifications for the DAX function "${cleanName}".
${paramHint ? `Focus on this parameter: "${paramHint}".` : 'Provide the primary parameter of this function.'}
${categoryHint && categoryHint !== 'ALL' ? `Preferred category: "${categoryHint}".` : ''}

Respond with ONLY a raw JSON object (no markdown, no backticks, no extra text) matching this schema:
{
  "category": "One of: Aggregation | Blank handling | Logic | Filter context | Context inspection | Iterators | Virtual tables | Time intelligence | Date functions | Variables",
  "syntax": "${cleanName}(<param1>[, <param2>...])",
  "parameter": "${paramHint || 'parameter name e.g. column, table, expression, date'}",
  "parameterAccepts": "what this parameter accepts e.g. Table expression, Date column, Scalar expression",
  "whatItDoes": "one crisp sentence explaining what this parameter or function does",
  "example": "clean copyable DAX example e.g. CALCULATE([Total Sales], ${cleanName}(...))"
}`;

      const res = await copilotService.generateResponse(prompt);
      const jsonMatch = res.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          category: parsed.category || 'Filter context',
          syntax: parsed.syntax || `${cleanName}()`,
          parameter: parsed.parameter || 'expression',
          parameterAccepts: parsed.parameterAccepts || 'Scalar expression',
          whatItDoes: parsed.whatItDoes || `Evaluates ${cleanName} in data model.`,
          example: parsed.example || `${cleanName}()`
        };
      }
    } catch (err) {
      console.warn('[DEXer Tracker] AI auto-fill error, using smart fallback engine:', err);
    }

    // 2. Built-in smart defaults dictionary
    if (SMART_DAX_DEFAULTS[lower]) {
      const d = SMART_DAX_DEFAULTS[lower];
      return {
        category: d.category || 'Filter context',
        syntax: d.syntax || `${cleanName}()`,
        parameter: d.parameter || 'expression',
        parameterAccepts: d.parameterAccepts || 'Scalar expression',
        whatItDoes: d.whatItDoes || `Evaluates ${cleanName}.`,
        example: d.example || `${cleanName}()`
      };
    }

    // 3. Programmatic fallback
    return {
      category: categoryHint && categoryHint !== 'ALL' ? categoryHint : 'Filter context',
      syntax: `${cleanName}(<expression>)`,
      parameter: paramHint || 'expression',
      parameterAccepts: 'Scalar expression',
      whatItDoes: `Evaluates ${cleanName} in current filter and row context.`,
      example: `CALCULATE([Total Sales], ${cleanName}(...))`
    };
  };

  const handleAutoFillForm = async () => {
    if (!newItemForm.functionName.trim()) {
      setFormError('Please enter a Function Name first so AI knows what to inspect.');
      return;
    }
    setFormError(null);
    setIsAiFilling(true);

    try {
      const details = await fetchAiDetailsForFunction(
        newItemForm.functionName,
        newItemForm.category,
        newItemForm.parameter
      );

      setNewItemForm(prev => ({
        ...prev,
        category: prev.category || details.category,
        syntax: prev.syntax || details.syntax,
        parameter: prev.parameter || details.parameter,
        parameterAccepts: prev.parameterAccepts || details.parameterAccepts,
        whatItDoes: prev.whatItDoes || details.whatItDoes,
        example: prev.example || details.example
      }));
    } finally {
      setIsAiFilling(false);
    }
  };

  const handleSaveNewItem = async () => {
    const rawName = newItemForm.functionName.trim().toUpperCase().replace(/\(\)$/, '');
    if (!rawName) {
      setFormError('Function Name is mandatory.');
      return;
    }

    setFormError(null);
    setIsAiFilling(true);

    let category = newItemForm.category.trim();
    let syntax = newItemForm.syntax.trim();
    let parameter = newItemForm.parameter.trim();
    let parameterAccepts = newItemForm.parameterAccepts.trim();
    let whatItDoes = newItemForm.whatItDoes.trim();
    let example = newItemForm.example.trim();

    // If any optional fields are not provided by user, AI fills them automatically!
    if (!category || !syntax || !parameter || !parameterAccepts || !whatItDoes || !example) {
      const aiGenerated = await fetchAiDetailsForFunction(rawName, category, parameter);
      if (!category) category = aiGenerated.category;
      if (!syntax) syntax = aiGenerated.syntax;
      if (!parameter) parameter = aiGenerated.parameter;
      if (!parameterAccepts) parameterAccepts = aiGenerated.parameterAccepts;
      if (!whatItDoes) whatItDoes = aiGenerated.whatItDoes;
      if (!example) example = aiGenerated.example;
    }

    const newItem: DaxLearningItem = {
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      category: category || 'Filter context',
      functionName: `${rawName}()`,
      status: newItemForm.status,
      syntax: syntax || `${rawName}()`,
      parameter: parameter || 'expression',
      parameterAccepts: parameterAccepts || 'Scalar expression',
      whatItDoes: whatItDoes || `Evaluates ${rawName} in calculation context.`,
      example: example || `${rawName}()`
    };

    const updatedCustom = [newItem, ...customTrackerItems];
    setCustomTrackerItems(updatedCustom);
    try {
      localStorage.setItem(CUSTOM_TRACKER_STORAGE_KEY, JSON.stringify(updatedCustom));
    } catch (e) {
      console.error('Failed to save custom DAX item', e);
    }

    // Save initial status
    setTrackerStatus(newItem.id, newItemForm.status);

    setIsAiFilling(false);
    setIsAddModalOpen(false);
  };

  const handleDeleteCustomItem = (id: string) => {
    const updated = customTrackerItems.filter(item => item.id !== id);
    setCustomTrackerItems(updated);
    try {
      localStorage.setItem(CUSTOM_TRACKER_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to remove custom DAX item', e);
    }
  };

  const handleExportMarkdownTable = () => {
    const header = `| Category | Function | Status | Syntax | Parameter | What the parameter accepts | What it does | Example |\n| --- | --- | --- | --- | --- | --- | --- | --- |`;
    const rows = filteredTrackerItems.map(item => {
      const s = trackerStatusMap[item.id] || item.status;
      return `| ${item.category} | \`${item.functionName}\` | ${s} | \`${item.syntax}\` | ${item.parameter} | ${item.parameterAccepts} | ${item.whatItDoes} | \`${item.example}\` |`;
    }).join('\n');
    const md = `${header}\n${rows}`;
    navigator.clipboard.writeText(md);
    setCopiedId('tracker-markdown-export');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAskAboutTrackerParam = (item: DaxLearningItem) => {
    handleSendMessage(`Explain the parameter "${item.parameter}" in DAX function ${item.functionName}. What does it accept, how does it evaluate in filter/row context, and what are real-world gotchas?`);
  };

  // Bite-sized, practical local DAX responses
  // Bite-sized, practical local DAX responses
  const generateDaxLocalResponse = (query: string): string => {
    const q = query.toLowerCase().trim();

    // 1. Context Transition
    if (q.includes('context transition') || (q.includes('transition') && q.includes('context'))) {
      return `🎯 **Purpose:** Context transition converts the active **Row Context** into an equivalent **Filter Context**, filtering the model by the column values of the current row.

⚡ **Formula:**
\`\`\`DAX
-- Calling a measure inside SUMX automatically triggers context transition
Average Sales per Product = 
AVERAGEX(
    VALUES(DimProduct[ProductID]),
    [Total Sales] -- Measure is automatically wrapped in CALCULATE()
)
\`\`\`

⚠️ **Gotcha:** Inside iterators (\`SUMX\`, \`FILTER\`, \`ADDCOLUMNS\`), invoking a measure converts every column of the current row into filters, which can cause severe performance overhead on wide tables.`;
    }

    // 2. Row Context vs Filter Context
    if (q.includes('row context') && q.includes('filter context')) {
      return `🎯 **Difference:**
* **Filter Context:** Filters what data is visible to the entire model (created by slicers, matrix row/col headers, and \`CALCULATE\`).
* **Row Context:** Iterates row-by-row through a table (created by calculated columns and iterators like \`SUMX\`).

⚡ **Key Insight:** Row context does NOT filter other tables or relationships until **Context Transition** is triggered via \`CALCULATE\`.

⚠️ **Gotcha:** A common junior trap is expecting a calculated column or \`SUMX\` row context to automatically filter related fact tables without \`RELATED\` or \`CALCULATE\`.`;
    }

    // 3. Matrix Subtotal Trap / Wrong Total
    if (q.includes('subtotal') || q.includes('wrong total') || q.includes('matrix total') || q.includes('total row')) {
      return `🎯 **Purpose:** Corrects totals in matrix visuals when averaging rates or percentages instead of summing.

⚡ **Formula (Weighted Matrix Total):**
\`\`\`DAX
Corrected Metric = 
VAR IsSubtotalLevel = NOT(HASONEVALUE(DimProduct[ProductName]))
RETURN
    IF(
        IsSubtotalLevel,
        SUMX(VALUES(DimProduct[ProductName]), [RowLevelMeasure]),
        [RowLevelMeasure]
    )
\`\`\`

⚠️ **Gotcha:** Power BI totals do NOT sum the visible rows above them; they re-evaluate the measure over the entire unfiltered visual grain. Use \`SUMX(VALUES(...))\` to force row-level aggregation at the total line.`;
    }

    // 4. Cumulative / Running Total
    if (q.includes('cumulative') || q.includes('running total') || q.includes('beside each row') || q.includes('running sum')) {
      return `🎯 **Purpose:** Calculates running cumulative sales up to the current row or date.

⚡ **Option 1: Beside Each Table Row (By Transaction / Row ID):**
\`\`\`DAX
Cumulative Sales = 
VAR CurrentRow = MAX(FactSales[SalesID])
RETURN
    CALCULATE(
        [Total Sales],
        FILTER(
            ALLSELECTED(FactSales[SalesID]),
            FactSales[SalesID] <= CurrentRow
        )
    )
\`\`\`

⚡ **Option 2: Modern Native WINDOW Function (2024+):**
\`\`\`DAX
Cumulative Sales = 
CALCULATE(
    [Total Sales],
    WINDOW(1, ABS, 0, REL, ALLSELECTED(DimDate[Date]), ORDERBY(DimDate[Date], ASC))
)
\`\`\`

⚠️ **Gotcha:** Always use \`ALLSELECTED\` (not \`ALL\`) so the running total respects external slicers (e.g. Year or Category).`;
    }

    // 5. Month over Month (MoM)
    if (q.includes('mom') || q.includes('month over month') || q.includes('previous month') || q.includes('prior month')) {
      return `🎯 **Purpose:** Prior month sales and growth % using native \`OFFSET\`.

⚡ **Formula:**
\`\`\`DAX
Sales PM = 
CALCULATE(
    [Total Sales],
    OFFSET(-1, ALLSELECTED(DimDate[YearMonth], DimDate[MonthNumber]), ORDERBY(DimDate[MonthNumber], ASC))
)

MoM Growth % = DIVIDE([Total Sales] - [Sales PM], [Sales PM])
\`\`\`

⚠️ **Gotcha:** The relation argument in \`OFFSET\` must include all columns used in your visual group-by and ordering.`;
    }

    // 6. Year over Year (YoY)
    if (q.includes('yoy') || q.includes('year over year') || q.includes('prior year') || q.includes('same period last year')) {
      return `🎯 **Purpose:** Calculates comparison against the same date period in the previous year.

⚡ **Formula:**
\`\`\`DAX
Sales PY = 
CALCULATE(
    [Total Sales],
    SAMEPERIODLASTYEAR(DimDate[Date])
)

YoY Growth % = DIVIDE([Total Sales] - [Sales PY], [Sales PY])
\`\`\`

⚠️ **Gotcha:** Requires an unbroken contiguous Date table marked as an **Official Date Table** in Power BI Desktop.`;
    }

    // 7. ALL vs ALLSELECTED vs ALLEXCEPT
    if (q.includes('all vs allselected') || (q.includes('all') && q.includes('allselected')) || q.includes('allexcept')) {
      return `🎯 **Difference:**
* \`ALL(Table)\`: Clears **all** filters (visual row headers + external slicers). Use for % of Grand Total.
* \`ALLSELECTED(Table)\`: Clears visual headers but **preserves external slicers**. Use for % of Visible Visual Total.
* \`ALLEXCEPT(Table, Col)\`: Clears all filters on the table **except** the specified column.

⚡ **Formula:**
\`\`\`DAX
% of Selected Visual = 
DIVIDE([Total Sales], CALCULATE([Total Sales], ALLSELECTED(DimProduct)))
\`\`\`

⚠️ **Gotcha:** Prefer specifying column names in \`ALLSELECTED(DimProduct[Category])\` over the entire table to prevent unintended subtotal blowouts.`;
    }

    // 8. SUM vs SUMX
    if ((q.includes('sum') && q.includes('sumx')) || q.includes('sum vs sumx')) {
      return `🎯 **Difference:**
* \`SUM(Column)\`: Pure Storage Engine aggregation. Extremely fast, multi-threaded in-memory scan.
* \`SUMX(Table, Expression)\`: Iterator that evaluates an expression row-by-row in the Formula Engine.

⚡ **Formula:**
\`\`\`DAX
-- SUMX required when multiplying columns row-by-row
Total Revenue = 
SUMX(FactSales, FactSales[Quantity] * FactSales[UnitPrice])
\`\`\`

⚠️ **Gotcha:** Never write \`SUMX(FactSales, [MyMeasure])\` unless necessary — calling a measure inside \`SUMX\` invokes context transition on every single row!`;
    }

    // 9. DIVIDE vs /
    if (q.includes('divide') && (q.includes('/') || q.includes('division'))) {
      return `🎯 **Difference:**
* \`DIVIDE(num, denom[, alt])\`: Safe division. Returns \`BLANK()\` (or alternate fallback) on zero or blank denominator.
* \`/\`: Raw division. Throws \`NaN\` or crashes visuals when denominator is 0.

⚡ **Formula:**
\`\`\`DAX
Profit Margin = DIVIDE([Total Profit], [Total Revenue], 0)
\`\`\`

⚠️ **Gotcha:** In production Power BI reports, always use \`DIVIDE()\` to guarantee cards and matrices never display unsightly \`NaN\` or errors.`;
    }

    // 10. Dynamic Top N
    if (q.includes('top n') || q.includes('top 5') || q.includes('top 10') || q.includes('rank')) {
      return `🎯 **Purpose:** Dynamically filters the top N entities while preserving external visual filters.

⚡ **Formula:**
\`\`\`DAX
Top 5 Customers Sales = 
CALCULATE(
    [Total Sales],
    KEEPFILTERS(
        TOPN(5, ALLSELECTED(DimCustomer[CustomerName]), [Total Sales], DESC)
    )
)
\`\`\`

⚠️ **Gotcha:** Always wrap the \`TOPN\` table filter in \`KEEPFILTERS()\` inside \`CALCULATE\` to preserve cross-filtering from other visuals.`;
    }

    // 11. Dynamic RLS
    if (q.includes('rls') || q.includes('security') || q.includes('userprincipalname')) {
      return `🎯 **Purpose:** Filters rows to match the logged-in user's Azure AD email.

⚡ **Formula (in Manage Roles):**
\`\`\`DAX
[UserEmail] = USERPRINCIPALNAME()
\`\`\`

⚠️ **Gotcha:** In Power BI Desktop, test this via **Modeling → View As Roles**. Ensure the User Email column matches Entra ID (Azure AD) UserPrincipalName format.`;
    }

    // 12. Check if a specific function name from tracker is mentioned with word boundary
    const words = q.split(/[^a-z0-9_]+/).filter(w => w.length >= 3);
    for (const w of words) {
      const match = allTrackerItems.find(f => f.functionName.toLowerCase().replace(/\(\)$/, '') === w);
      if (match) {
        return `🎯 **Purpose of ${match.functionName}:**
${match.whatItDoes}

⚡ **Formula & Syntax:**
\`\`\`DAX
-- Parameter: ${match.parameter} (${match.parameterAccepts})
${match.syntax}
\`\`\`

💡 **Example:**
\`\`\`DAX
${match.example}
\`\`\``;
      }
    }

    // 13. Smart Fallback for general queries
    return `🎯 **Purpose:** Practical DAX pattern for "${query}".

⚡ **Production Formula:**
\`\`\`DAX
Optimized Measure = 
VAR CurrentSelection = SELECTEDVALUE(DimProduct[CategoryName])
VAR TotalBaseline = 
    CALCULATE(
        [Total Sales],
        ALLSELECTED(DimProduct)
    )
RETURN
    DIVIDE([Total Sales], TotalBaseline, 0)
\`\`\`

⚠️ **Senior Gotcha:**
* Always use \`DIVIDE()\` with a safe default.
* Ensure filters use \`KEEPFILTERS()\` to intersect instead of overwrite.
* Test matrix subtotal behavior with \`HASONEVALUE()\` or \`ISINSCOPE()\`.`;
  };

  // Chat message submission
  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || chatInput).trim();
    if (!query || isBotThinking) return;

    if (!isCopilotOpen) setIsCopilotOpen(true);

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsBotThinking(true);

    const qLower = query.toLowerCase().trim();

    // 1. Exact tracker function lookup (e.g. clicking bot on tracker, or typing "CALCULATE", "how to use divide")
    const exactFunc = allTrackerItems.find(f => {
      const name = f.functionName.toLowerCase().replace(/\(\)$/, '');
      const pattern = new RegExp(`^(what is|how to use|about|explain)?\\s*${name}\\s*(\\(\\))?$`, 'i');
      return pattern.test(qLower) || qLower === name;
    });

    if (exactFunc) {
      const flashcard = `🎯 **Purpose (${exactFunc.functionName}):**
${exactFunc.whatItDoes}

⚡ **Syntax & Parameter:**
\`\`\`DAX
-- Category: ${exactFunc.category} | Parameter: ${exactFunc.parameter} (${exactFunc.parameterAccepts})
${exactFunc.syntax}
\`\`\`

💡 **Example:**
\`\`\`DAX
${exactFunc.example}
\`\`\``;

      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          text: flashcard,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
        setIsBotThinking(false);
      }, 100);
      return;
    }

    // 2. All questions, recipes, scenarios -> Route to AI Copilot
    try {
      const prompt = `You are DEXer, an elite Senior DAX Architect & Power BI Performance Engineer.
The user is asking: "${query}"

MANDATORY RULES:
- STRICT MAXIMUM: 80 to 120 words total!
- DO NOT write long essays, conversational fluff, greetings, or sign-offs.
- Structure your answer strictly in these 3 sections:
  1. 🎯 **Purpose / Concept:** (1-2 clear, authoritative sentences explaining the logic and filter context)
  2. ⚡ **Formula:** (One clean, copyable production DAX code block with clear table/column names)
  3. ⚠️ **Gotcha:** (1-2 bullet points on real-world gotchas: context transition, subtotal bugs, or SE vs FE bottlenecks)
Make it punchy, practical, and senior-level.`;

      let botReply = '';
      try {
        botReply = await copilotService.generateResponse(prompt);
      } catch (aiErr) {
        console.warn('[DEXer Copilot] AI request error, using smart local fallback:', aiErr);
        botReply = generateDaxLocalResponse(query);
      }

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: botReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      console.error('[DEXer Copilot] Error in handleSendMessage:', err);
      const fallbackMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: generateDaxLocalResponse(query),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, fallbackMsg]);
    } finally {
      setIsBotThinking(false);
    }
  };

  return (
    <div className="dax-tracker-container">
      
      {/* 1. Header Card */}
      <div className="dax-header-card">
        <div className="dax-header-info">
          <div className="dax-badge-title">
            <Calculator size={15} />
            <span>MyCES DEXer Engine</span>
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0 }}>DEXer — DAX & Power BI Mastery</h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
            Structured DAX parameter & function learning tracker with AI auto-complete and DEXer Copilot.
          </p>
        </div>

        {/* Live Stats */}
        <div className="dax-header-stats">
          <div className="dax-stat-box">
            <div className="dax-stat-value" style={{ color: '#10b981' }}>
              {trackerCompletedCount}
            </div>
            <div className="dax-stat-label">Mastered</div>
          </div>
          <div className="dax-stat-box">
            <div className="dax-stat-value" style={{ color: '#f59e0b' }}>
              {trackerPracticedCount}
            </div>
            <div className="dax-stat-label">Practiced</div>
          </div>
          <div className="dax-stat-box">
            <div className="dax-stat-value" style={{ color: 'var(--accent-primary)' }}>
              {trackerCompletionPct}%
            </div>
            <div className="dax-stat-label">Mastery Rate</div>
          </div>
        </div>
      </div>

      {/* 2. Progress Bar */}
      <div className="dax-progress-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
          <span>Curriculum Progress</span>
          <span>
            {trackerCompletedCount} of {trackerTotalCount} Parameters & Syntax Items Mastered ({trackerCompletionPct}%)
          </span>
        </div>
        <div className="dax-progress-bar-bg">
          <div 
            className="dax-progress-bar-fill" 
            style={{ width: `${trackerCompletionPct}%` }} 
          />
        </div>
      </div>

      {/* 3. Navigation Toolbar + Copilot Toggle */}
      <div className="dax-top-toolbar">
        <div className="dax-nav-tabs">
          <button 
            className={`dax-nav-btn ${activeTab === 'tracker' ? 'active' : ''}`}
            onClick={() => setActiveTab('tracker')}
          >
            <GraduationCap size={15} />
            <span>Learning Tracker ({trackerTotalCount})</span>
          </button>
          <button 
            className={`dax-nav-btn ${activeTab === 'recipes' ? 'active' : ''}`}
            onClick={() => setActiveTab('recipes')}
          >
            <Layers size={15} />
            <span>DAX Recipes</span>
          </button>
          <button 
            className={`dax-nav-btn ${activeTab === 'pbi' ? 'active' : ''}`}
            onClick={() => setActiveTab('pbi')}
          >
            <ShieldCheck size={15} />
            <span>Power BI Skills Checklist</span>
          </button>
        </div>

        {/* Toggle Copilot Button */}
        <button 
          className={`dax-copilot-toggle-btn ${isCopilotOpen ? 'active' : ''}`}
          onClick={toggleCopilot}
          title="Toggle DEXer Copilot side panel"
        >
          <Bot size={15} />
          <span>{isCopilotOpen ? 'Hide DEXer' : 'Open DEXer Copilot'}</span>
        </button>
      </div>

      {/* 4. Full Width Main Area */}
      <div className="dax-main-area">

        {/* TAB 0: LEARNING TRACKER */}
        {activeTab === 'tracker' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Filter Bar */}
            <div className="dax-filter-bar">
              {/* Responsive Clutter-Free Search Input */}
              <div className="dax-search-box">
                <Search size={15} className="dax-search-icon" />
                <input 
                  type="text" 
                  placeholder="Search function, parameter, syntax, example..."
                  className="dax-search-input"
                  value={trackerSearchQuery}
                  onChange={(e) => setTrackerSearchQuery(e.target.value)}
                />
                {trackerSearchQuery && (
                  <button
                    type="button"
                    className="dax-search-clear-btn"
                    onClick={() => setTrackerSearchQuery('')}
                    title="Clear search"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Theme-Matching Category Select */}
              <select 
                value={trackerCategoryFilter} 
                onChange={(e) => setTrackerCategoryFilter(e.target.value)}
                className="dax-select-filter"
                title="Filter by Category"
              >
                <option value="ALL">All Categories ({TRACKER_CATEGORIES.length})</option>
                {TRACKER_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              {/* Theme-Matching Status Select */}
              <select 
                value={trackerStatusFilter} 
                onChange={(e) => setTrackerStatusFilter(e.target.value)}
                className="dax-select-filter"
                title="Filter by Status"
              >
                <option value="ALL">All Statuses ({trackerTotalCount})</option>
                <option value="Completed">🟢 Completed ({trackerCompletedCount})</option>
                <option value="Introduced/Practiced">🟡 Practiced ({trackerPracticedCount})</option>
                <option value="Planned">⚪ Planned ({trackerPlannedCount})</option>
              </select>

              {/* View Mode Toggle */}
              <div className="dax-view-toggle-bar">
                <button
                  type="button"
                  onClick={() => setTrackerGrouping('flat')}
                  className={`dax-view-toggle-btn ${trackerGrouping === 'flat' ? 'active' : 'inactive'}`}
                  title="Flat table with exact requested columns"
                >
                  Flat Table
                </button>
                <button
                  type="button"
                  onClick={() => setTrackerGrouping('grouped')}
                  className={`dax-view-toggle-btn ${trackerGrouping === 'grouped' ? 'active' : 'inactive'}`}
                  title="Grouped by DAX function"
                >
                  Grouped
                </button>
              </div>

              {/* Export Markdown Button */}
              <button
                type="button"
                onClick={handleExportMarkdownTable}
                className="dax-btn-toolbar-secondary"
                title="Copy current filtered items as a GitHub Markdown Table"
              >
                {copiedId === 'tracker-markdown-export' ? <Check size={13} color="#10b981" /> : <Download size={13} />}
                <span>{copiedId === 'tracker-markdown-export' ? 'Table Copied!' : 'Copy Markdown'}</span>
              </button>

              {/* Add Function Button */}
              <button
                type="button"
                onClick={() => {
                  setNewItemForm({
                    functionName: '',
                    category: trackerCategoryFilter !== 'ALL' ? trackerCategoryFilter : 'Filter context',
                    parameter: '',
                    parameterAccepts: '',
                    whatItDoes: '',
                    syntax: '',
                    example: '',
                    status: 'Planned'
                  });
                  setFormError(null);
                  setIsAddModalOpen(true);
                }}
                className="dax-btn-toolbar-primary"
                title="Add new DAX function or parameter to your learning tracker"
              >
                <Plus size={15} />
                <span>Add</span>
              </button>

              {(trackerSearchQuery || trackerCategoryFilter !== 'ALL' || trackerStatusFilter !== 'ALL') && (
                <button 
                  type="button"
                  onClick={() => {
                    setTrackerSearchQuery('');
                    setTrackerCategoryFilter('ALL');
                    setTrackerStatusFilter('ALL');
                  }}
                  className="dax-btn-toolbar-secondary"
                  style={{ color: 'var(--text-muted)', borderStyle: 'dashed' }}
                  title="Reset all filters"
                >
                  <RotateCcw size={12} />
                  <span>Reset</span>
                </button>
              )}
            </div>

            {/* Quick Category Filter Pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, marginRight: '0.2rem' }}>
                Categories:
              </span>
              <button
                type="button"
                className={`prompt-chip ${trackerCategoryFilter === 'ALL' ? 'active' : ''}`}
                style={{
                  fontSize: '0.68rem',
                  padding: '0.15rem 0.5rem',
                  background: trackerCategoryFilter === 'ALL' ? 'var(--accent-primary)' : undefined,
                  color: trackerCategoryFilter === 'ALL' ? '#fff' : undefined
                }}
                onClick={() => setTrackerCategoryFilter('ALL')}
              >
                All ({trackerTotalCount})
              </button>
              {TRACKER_CATEGORIES.map(cat => {
                const count = DAX_LEARNING_TRACKER_DATA.filter(d => d.category === cat).length;
                return (
                  <button
                    key={cat}
                    type="button"
                    className={`prompt-chip ${trackerCategoryFilter === cat ? 'active' : ''}`}
                    style={{
                      fontSize: '0.68rem',
                      padding: '0.15rem 0.5rem',
                      background: trackerCategoryFilter === cat ? 'var(--accent-primary)' : undefined,
                      color: trackerCategoryFilter === cat ? '#fff' : undefined
                    }}
                    onClick={() => setTrackerCategoryFilter(cat === trackerCategoryFilter ? 'ALL' : cat)}
                  >
                    {cat} ({count})
                  </button>
                );
              })}
            </div>

            {/* View 1: Flat Parameter Table */}
            {trackerGrouping === 'flat' ? (
              <div className="dax-table-wrapper">
                <div style={{ overflowX: 'auto' }}>
                  <table className="dax-table">
                    <thead>
                      <tr>
                        <th style={{ minWidth: '115px' }}>Category</th>
                        <th style={{ minWidth: '130px' }}>Function</th>
                        <th style={{ minWidth: '175px' }}>Status</th>
                        <th style={{ minWidth: '220px' }}>Syntax</th>
                        <th style={{ minWidth: '130px' }}>Parameter</th>
                        <th style={{ minWidth: '180px' }}>What Parameter Accepts</th>
                        <th style={{ minWidth: '230px' }}>What It Does</th>
                        <th style={{ minWidth: '240px' }}>Example</th>
                        <th style={{ width: '45px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTrackerItems.length === 0 ? (
                        <tr>
                          <td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                            No learning tracker items match your filters.
                          </td>
                        </tr>
                      ) : (
                        filteredTrackerItems.map(item => {
                          const s = trackerStatusMap[item.id] || item.status;
                          return (
                            <tr key={item.id} className={s === 'Completed' ? 'row-done' : s === 'Introduced/Practiced' ? 'row-learning' : ''}>
                              <td>
                                <span className="dax-category-badge">{item.category}</span>
                              </td>
                              <td>
                                <span className="dax-func-badge">{item.functionName}</span>
                              </td>
                              <td>
                                <div className="status-pill-group">
                                  <button
                                    type="button"
                                    className={`status-pill-btn ${s === 'Completed' ? 'active-done' : ''}`}
                                    onClick={() => setTrackerStatus(item.id, 'Completed')}
                                    title="Mark as Completed"
                                  >
                                    🟢 Done
                                  </button>
                                  <button
                                    type="button"
                                    className={`status-pill-btn ${s === 'Introduced/Practiced' ? 'active-practiced' : ''}`}
                                    onClick={() => setTrackerStatus(item.id, 'Introduced/Practiced')}
                                    title="Mark as Introduced/Practiced"
                                  >
                                    🟡 Practiced
                                  </button>
                                  <button
                                    type="button"
                                    className={`status-pill-btn ${s === 'Planned' ? 'active-planned' : ''}`}
                                    onClick={() => setTrackerStatus(item.id, 'Planned')}
                                    title="Mark as Planned"
                                  >
                                    ⚪ Plan
                                  </button>
                                </div>
                              </td>
                              <td>
                                <div className="syntax-chip">{item.syntax}</div>
                              </td>
                              <td>
                                <span className="dax-param-tag">{item.parameter}</span>
                              </td>
                              <td>
                                <span className="dax-accepts-badge">{item.parameterAccepts}</span>
                              </td>
                              <td>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-main)', lineHeight: '1.4' }}>
                                  {item.whatItDoes}
                                </div>
                              </td>
                              <td>
                                <div className="dax-example-cell">
                                  <code>{item.example}</code>
                                  <button 
                                    className="dax-example-copy-btn"
                                    onClick={() => handleCopy(item.example, item.id)}
                                    title="Copy DAX example"
                                  >
                                    {copiedId === item.id ? <Check size={11} color="#10b981" /> : <Copy size={11} />}
                                  </button>
                                </div>
                              </td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                  <button
                                    className="prompt-chip"
                                    style={{ padding: '0.25rem 0.45rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                                    onClick={() => handleAskAboutTrackerParam(item)}
                                    title={`Ask DEXer Copilot about ${item.functionName} parameter: ${item.parameter}`}
                                  >
                                    <Bot size={13} />
                                  </button>
                                  {item.id.startsWith('custom-') && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteCustomItem(item.id)}
                                      style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: '#ef4444',
                                        cursor: 'pointer',
                                        padding: '0.2rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        opacity: 0.8
                                      }}
                                      title="Delete custom function"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              /* View 2: Grouped by Function */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {Object.entries(
                  filteredTrackerItems.reduce<Record<string, DaxLearningItem[]>>((acc, item) => {
                    if (!acc[item.functionName]) acc[item.functionName] = [];
                    acc[item.functionName].push(item);
                    return acc;
                  }, {})
                ).map(([funcName, items]) => (
                  <div key={funcName} className="dax-grouped-card">
                    <div className="dax-grouped-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span className="dax-category-badge">{items[0].category}</span>
                        <span className="dax-func-badge" style={{ fontSize: '0.95rem' }}>{funcName}</span>
                        <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                          {items.length} parameter{items.length > 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="syntax-chip">{items[0].syntax}</div>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                      <table className="dax-table" style={{ margin: 0 }}>
                        <thead>
                          <tr>
                            <th style={{ width: '130px' }}>Parameter</th>
                            <th style={{ width: '170px' }}>Accepts</th>
                            <th>What It Does</th>
                            <th style={{ width: '240px' }}>Example</th>
                            <th style={{ width: '165px' }}>Status</th>
                            <th style={{ width: '40px' }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map(paramItem => {
                            const s = trackerStatusMap[paramItem.id] || paramItem.status;
                            return (
                              <tr key={paramItem.id}>
                                <td><span className="dax-param-tag">{paramItem.parameter}</span></td>
                                <td><span className="dax-accepts-badge">{paramItem.parameterAccepts}</span></td>
                                <td style={{ fontSize: '0.78rem' }}>{paramItem.whatItDoes}</td>
                                <td>
                                  <div className="dax-example-cell">
                                    <code>{paramItem.example}</code>
                                    <button 
                                      className="dax-example-copy-btn"
                                      onClick={() => handleCopy(paramItem.example, paramItem.id)}
                                      title="Copy example"
                                    >
                                      {copiedId === paramItem.id ? <Check size={11} color="#10b981" /> : <Copy size={11} />}
                                    </button>
                                  </div>
                                </td>
                                <td>
                                  <div className="status-pill-group">
                                    <button
                                      type="button"
                                      className={`status-pill-btn ${s === 'Completed' ? 'active-done' : ''}`}
                                      onClick={() => setTrackerStatus(paramItem.id, 'Completed')}
                                    >
                                      Done
                                    </button>
                                    <button
                                      type="button"
                                      className={`status-pill-btn ${s === 'Introduced/Practiced' ? 'active-practiced' : ''}`}
                                      onClick={() => setTrackerStatus(paramItem.id, 'Introduced/Practiced')}
                                    >
                                      Practiced
                                    </button>
                                    <button
                                      type="button"
                                      className={`status-pill-btn ${s === 'Planned' ? 'active-planned' : ''}`}
                                      onClick={() => setTrackerStatus(paramItem.id, 'Planned')}
                                    >
                                      Plan
                                    </button>
                                  </div>
                                </td>
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                    <button
                                      className="prompt-chip"
                                      style={{ padding: '0.2rem 0.4rem' }}
                                      onClick={() => handleAskAboutTrackerParam(paramItem)}
                                      title={`Ask DEXer Copilot about ${paramItem.functionName} parameter: ${paramItem.parameter}`}
                                    >
                                      <Bot size={12} />
                                    </button>
                                    {paramItem.id.startsWith('custom-') && (
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteCustomItem(paramItem.id)}
                                        style={{
                                          background: 'transparent',
                                          border: 'none',
                                          color: '#ef4444',
                                          cursor: 'pointer',
                                          padding: '0.15rem',
                                          display: 'flex',
                                          alignItems: 'center',
                                          opacity: 0.8
                                        }}
                                        title="Delete custom function"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ADD TO LEARNING TRACKER MODAL */}
        {isAddModalOpen && (
          <div className="dax-modal-backdrop" onClick={() => !isAiFilling && setIsAddModalOpen(false)}>
            <div className="dax-modal-box" onClick={(e) => e.stopPropagation()}>
              <div className="dax-modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(5, 150, 105, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)' }}>
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>Add to Learning Tracker</h3>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                      Function Name is mandatory. Missing fields will be automatically generated by AI.
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => !isAiFilling && setIsAddModalOpen(false)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.2rem' }}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="dax-modal-body">
                {formError && (
                  <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', borderRadius: '6px', padding: '0.5rem 0.75rem', fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <AlertCircle size={14} />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Function Name (MANDATORY) */}
                <div className="dax-form-group">
                  <label className="dax-form-label">
                    <span>Function Name <strong style={{ color: '#ef4444' }}>*</strong></span>
                    <button
                      type="button"
                      onClick={handleAutoFillForm}
                      disabled={isAiFilling || !newItemForm.functionName.trim()}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: isAiFilling || !newItemForm.functionName.trim() ? 'var(--text-muted)' : 'var(--accent-primary)',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        cursor: isAiFilling || !newItemForm.functionName.trim() ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}
                    >
                      <Sparkles size={12} className={isAiFilling ? 'animate-spin' : ''} />
                      <span>{isAiFilling ? 'AI Generating...' : '⚡ Auto-Fill Details with AI'}</span>
                    </button>
                  </label>
                  <input
                    type="text"
                    className="dax-form-input"
                    style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.9rem' }}
                    placeholder="e.g. TREATAS, USERELATIONSHIP, INDEX, WINDOW..."
                    value={newItemForm.functionName}
                    onChange={(e) => {
                      setNewItemForm(prev => ({ ...prev, functionName: e.target.value }));
                      if (formError) setFormError(null);
                    }}
                    autoFocus
                  />
                </div>

                {/* Category & Status Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="dax-form-group">
                    <label className="dax-form-label">Category (Optional)</label>
                    <select
                      className="dax-form-input"
                      value={newItemForm.category}
                      onChange={(e) => setNewItemForm(prev => ({ ...prev, category: e.target.value }))}
                    >
                      {TRACKER_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                      <option value="Table Shaping">Table Shaping</option>
                      <option value="Security / Metadata">Security / Metadata</option>
                    </select>
                  </div>

                  <div className="dax-form-group">
                    <label className="dax-form-label">Initial Status</label>
                    <select
                      className="dax-form-input"
                      value={newItemForm.status}
                      onChange={(e) => setNewItemForm(prev => ({ ...prev, status: e.target.value as any }))}
                    >
                      <option value="Planned">⚪ Planned</option>
                      <option value="Introduced/Practiced">🟡 Introduced / Practiced</option>
                      <option value="Completed">🟢 Completed (Mastered)</option>
                    </select>
                  </div>
                </div>

                {/* Parameter & Accepts Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="dax-form-group">
                    <label className="dax-form-label">Parameter (Optional - AI fills)</label>
                    <input
                      type="text"
                      className="dax-form-input"
                      placeholder="e.g. table, column, expression"
                      value={newItemForm.parameter}
                      onChange={(e) => setNewItemForm(prev => ({ ...prev, parameter: e.target.value }))}
                    />
                  </div>

                  <div className="dax-form-group">
                    <label className="dax-form-label">Parameter Accepts (Optional)</label>
                    <input
                      type="text"
                      className="dax-form-input"
                      placeholder="e.g. Table expression, Date column"
                      value={newItemForm.parameterAccepts}
                      onChange={(e) => setNewItemForm(prev => ({ ...prev, parameterAccepts: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Syntax */}
                <div className="dax-form-group">
                  <label className="dax-form-label">Syntax (Optional - AI fills)</label>
                  <input
                    type="text"
                    className="dax-form-input"
                    style={{ fontFamily: 'monospace' }}
                    placeholder="e.g. TREATAS(<table>, <column>[, <column>...])"
                    value={newItemForm.syntax}
                    onChange={(e) => setNewItemForm(prev => ({ ...prev, syntax: e.target.value }))}
                  />
                </div>

                {/* What It Does */}
                <div className="dax-form-group">
                  <label className="dax-form-label">What It Does (Optional - AI fills)</label>
                  <textarea
                    className="dax-form-textarea"
                    placeholder="e.g. Applies table expression as filters to columns from an unrelated table."
                    value={newItemForm.whatItDoes}
                    onChange={(e) => setNewItemForm(prev => ({ ...prev, whatItDoes: e.target.value }))}
                  />
                </div>

                {/* Example */}
                <div className="dax-form-group">
                  <label className="dax-form-label">Example (Optional - AI fills)</label>
                  <input
                    type="text"
                    className="dax-form-input"
                    style={{ fontFamily: 'monospace' }}
                    placeholder="e.g. CALCULATE([Total Sales], TREATAS(VALUES(Targets[Cat]), FactSales[Cat]))"
                    value={newItemForm.example}
                    onChange={(e) => setNewItemForm(prev => ({ ...prev, example: e.target.value }))}
                  />
                </div>
              </div>

              <div className="dax-modal-footer">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={isAiFilling}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-muted)',
                    borderRadius: '6px',
                    padding: '0.45rem 0.85rem',
                    fontSize: '0.75rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSaveNewItem}
                  disabled={isAiFilling || !newItemForm.functionName.trim()}
                  style={{
                    background: 'var(--accent-primary)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.45rem 1.1rem',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    cursor: isAiFilling || !newItemForm.functionName.trim() ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    opacity: isAiFilling || !newItemForm.functionName.trim() ? 0.6 : 1
                  }}
                >
                  {isAiFilling ? (
                    <>
                      <Sparkles size={14} className="animate-spin" />
                      <span>AI Auto-Completing & Adding...</span>
                    </>
                  ) : (
                    <>
                      <Plus size={14} />
                      <span>Add to Tracker</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DAX RECIPES */}
        {activeTab === 'recipes' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Interactive Model Schema Customizer */}
            <div className="dax-schema-customizer">
              <div 
                className="dax-schema-header"
                onClick={() => setIsParamsOpen(prev => !prev)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(5, 150, 105, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)' }}>
                    <Sliders size={16} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700 }}>Model Schema Customizer</h3>
                    <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Set your tables & columns below — all DAX recipes and senior rewrites adapt to your model in real time.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setRecipeParams({
                        factTable: 'FactSales',
                        metricCol: 'SalesAmount',
                        dateTable: 'DimDate',
                        dateCol: 'Date',
                        dimTable: 'DimProduct'
                      });
                    }}
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--border-color)',
                      borderRadius: '5px',
                      color: 'var(--text-muted)',
                      fontSize: '0.7rem',
                      padding: '0.2rem 0.5rem',
                      cursor: 'pointer'
                    }}
                    title="Reset to default schema names"
                  >
                    Reset Defaults
                  </button>
                  {isParamsOpen ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
                </div>
              </div>

              {isParamsOpen && (
                <div className="dax-schema-grid">
                  <div className="dax-schema-field">
                    <label className="dax-schema-label">Fact Table ({"{{FACT}}"})</label>
                    <input 
                      type="text" 
                      className="dax-schema-input"
                      value={recipeParams.factTable} 
                      onChange={e => setRecipeParams(p => ({ ...p, factTable: e.target.value }))}
                      placeholder="e.g. FactSales"
                    />
                  </div>

                  <div className="dax-schema-field">
                    <label className="dax-schema-label">Metric Column / Measure ({"{{METRIC}}"})</label>
                    <input 
                      type="text" 
                      className="dax-schema-input"
                      value={recipeParams.metricCol} 
                      onChange={e => setRecipeParams(p => ({ ...p, metricCol: e.target.value }))}
                      placeholder="e.g. SalesAmount"
                    />
                  </div>

                  <div className="dax-schema-field">
                    <label className="dax-schema-label">Date Table ({"{{DATE_TABLE}}"})</label>
                    <input 
                      type="text" 
                      className="dax-schema-input"
                      value={recipeParams.dateTable} 
                      onChange={e => setRecipeParams(p => ({ ...p, dateTable: e.target.value }))}
                      placeholder="e.g. DimDate"
                    />
                  </div>

                  <div className="dax-schema-field">
                    <label className="dax-schema-label">Date Column ({"{{DATE_COL}}"})</label>
                    <input 
                      type="text" 
                      className="dax-schema-input"
                      value={recipeParams.dateCol} 
                      onChange={e => setRecipeParams(p => ({ ...p, dateCol: e.target.value }))}
                      placeholder="e.g. Date"
                    />
                  </div>

                  <div className="dax-schema-field">
                    <label className="dax-schema-label">Dimension Table ({"{{DIM_TABLE}}"})</label>
                    <input 
                      type="text" 
                      className="dax-schema-input"
                      value={recipeParams.dimTable} 
                      onChange={e => setRecipeParams(p => ({ ...p, dimTable: e.target.value }))}
                      placeholder="e.g. DimProduct"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Recipes Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '1.25rem' }}>
              {DAX_RECIPES.map(recipe => {
                const currentMode = recipeModeMap[recipe.id] || 'senior';
                const isSimulationOpen = !!showSimMap[recipe.id];
                const activeCode = formatRecipeCode(
                  currentMode === 'senior' ? recipe.templateCode : recipe.naiveCode
                );

                return (
                  <div 
                    key={recipe.id}
                    style={{ 
                      background: 'var(--bg-card)', 
                      border: currentMode === 'senior' ? '1px solid var(--border-color)' : '1px solid rgba(239, 68, 68, 0.4)', 
                      borderRadius: '12px', 
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem',
                      boxShadow: 'var(--shadow-sm)'
                    }}
                  >
                    {/* Top Row: Tags & Storage Engine Rating */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem', background: 'rgba(5, 150, 105, 0.15)', color: 'var(--accent-primary)', borderRadius: '4px', fontWeight: 600 }}>
                          {recipe.tag}
                        </span>
                        <span className={`se-rating-badge ${
                          recipe.seRating === 'Pure Storage Engine' ? 'se-pure' :
                          recipe.seRating === 'Hybrid SE/FE' ? 'se-hybrid' : 'se-heavy'
                        }`}>
                          {recipe.seRating === 'Pure Storage Engine' ? '🏎️ Pure Storage Engine' :
                           recipe.seRating === 'Hybrid SE/FE' ? '⚖️ Hybrid SE / FE' : '⚠️ Formula Engine Heavy'}
                        </span>
                      </div>

                      <button
                        onClick={() => handleCopy(activeCode, recipe.id)}
                        style={{
                          background: 'var(--bg-dark)',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-main)',
                          padding: '0.3rem 0.6rem',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.72rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem'
                        }}
                      >
                        {copiedId === recipe.id ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                        <span>{copiedId === recipe.id ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>

                    {/* Title */}
                    <div>
                      <h3 style={{ fontSize: '0.98rem', fontWeight: 700, margin: '0.1rem 0' }}>{recipe.title}</h3>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Category: {recipe.category}</span>
                    </div>

                    {/* Senior vs Naive Segmented Switcher */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.2rem' }}>
                      <div className="recipe-mode-toggle">
                        <button
                          type="button"
                          className={`recipe-mode-btn ${currentMode === 'senior' ? 'active-senior' : ''}`}
                          onClick={() => setRecipeModeMap(m => ({ ...m, [recipe.id]: 'senior' }))}
                        >
                          ⚡ Senior DAX
                        </button>
                        <button
                          type="button"
                          className={`recipe-mode-btn ${currentMode === 'naive' ? 'active-naive' : ''}`}
                          onClick={() => setRecipeModeMap(m => ({ ...m, [recipe.id]: 'naive' }))}
                        >
                          ❌ Naive Trap
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowSimMap(m => ({ ...m, [recipe.id]: !isSimulationOpen }))}
                        style={{
                          background: isSimulationOpen ? 'rgba(5, 150, 105, 0.15)' : 'var(--bg-dark)',
                          border: '1px solid var(--border-color)',
                          color: isSimulationOpen ? 'var(--accent-primary)' : 'var(--text-muted)',
                          borderRadius: '6px',
                          padding: '0.25rem 0.55rem',
                          fontSize: '0.7rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          cursor: 'pointer'
                        }}
                      >
                        <Table size={12} />
                        <span>{isSimulationOpen ? 'Hide Simulation' : '📊 Visual Simulation'}</span>
                      </button>
                    </div>

                    {/* Code Block */}
                    <pre style={{
                      background: 'var(--bg-dark)',
                      border: currentMode === 'senior' ? '1px solid var(--border-color)' : '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: '6px',
                      padding: '0.75rem',
                      fontSize: '0.74rem',
                      fontFamily: 'monospace',
                      overflowX: 'auto',
                      maxHeight: '220px',
                      color: currentMode === 'senior' ? 'var(--accent-primary)' : '#ef4444',
                      margin: 0
                    }}>
                      {activeCode}
                    </pre>

                    {/* Critique / Gotcha Box */}
                    {currentMode === 'senior' ? (
                      <>
                        <p style={{ fontSize: '0.76rem', color: 'var(--text-main)', margin: 0 }}>
                          {recipe.explanation}
                        </p>
                        <div className="trap-callout" style={{ margin: 0 }}>
                          <strong>Senior Gotcha:</strong> {recipe.gotcha}
                        </div>
                      </>
                    ) : (
                      <div style={{
                        background: 'rgba(239, 68, 68, 0.08)',
                        borderLeft: '3px solid #ef4444',
                        padding: '0.5rem 0.65rem',
                        borderRadius: '0 6px 6px 0',
                        fontSize: '0.74rem',
                        color: 'var(--text-main)'
                      }}>
                        <div style={{ fontWeight: 700, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.2rem' }}>
                          <AlertTriangle size={13} />
                          <span>Why Junior Developers Fall Into This Trap:</span>
                        </div>
                        {recipe.naiveCritique}
                      </div>
                    )}

                    {/* Visual Matrix Simulation Drawer */}
                    {isSimulationOpen && (
                      <div className="matrix-simulation-box">
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <span>📊 {recipe.visualSimulation.title}</span>
                        </div>
                        <table className="matrix-sim-table">
                          <thead>
                            <tr>
                              <th>{recipe.visualSimulation.dimHeader}</th>
                              <th>{recipe.visualSimulation.baseHeader}</th>
                              <th>{recipe.visualSimulation.metricHeader}</th>
                              <th>Context & Evaluation Note</th>
                            </tr>
                          </thead>
                          <tbody>
                            {recipe.visualSimulation.rows.map((row, idx) => (
                              <tr key={idx} className={row.isTotal ? 'matrix-sim-row-total' : ''}>
                                <td style={{ fontWeight: row.isTotal ? 700 : 500 }}>{row.label}</td>
                                <td>{row.baseVal}</td>
                                <td style={{ color: row.isTotal ? 'var(--accent-primary)' : 'var(--text-main)', fontWeight: 600 }}>{row.metricVal}</td>
                                <td style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{row.contextNote || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Footer Actions */}
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto', paddingTop: '0.4rem', borderTop: '1px solid var(--border-color)' }}>
                      <button
                        onClick={() => handleSendRecipeToAudit(activeCode)}
                        style={{
                          flex: 1,
                          background: 'rgba(5, 150, 105, 0.1)',
                          border: '1px solid rgba(5, 150, 105, 0.25)',
                          color: 'var(--accent-primary)',
                          padding: '0.35rem 0.65rem',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.35rem'
                        }}
                      >
                        <Wrench size={12} />
                        <span>Audit in DEXer</span>
                      </button>

                      <button
                        onClick={() => handleSendMessage(`Explain how to write and optimize ${recipe.title}`)}
                        style={{
                          background: 'transparent',
                          border: '1px dashed var(--border-color)',
                          color: 'var(--text-muted)',
                          padding: '0.35rem 0.65rem',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.35rem'
                        }}
                      >
                        <Bot size={12} />
                        <span>Explain</span>
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>

          </div>
        )}

        {/* TAB 3: POWER BI TECHNICAL SKILLS */}
        {activeTab === 'pbi' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1.15rem' }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.65rem' }}>
                <span>📐</span> Data Modeling
              </h3>
              <ul style={{ fontSize: '0.76rem', color: 'var(--text-muted)', listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <li>🟢 Star Schema & Fact-Dimension Grain</li>
                <li>🟢 Active vs Inactive Relationships</li>
                <li>🟢 Official Date Table Registration</li>
                <li>⚪ Role-Playing Dimensions</li>
                <li>⚪ Calculation Groups (Tabular Editor / Desktop)</li>
                <li>⚪ Composite Models & Dual Storage Mode</li>
                <li>⚪ Incremental Refresh & Hybrid Partitions</li>
              </ul>
            </div>

            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1.15rem' }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0ea5e9', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.65rem' }}>
                <span>⚡</span> Power Query & M
              </h3>
              <ul style={{ fontSize: '0.76rem', color: 'var(--text-muted)', listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <li>🟢 Deduplication, Types, Filtering</li>
                <li>🟢 Merges (Inner/Left) & Appends</li>
                <li>🟢 Conditional & Custom Columns</li>
                <li>🟡 M Code Functions & Syntax</li>
                <li>⚪ Query Folding Optimization</li>
                <li>⚪ Staging ETL Architecture (Bronze/Silver/Gold)</li>
                <li>⚪ Dynamic Source Parameters</li>
              </ul>
            </div>

            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1.15rem' }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.65rem' }}>
                <span>🏎️</span> Engine Optimization
              </h3>
              <ul style={{ fontSize: '0.76rem', color: 'var(--text-muted)', listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <li>⚪ VertiPaq Compression (Dictionary & RLE)</li>
                <li>⚪ Cardinality Reduction (Split Date & Time)</li>
                <li>⚪ Performance Analyzer (Visual vs DAX)</li>
                <li>⚪ DAX Studio (Server Timings: SE vs FE)</li>
                <li>⚪ Best Practice Analyzer (BPA) Execution</li>
                <li>⚪ Visual Calculations (RUNNINGSUM, OFFSET)</li>
              </ul>
            </div>

          </div>
        )}

      </div>

      {/* 5. Fixed Floating / Docked DAX Copilot (Always visible without scrolling!) */}
      {isCopilotOpen ? (
        <div className="dax-chatbot-docked">
          
          {/* Header */}
          <div className="dax-chat-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <div style={{ width: '26px', height: '26px', borderRadius: '7px', background: 'rgba(5, 150, 105, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)' }}>
                <Bot size={16} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700 }}>DEXer Copilot</h3>
                <span style={{ fontSize: '0.68rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#10b981' }}></span>
                  Flashcard Mode (Bite-Sized)
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <button
                onClick={() => setMessages([{
                  id: 'welcome-msg',
                  sender: 'bot',
                  text: "⚡ **DAX Copilot Ready.**\n\nAsk for any formula or pattern. Answers are **short, practical flashcards**.",
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }])}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.2rem' }}
                title="Clear Chat History"
              >
                <RefreshCw size={13} />
              </button>
              <button
                onClick={toggleCopilot}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.2rem' }}
                title="Minimize Copilot"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Subtabs Switcher */}
          <div className="dax-copilot-subtabs">
            <button
              type="button"
              className={`dax-subtab-btn ${copilotSubTab === 'chat' ? 'active' : ''}`}
              onClick={() => setCopilotSubTab('chat')}
            >
              <Bot size={13} />
              <span>Flashcard Q&A</span>
            </button>
            <button
              type="button"
              className={`dax-subtab-btn ${copilotSubTab === 'audit' ? 'active' : ''}`}
              onClick={() => {
                setCopilotSubTab('audit');
                if (!auditResult && auditInput.trim()) {
                  runDaxAudit();
                }
              }}
            >
              <Wrench size={13} />
              <span>Audit & Debug DAX</span>
            </button>
          </div>

          {/* TAB A: FLASHCARD CHAT */}
          {copilotSubTab === 'chat' && (
            <>
              {/* Messages Feed (Scrolls internally) */}
              <div className="dax-chat-messages">
                {messages.map(msg => (
                  <div 
                    key={msg.id} 
                    className={`dax-message-bubble ${msg.sender === 'user' ? 'dax-message-user' : 'dax-message-bot'}`}
                  >
                    {msg.sender === 'user' ? (
                      <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>
                    ) : (
                      <div className="markdown-preview" style={{ fontSize: '0.78rem', lineHeight: '1.4' }}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                      </div>
                    )}
                    <div style={{ fontSize: '0.62rem', opacity: 0.6, marginTop: '0.2rem', textAlign: msg.sender === 'user' ? 'right' : 'left' }}>
                      {msg.timestamp}
                    </div>
                  </div>
                ))}

                {isBotThinking && (
                  <div className="dax-message-bubble dax-message-bot" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)' }}>
                    <Sparkles size={13} className="animate-spin" />
                    <span>Preparing formula flashcard...</span>
                  </div>
                )}
                <div ref={chatMessagesEndRef} />
              </div>

              {/* Prompt Chips (Always fixed above input) */}
              <div className="dax-prompt-chips">
                <button 
                  className="prompt-chip"
                  onClick={() => handleSendMessage("How to create cumulative sales beside each row?")}
                >
                  📊 Cumulative beside row
                </button>
                <button 
                  className="prompt-chip"
                  onClick={() => handleSendMessage("How to calculate MoM growth using OFFSET?")}
                >
                  📈 MoM with OFFSET
                </button>
                <button 
                  className="prompt-chip"
                  onClick={() => handleSendMessage("What is the difference between ALL and ALLSELECTED?")}
                >
                  ⚖️ ALL vs ALLSELECTED
                </button>
              </div>

              {/* Chat Input (Permanently pinned at bottom - NEVER needs page scroll) */}
              <form 
                className="dax-chat-input-area"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
              >
                <input 
                  type="text" 
                  className="dax-chat-input"
                  placeholder="Ask DAX (e.g. cumulative total)..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                />
                <button 
                  type="submit" 
                  className="dax-send-btn"
                  disabled={isBotThinking || !chatInput.trim()}
                >
                  <Send size={13} />
                </button>
              </form>
            </>
          )}

          {/* TAB B: AUDIT & DEBUG DAX */}
          {copilotSubTab === 'audit' && (
            <div className="dax-audit-container">
              {/* Presets Bar */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  ⚡ Quick Test Presets:
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                  {AUDIT_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      className="prompt-chip"
                      style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem' }}
                      onClick={() => {
                        setAuditInput(preset.code);
                        runDaxAudit(preset.code);
                      }}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* DAX Input Textarea */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Paste Measure to Inspect:
                  </label>
                  {auditInput && (
                    <button
                      onClick={() => {
                        setAuditInput('');
                        setAuditResult(null);
                      }}
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '0.68rem', cursor: 'pointer' }}
                    >
                      Clear
                    </button>
                  )}
                </div>
                <textarea
                  className="dax-audit-textarea"
                  value={auditInput}
                  onChange={(e) => setAuditInput(e.target.value)}
                  placeholder="Paste any DAX measure here to scan for anti-patterns and performance bottlenecks..."
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => runDaxAudit()}
                  disabled={isAuditing || !auditInput.trim()}
                  style={{
                    flex: 1,
                    background: 'var(--accent-primary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.45rem 0.65rem',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem',
                    opacity: isAuditing || !auditInput.trim() ? 0.6 : 1
                  }}
                >
                  <Play size={13} />
                  <span>{isAuditing ? 'Auditing...' : 'Run Static Audit'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => runAiDeepAudit()}
                  disabled={isAiAuditing || !auditInput.trim()}
                  style={{
                    flex: 1,
                    background: 'rgba(5, 150, 105, 0.15)',
                    color: 'var(--accent-primary)',
                    border: '1px solid rgba(5, 150, 105, 0.3)',
                    borderRadius: '6px',
                    padding: '0.45rem 0.65rem',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem',
                    opacity: isAiAuditing || !auditInput.trim() ? 0.6 : 1
                  }}
                  title="Run AI-driven deep architectural review using your MyCES API key"
                >
                  <Sparkles size={13} className={isAiAuditing ? 'animate-spin' : ''} />
                  <span>{isAiAuditing ? 'AI Reviewing...' : '⚡ AI Deep Audit'}</span>
                </button>
              </div>

              {/* AI Deep Audit Output */}
              {aiAuditReview && (
                <div style={{
                  background: 'var(--bg-dark)',
                  border: '1px solid rgba(5, 150, 105, 0.35)',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.45rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Sparkles size={13} />
                      AI Architectural Review:
                    </span>
                    <button
                      onClick={() => handleCopy(aiAuditReview, 'ai-audit-review')}
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-main)',
                        padding: '0.18rem 0.45rem',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.66rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}
                    >
                      {copiedId === 'ai-audit-review' ? <Check size={11} color="#10b981" /> : <Copy size={11} />}
                      <span>{copiedId === 'ai-audit-review' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <div className="markdown-preview" style={{ fontSize: '0.75rem', lineHeight: '1.45' }}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{aiAuditReview}</ReactMarkdown>
                  </div>
                </div>
              )}

              {/* Audit Results */}
              {auditResult && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.3rem' }}>
                  
                  {/* Score Card */}
                  <div className="dax-score-card">
                    <div className={`dax-score-circle ${
                      auditResult.healthStatus === 'OPTIMAL' ? 'dax-score-green' :
                      auditResult.healthStatus === 'MODERATE' ? 'dax-score-yellow' : 'dax-score-red'
                    }`}>
                      {auditResult.score}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <div style={{ fontSize: '0.84rem', fontWeight: 800, color: auditResult.healthStatus === 'OPTIMAL' ? '#10b981' : auditResult.healthStatus === 'MODERATE' ? '#f59e0b' : '#ef4444' }}>
                        {auditResult.healthStatus === 'OPTIMAL' && '🟢 Production Grade'}
                        {auditResult.healthStatus === 'MODERATE' && '🟡 Refactoring Recommended'}
                        {auditResult.healthStatus === 'CRITICAL' && '🔴 Critical Performance Anti-Pattern'}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {auditResult.issues.length === 0 
                          ? 'Zero anti-patterns detected. Storage Engine friendly.'
                          : `${auditResult.issues.length} architectural issue${auditResult.issues.length > 1 ? 's' : ''} detected.`}
                      </div>
                    </div>
                  </div>

                  {/* Engine Breakdown */}
                  <div className="dax-engine-bar-container">
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', fontWeight: 600 }}>
                      <span style={{ color: '#10b981' }}>Storage Engine (SE): {auditResult.engineBreakdown.sePct}%</span>
                      <span style={{ color: '#ef4444' }}>Formula Engine (FE): {auditResult.engineBreakdown.fePct}%</span>
                    </div>
                    <div className="dax-engine-progress-bar">
                      <div className="dax-engine-se-fill" style={{ width: `${auditResult.engineBreakdown.sePct}%` }} />
                      <div className="dax-engine-fe-fill" style={{ width: `${auditResult.engineBreakdown.fePct}%` }} />
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                      {auditResult.engineBreakdown.description}
                    </div>
                  </div>

                  {/* Identified Issues */}
                  {auditResult.issues.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-main)', textTransform: 'uppercase' }}>
                        Detected Architectural Traps:
                      </span>
                      {auditResult.issues.map(issue => (
                        <div key={issue.id} className="dax-issue-card">
                          <div className="dax-issue-header">
                            <strong style={{ fontSize: '0.78rem', color: 'var(--text-main)' }}>{issue.title}</strong>
                            <span className={`dax-severity-pill ${
                              issue.severity === 'critical' ? 'dax-severity-critical' :
                              issue.severity === 'warning' ? 'dax-severity-warning' : 'dax-severity-info'
                            }`}>
                              {issue.severity}
                            </span>
                          </div>
                          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0 }}>
                            {issue.desc}
                          </p>
                          <div style={{ fontSize: '0.68rem', color: '#ef4444', fontWeight: 500 }}>
                            ⚠️ Impact: {issue.engineImpact}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Senior Optimized Rewrite */}
                  <div className="dax-rewrite-box">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Sparkles size={13} />
                        Senior-Level Rewrite:
                      </span>
                      <button
                        onClick={() => handleCopy(auditResult.optimizedRewrite, 'audit-rewrite')}
                        style={{
                          background: 'transparent',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-main)',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.68rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}
                      >
                        {copiedId === 'audit-rewrite' ? <Check size={11} color="#10b981" /> : <Copy size={11} />}
                        <span>{copiedId === 'audit-rewrite' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>

                    <pre style={{
                      background: 'rgba(0, 0, 0, 0.4)',
                      padding: '0.65rem',
                      borderRadius: '6px',
                      fontFamily: 'monospace',
                      fontSize: '0.72rem',
                      color: 'var(--accent-primary)',
                      overflowX: 'auto',
                      margin: 0,
                      maxHeight: '160px'
                    }}>
                      {auditResult.optimizedRewrite}
                    </pre>

                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0 }}>
                      💡 {auditResult.rationale}
                    </p>
                  </div>

                  {/* Chat Consultation CTA */}
                  <button
                    onClick={() => {
                      setCopilotSubTab('chat');
                      handleSendMessage(`Explain in detail why this DAX was flagged and how the rewrite optimizes engine execution:\n\n${auditInput}`);
                    }}
                    style={{
                      background: 'var(--bg-dark)',
                      border: '1px dashed var(--border-color)',
                      borderRadius: '6px',
                      padding: '0.45rem',
                      color: 'var(--text-muted)',
                      fontSize: '0.72rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    <Bot size={13} />
                    <span>Ask DEXer Copilot to explain this audit</span>
                  </button>

                </div>
              )}

            </div>
          )}

        </div>
      ) : (
        /* Floating Trigger when minimized */
        <button
          onClick={toggleCopilot}
          style={{
            position: 'fixed',
            bottom: '1.5rem',
            right: '1.5rem',
            background: 'var(--accent-primary)',
            color: 'white',
            border: 'none',
            borderRadius: '9999px',
            padding: '0.65rem 1.15rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
            cursor: 'pointer',
            zIndex: 1000,
            fontWeight: 600,
            fontSize: '0.85rem'
          }}
        >
          <MessageSquare size={16} />
          <span>DEXer Copilot</span>
        </button>
      )}

    </div>
  );
};
