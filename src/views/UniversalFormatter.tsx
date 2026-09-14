import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Code2,
  Sparkles,
  Copy,
  Check,
  Download,
  Trash2,
  Play,
  Columns2,
  CheckCircle2,
  FileCode,
  FileSpreadsheet,
  Database,
  Braces,
} from 'lucide-react';
import {
  formatUniversal,
  type FormatterLanguage,
  type UniversalFormatterResult,
  toSnakeCase,
  toCamelCase,
  toTitleCase,
} from '../utils/formatters';
import './UniversalFormatter.css';

interface Preset {
  id: string;
  name: string;
  language: FormatterLanguage;
  code: string;
}

const PRESETS: Preset[] = [
  {
    id: 'dax-user-example',
    name: "DAX: Filter & Calculate (User's Example)",
    language: 'dax',
    code: `Greate Sales In East =
CALCULATE (
[Total Sales],
FILTER('Table','Table' [Region]="East" && 'Table'[Sales]>200))`,
  },
  {
    id: 'dax-ytd',
    name: 'DAX: Time Intelligence YTD',
    language: 'dax',
    code: `YTD Sales =
CALCULATE(
[Total Sales],
DATESYTD('Calendar'[Date]))`,
  },
  {
    id: 'dax-var-return',
    name: 'DAX: VAR/RETURN Ratio & Growth',
    language: 'dax',
    code: `Sales Growth YoY % =
VAR PriorYear = CALCULATE([Total Sales], SAMEPERIODLASTYEAR('Calendar'[Date]))
VAR CurrentSales = [Total Sales]
RETURN
DIVIDE(CurrentSales - PriorYear, PriorYear, 0)`,
  },
  {
    id: 'excel-nested-if',
    name: 'Excel: Nested IF with AND / VLOOKUP',
    language: 'excel',
    code: `=if(and(A2>100,vlookup(B2,Products!A:D,4,false)="Active"),index(Sales!C:C,match(1,(Sales!A:A=B2)*(Sales!B:B=C2),0)),"N/A")`,
  },
  {
    id: 'excel-let-filter',
    name: 'Excel: Modern LET with Dynamic FILTER & SORT',
    language: 'excel',
    code: `=let(filteredData,filter(Orders!A2:E100,(Orders!C2:C100="Completed")*(Orders!E2:E100>500),"No Orders"),sortedData,sort(filteredData,5,-1),take(sortedData,10))`,
  },
  {
    id: 'excel-xlookup',
    name: 'Excel: XLOOKUP Multi-Criteria Match',
    language: 'excel',
    code: `=xlookup(1,(Sales[Region]="East")*(Sales[Quarter]="Q3"),Sales[Revenue],"Not Found",0,1)`,
  },
  {
    id: 'sql-cte',
    name: 'SQL: CTE with Window Functions',
    language: 'sql',
    code: `with ranked_orders as (select customer_id, order_id, total_amount, row_number() over (partition by customer_id order by order_date desc) as rn from analytics.orders where order_status='completed' and total_amount > 50) select customer_id, order_id, total_amount from ranked_orders where rn=1 order by total_amount desc limit 100;`,
  },
  {
    id: 'powerquery-pipeline',
    name: 'Power Query M: Ingestion Pipeline',
    language: 'powerquery',
    code: `let
Source = Csv.Document(File.Contents("C:\\Data\\sales_transactions.csv"),[Delimiter=",", Columns=6, Encoding=65001]),
#"Promoted Headers" = Table.PromoteHeaders(Source, [PromoteAllScalars=true]),
#"Changed Type" = Table.TransformColumnTypes(#"Promoted Headers",{{"SalesAmount", Currency.Type}, {"Region", type text}, {"OrderDate", type date}}),
#"Filtered Rows" = Table.SelectRows(#"Changed Type", each [SalesAmount] > 0)
in
#"Filtered Rows"`,
  },
  {
    id: 'python-pandas',
    name: 'Python: Pandas Pipeline',
    language: 'python',
    code: `def process_sales_dataset(df,min_threshold=500):
    filtered = df[df['sales_amount']>=min_threshold]
    grouped = filtered.groupby(['region','category']).agg(total_sales=('sales_amount','sum'),order_count=('order_id','count')).reset_index()
    return grouped`,
  },
  {
    id: 'json-messy',
    name: 'JSON: Dirty Data with Comments & Single Quotes',
    language: 'json',
    code: `// Data Pipeline Ingestion Schema
{
  table_name: 'fct_monthly_sales',
  database: 'snowflake_analytics',
  partitions: ['2026-09-01', '2026-09-15',],
  metrics: {
    row_count: 8520300,
    is_active: True,
    null_rate: None,
  },
}`,
  },
  {
    id: 'markdown-table',
    name: 'Markdown: Data Dictionary Schema Table',
    language: 'markdown',
    code: `| Column Name | Data Type | Primary Key | Description |
|---|---|---|---|
| order_id | UUID | YES | Unique order transaction ID |
| customer_id | BIGINT | NO | Foreign key reference to dim_customers |
| transaction_timestamp | TIMESTAMPTZ | NO | UTC event capture time |
| net_sales_usd | DECIMAL(18,2) | NO | Converted USD order amount |`,
  },
];

export const UniversalFormatter = () => {
  const [inputCode, setInputCode] = useState<string>(PRESETS[0].code);
  const [selectedLanguage, setSelectedLanguage] = useState<FormatterLanguage>('auto');
  const [indentSize, setIndentSize] = useState<number>(4);
  const [uppercaseKeywords, setUppercaseKeywords] = useState<boolean>(true);
  const [fixTypos, setFixTypos] = useState<boolean>(true);
  const [liveFormat, setLiveFormat] = useState<boolean>(true);
  const [autoCopy, setAutoCopy] = useState<boolean>(true);
  const [showDiff, setShowDiff] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Result state
  const [result, setResult] = useState<UniversalFormatterResult>(() =>
    formatUniversal(PRESETS[0].code, {
      language: 'auto',
      indentSize: 4,
      uppercaseKeywords: true,
      fixTypos: true,
    })
  );

  const inputTextAreaRef = useRef<HTMLTextAreaElement>(null);
  const outputTextAreaRef = useRef<HTMLTextAreaElement>(null);
  const inputGutterRef = useRef<HTMLDivElement>(null);
  const outputGutterRef = useRef<HTMLDivElement>(null);

  // Reusable clipboard writer
  const copyToClipboard = useCallback(async (text: string) => {
    if (!text || !text.trim()) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  }, []);

  // Execute formatting
  const handleFormat = useCallback(
    (codeToFormat?: string, langOverride?: FormatterLanguage, shouldCopy = false) => {
      const code = codeToFormat !== undefined ? codeToFormat : inputCode;
      const lang = langOverride !== undefined ? langOverride : selectedLanguage;

      const res = formatUniversal(code, {
        language: lang,
        indentSize,
        uppercaseKeywords,
        fixTypos,
      });
      setResult(res);

      if (shouldCopy && autoCopy && res.formatted && res.formatted.trim()) {
        copyToClipboard(res.formatted);
      }
    },
    [inputCode, selectedLanguage, indentSize, uppercaseKeywords, fixTypos, autoCopy, copyToClipboard]
  );

  // Live formatting debounce (only previews format visually, NEVER overwrites clipboard on live typing)
  useEffect(() => {
    if (!liveFormat) return;
    const timer = setTimeout(() => {
      handleFormat(undefined, undefined, false);
    }, 250);
    return () => clearTimeout(timer);
  }, [inputCode, selectedLanguage, indentSize, uppercaseKeywords, fixTypos, liveFormat, handleFormat]);

  // Global shortcuts & Ctrl+A containment
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Enter to format AND copy to clipboard
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleFormat(undefined, undefined, true);
        return;
      }

      // Ensure Ctrl+A on focused editor never leaks to whole document
      if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
        if (document.activeElement === inputTextAreaRef.current) {
          e.preventDefault();
          e.stopPropagation();
          inputTextAreaRef.current?.select();
          return;
        }
        if (document.activeElement === outputTextAreaRef.current) {
          e.preventDefault();
          e.stopPropagation();
          outputTextAreaRef.current?.select();
          return;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleFormat]);

  // Sync scroll for input textarea gutter
  const handleInputScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (inputGutterRef.current) {
      inputGutterRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  // Sync scroll for output textarea gutter
  const handleOutputScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (outputGutterRef.current) {
      outputGutterRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  // Handle keys in input textarea
  const handleKeyDownTextarea = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Control + A: explicitly select only the input textarea content
    if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.select();
      return;
    }

    // Tab key: insert indentation spaces
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const spaces = ' '.repeat(indentSize);

      const nextVal = inputCode.substring(0, start) + spaces + inputCode.substring(end);
      setInputCode(nextVal);

      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + spaces.length;
      }, 0);
    }
  };

  // Handle keys in output textarea
  const handleKeyDownOutput = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Control + A: explicitly select only the output formatted content
    if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.select();
    }
  };

  // Copy output
  const handleCopy = () => {
    copyToClipboard(result.formatted);
  };

  // Download output
  const handleDownload = () => {
    if (!result.formatted) return;
    const extMap: Record<FormatterLanguage, string> = {
      auto: 'txt',
      dax: 'dax',
      excel: 'txt',
      sql: 'sql',
      powerquery: 'pq',
      json: 'json',
      python: 'py',
      javascript: 'js',
      markdown: 'md',
      text: 'txt',
    };
    const ext = extMap[result.detectedLanguage] || 'txt';
    const blob = new Blob([result.formatted], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `formatted_${result.detectedLanguage}_${Date.now()}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Quick Minify
  const handleMinify = () => {
    const res = formatUniversal(inputCode, {
      language: selectedLanguage,
      minifyJson: true,
      indentSize: 0,
    });
    setResult(res);
  };

  // Quick Paste
  const handlePaste = async () => {
    try {
      const clip = await navigator.clipboard.readText();
      if (clip) {
        setInputCode(clip);
        handleFormat(clip);
      }
    } catch {
      inputTextAreaRef.current?.focus();
    }
  };

  // Field Normalizer
  const handleNormalizeFields = (mode: 'snake' | 'camel' | 'pascal' | 'upper' | 'title') => {
    let converted = inputCode;
    switch (mode) {
      case 'snake':
        converted = toSnakeCase(inputCode);
        break;
      case 'camel':
        converted = toCamelCase(inputCode);
        break;
      case 'pascal': {
        const c = toCamelCase(inputCode);
        converted = c.charAt(0).toUpperCase() + c.slice(1);
        break;
      }
      case 'upper':
        converted = toSnakeCase(inputCode).toUpperCase();
        break;
      case 'title':
        converted = toTitleCase(inputCode);
        break;
    }
    setInputCode(converted);
    handleFormat(converted);
  };

  // Calculate line numbers
  const inputLineCount = useMemo(() => {
    return inputCode ? inputCode.split('\n').length : 1;
  }, [inputCode]);

  const outputLineCount = useMemo(() => {
    return result.formatted ? result.formatted.split('\n').length : 1;
  }, [result.formatted]);

  // Diff lines generator
  const diffLines = useMemo(() => {
    if (!showDiff) return [];
    const inLines = inputCode.split('\n');
    const outLines = result.formatted.split('\n');
    const max = Math.max(inLines.length, outLines.length);
    const diffs: { type: 'added' | 'removed' | 'same'; text: string }[] = [];

    for (let i = 0; i < max; i++) {
      const inL = inLines[i];
      const outL = outLines[i];
      if (inL === outL) {
        diffs.push({ type: 'same', text: inL || '' });
      } else {
        if (inL !== undefined) diffs.push({ type: 'removed', text: `- ${inL}` });
        if (outL !== undefined) diffs.push({ type: 'added', text: `+ ${outL}` });
      }
    }
    return diffs;
  }, [showDiff, inputCode, result.formatted]);

  const languages: { id: FormatterLanguage; label: string; icon: React.ReactNode }[] = [
    { id: 'auto', label: 'Auto-Detect', icon: <Sparkles size={14} /> },
    { id: 'dax', label: 'DAX (Power BI)', icon: <FileSpreadsheet size={14} /> },
    { id: 'excel', label: 'Excel Formula', icon: <FileSpreadsheet size={14} /> },
    { id: 'sql', label: 'SQL', icon: <Database size={14} /> },
    { id: 'powerquery', label: 'Power Query (M)', icon: <FileCode size={14} /> },
    { id: 'json', label: 'JSON / Schema', icon: <Braces size={14} /> },
    { id: 'python', label: 'Python / Pandas', icon: <Code2 size={14} /> },
    { id: 'markdown', label: 'Markdown & Tables', icon: <FileCode size={14} /> },
  ];

  return (
    <div className="formatter-view">
      {/* Top Header */}
      <header className="formatter-header">
        <div className="formatter-title-group">
          <div className="formatter-title-row">
            <h1 className="formatter-title">Universal Text & Code Formatter</h1>
            <span className="formatter-badge">Data Professional Edition</span>
          </div>
          <p className="formatter-subtitle">
            Format, beautify, and validate DAX Measures, Excel Formulas, SQL Queries, Power Query (M), Python DataFrames, and JSON schemas instantly.
          </p>
        </div>

        <div className="formatter-header-actions">
          {/* Preset Selector */}
          <select
            className="formatter-select"
            onChange={(e) => {
              const preset = PRESETS.find((p) => p.id === e.target.value);
              if (preset) {
                setInputCode(preset.code);
                setSelectedLanguage(preset.language);
                handleFormat(preset.code, preset.language);
              }
            }}
            defaultValue={PRESETS[0].id}
            title="Load Data Professional Sample Presets"
          >
            {PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {/* Auto-Copied Feedback Badge */}
          {copied && (
            <span className="formatter-copied-badge" title="Output has been copied to your clipboard">
              <Check size={13} />
              <span>Copied to Clipboard!</span>
            </span>
          )}

          {/* Primary Format Button */}
          <button
            type="button"
            className="formatter-icon-btn primary"
            onClick={() => handleFormat(undefined, undefined, true)}
            title="Format Now & Copy (Ctrl + Enter)"
          >
            <Play size={14} />
            <span>Format (Ctrl+Enter)</span>
          </button>
        </div>
      </header>

      {/* Controls Bar */}
      <div className="formatter-controls-bar">
        {/* Language Tabs */}
        <div className="formatter-languages">
          {languages.map((lang) => (
            <button
              key={lang.id}
              type="button"
              className={`formatter-lang-btn ${selectedLanguage === lang.id ? 'active' : ''}`}
              onClick={() => {
                setSelectedLanguage(lang.id);
                handleFormat(inputCode, lang.id);
              }}
            >
              {lang.icon}
              <span>{lang.label}</span>
            </button>
          ))}
        </div>

        {/* Formatting Options */}
        <div className="formatter-options-group">
          {/* Indent Size */}
          <select
            className="formatter-select"
            value={indentSize}
            onChange={(e) => setIndentSize(Number(e.target.value))}
            title="Indentation Spaces"
          >
            <option value={2}>2 Spaces</option>
            <option value={4}>4 Spaces (Standard)</option>
          </select>

          {/* Uppercase Keywords */}
          <label className="formatter-toggle-label" title="Capitalize Keywords (e.g. CALCULATE, SELECT, FILTER)">
            <input
              type="checkbox"
              checked={uppercaseKeywords}
              onChange={(e) => setUppercaseKeywords(e.target.checked)}
            />
            <span>Uppercase Keywords</span>
          </label>

          {/* Auto-fix Typos */}
          <label className="formatter-toggle-label" title="Auto-fix common typos (e.g. Greate -> Greater)">
            <input
              type="checkbox"
              checked={fixTypos}
              onChange={(e) => setFixTypos(e.target.checked)}
            />
            <span>Auto-fix Typos</span>
          </label>

          {/* Live Format */}
          <label className="formatter-toggle-label" title="Automatically format on typing">
            <input
              type="checkbox"
              checked={liveFormat}
              onChange={(e) => setLiveFormat(e.target.checked)}
            />
            <span>Live Format</span>
          </label>

          {/* Auto-Copy Toggle */}
          <label className="formatter-toggle-label" title="Automatically copy formatted result to clipboard upon formatting">
            <input
              type="checkbox"
              checked={autoCopy}
              onChange={(e) => setAutoCopy(e.target.checked)}
            />
            <span>Auto-Copy</span>
          </label>

          {/* Field Normalizer Tool */}
          <select
            className="formatter-select"
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) {
                handleNormalizeFields(e.target.value as any);
                e.target.value = '';
              }
            }}
            title="Transform Field & Column Case"
          >
            <option value="" disabled>
              Field Case Normalizer...
            </option>
            <option value="snake">snake_case (SQL / BigQuery)</option>
            <option value="pascal">PascalCase (Power BI / Tabular)</option>
            <option value="camel">camelCase (JSON APIs)</option>
            <option value="upper">UPPER_CASE (Constants)</option>
            <option value="title">Title Case (Report Names)</option>
          </select>
        </div>
      </div>

      {/* Main Workbench: Split Editor */}
      <div className="formatter-workbench">
        {/* Left Pane: Input */}
        <div className="formatter-pane">
          <div className="formatter-pane-header">
            <div className="formatter-pane-title-group">
              <span className="formatter-pane-title">Raw Input</span>
              <span className="formatter-stat-pill">{inputLineCount} lines</span>
              <span className="formatter-stat-pill">{inputCode.length} chars</span>
            </div>

            <div className="formatter-pane-actions">
              <button
                type="button"
                className="formatter-icon-btn"
                onClick={handlePaste}
                title="Paste from clipboard"
              >
                <span>Paste</span>
              </button>
              <button
                type="button"
                className="formatter-icon-btn"
                onClick={() => {
                  setInputCode('');
                  setResult(formatUniversal('', { language: selectedLanguage }));
                }}
                title="Clear input"
              >
                <Trash2 size={13} />
                <span>Clear</span>
              </button>
            </div>
          </div>

          <div
            className="formatter-editor-container"
            onClick={() => inputTextAreaRef.current?.focus()}
          >
            {/* Gutter Line Numbers */}
            <div className="formatter-gutter" ref={inputGutterRef}>
              {Array.from({ length: inputLineCount }, (_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>

            {/* Input Textarea */}
            <textarea
              ref={inputTextAreaRef}
              className="formatter-textarea"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              onScroll={handleInputScroll}
              onKeyDown={handleKeyDownTextarea}
              placeholder="Paste your DAX measure, SQL query, Power Query M code, JSON payload, or Python script here..."
              spellCheck={false}
            />
          </div>
        </div>

        {/* Right Pane: Formatted Output */}
        <div className="formatter-pane">
          <div className="formatter-pane-header">
            <div className="formatter-pane-title-group">
              <span className="formatter-pane-title">Formatted Result</span>
              <span className="formatter-stat-pill">
                Language: <strong>{result.detectedLanguage.toUpperCase()}</strong>
              </span>
              <span className="formatter-stat-pill">{result.executionMs}ms</span>
              {result.repaired && <span className="formatter-success-badge">Repaired JSON syntax</span>}
              {result.error && <span className="formatter-alert-badge">{result.error}</span>}
            </div>

            <div className="formatter-pane-actions">
              {/* Diff View Toggle */}
              <button
                type="button"
                className={`formatter-icon-btn ${showDiff ? 'primary' : ''}`}
                onClick={() => setShowDiff(!showDiff)}
                title="Toggle Before vs After Diff View"
              >
                <Columns2 size={13} />
                <span>Diff View</span>
              </button>

              {/* Minify Button */}
              {(result.detectedLanguage === 'json' || result.detectedLanguage === 'sql') && (
                <button
                  type="button"
                  className="formatter-icon-btn"
                  onClick={handleMinify}
                  title="Minify / Compact into single line"
                >
                  <span>Minify</span>
                </button>
              )}

              {/* Download Button */}
              <button
                type="button"
                className="formatter-icon-btn"
                onClick={handleDownload}
                title="Download formatted file"
              >
                <Download size={13} />
                <span>Save</span>
              </button>

              {/* Copy Button */}
              <button
                type="button"
                className="formatter-icon-btn primary"
                onClick={handleCopy}
                title="Copy formatted code to clipboard"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
          </div>

          <div
            className="formatter-editor-container"
            onClick={() => outputTextAreaRef.current?.focus()}
          >
            {showDiff ? (
              <div className="formatter-diff-view">
                {diffLines.map((line, idx) => (
                  <div key={idx} className={`diff-line diff-${line.type}`}>
                    {line.text || ' '}
                  </div>
                ))}
              </div>
            ) : (
              <>
                {/* Gutter Line Numbers */}
                <div className="formatter-gutter" ref={outputGutterRef}>
                  {Array.from({ length: outputLineCount }, (_, i) => (
                    <div key={i}>{i + 1}</div>
                  ))}
                </div>

                {/* Formatted Output Textarea (readOnly) */}
                <textarea
                  ref={outputTextAreaRef}
                  className="formatter-textarea formatter-output-textarea"
                  value={result.formatted}
                  readOnly
                  spellCheck={false}
                  onScroll={handleOutputScroll}
                  onKeyDown={handleKeyDownOutput}
                  placeholder="Formatted result will appear here..."
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Footer Status Bar */}
      <footer className="formatter-status-bar">
        <div className="formatter-status-left">
          <div className="formatter-status-item">
            <CheckCircle2 size={13} color="#10b981" />
            <span>
              Engine: <strong>Local Deterministic Lexer</strong> (No network latency, 100% private)
            </span>
          </div>
          <div className="formatter-status-item">
            <span>
              Status: {result.changed ? '✨ Formatted & Polished' : 'Ready'}
            </span>
          </div>
        </div>

        <div className="formatter-status-right">
          <div className="formatter-status-item">
            <span>Tip: Press <strong>Ctrl+Enter</strong> to format anywhere</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
