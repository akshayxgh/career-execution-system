import { formatDax, type DaxFormatOptions } from './daxFormatter';
import { formatSql, type SqlFormatOptions } from './sqlFormatter';
import { formatJson, type JsonFormatOptions } from './jsonFormatter';
import { formatPython, type PythonFormatOptions } from './pythonFormatter';
import { formatJavascript, type JsFormatOptions } from './javascriptFormatter';
import { formatPowerQueryM } from './mCodeFormatter';
import { formatExcelFormula, type ExcelFormatOptions } from './excelFormatter';
import {
  cleanGeneralText,
  formatMarkdownTable,
  toTitleCase,
  toSentenceCase,
  toCamelCase,
  toSnakeCase,
  toKebabCase,
  type TextTransformMode,
} from './textMarkdownFormatter';

export type FormatterLanguage =
  | 'auto'
  | 'dax'
  | 'excel'
  | 'sql'
  | 'powerquery'
  | 'json'
  | 'python'
  | 'javascript'
  | 'markdown'
  | 'text';

export interface UniversalFormatterOptions {
  language?: FormatterLanguage;
  indentSize?: number;
  uppercaseKeywords?: boolean;
  fixTypos?: boolean;
  textMode?: TextTransformMode;
  minifyJson?: boolean;
  repairJson?: boolean;
}

export interface UniversalFormatterResult {
  formatted: string;
  detectedLanguage: FormatterLanguage;
  executionMs: number;
  lineCount: number;
  charCount: number;
  changed: boolean;
  isValid?: boolean;
  error?: string;
  repaired?: boolean;
}

export function detectLanguage(input: string): FormatterLanguage {
  const trimmed = input.trim();
  if (!trimmed) return 'text';

  // 1. JSON Detection: starts with { or [ and parseable or looks like JSON
  if (/^[\{\[]/.test(trimmed)) {
    try {
      JSON.parse(trimmed);
      return 'json';
    } catch {
      if (/[":\[\]\{\}]/.test(trimmed)) {
        return 'json';
      }
    }
  }

  // 2. Power Query (M) Detection:
  const pqPatterns = [
    /^\s*let\b[\s\S]*?\bin\b/i,
    /#"[^"]+"\s*=/i,
    /Table\.(SelectRows|AddColumn|NestedJoin|TransformColumnTypes|RenameColumns)/,
  ];
  if (pqPatterns.some((pattern) => pattern.test(trimmed))) {
    return 'powerquery';
  }

  // 3. DAX Detection:
  // Key DAX signatures: CALCULATE, FILTER, ALLEXCEPT, SUMX, DATESYTD, 'Table'[Col], [Measure], VAR ... RETURN
  const daxPatterns = [
    /\b(CALCULATE|CALCULATETABLE|FILTER|ALLEXCEPT|ALLSELECTED|SUMX|AVERAGEX|COUNTROWS|DATESYTD|SAMEPERIODLASTYEAR|RELATED|RELATEDTABLE|KEEPFILTERS)\s*\(/i,
    /'[^']+'\s*\[[^\]]+\]/, // 'Table'[Column]
    /\bVAR\b[\s\S]*?\bRETURN\b/i,
    /^\s*[a-zA-Z0-9_\s]+\s*=\s*(CALCULATE|SUM|AVERAGE|FILTER|VAR)/i,
  ];
  if (daxPatterns.some((pattern) => pattern.test(trimmed))) {
    return 'dax';
  }

  // 4. Excel Formula Detection:
  const excelPatterns = [
    /^=\s*(IF|IFS|IFERROR|XLOOKUP|VLOOKUP|HLOOKUP|INDEX|MATCH|XMATCH|SUM|SUMIF|SUMIFS|COUNTIF|COUNTIFS|AVERAGEIFS|LET|LAMBDA|CHOOSE|CHOOSECOLS|HSTACK|VSTACK|TEXTJOIN|TEXTSPLIT)\s*\(/i,
    /!\$?[A-Z]+\$?[0-9]+/i, // Sheet!A1
    /\b[A-Z]+\d+:[A-Z]+\d+\b/, // A1:B10
  ];
  if (excelPatterns.some((pattern) => pattern.test(trimmed))) {
    return 'excel';
  }

  // 5. SQL Detection:
  const sqlPatterns = [
    /\bSELECT\b[\s\S]*?\bFROM\b/i,
    /\bINSERT\s+INTO\b/i,
    /\bUPDATE\s+[\w.]+\s+SET\b/i,
    /\bDELETE\s+FROM\b/i,
    /\bCREATE\s+TABLE\b/i,
  ];
  if (sqlPatterns.some((pattern) => pattern.test(trimmed))) {
    return 'sql';
  }

  // 6. Python Detection:
  const pythonPatterns = [
    /\bdef\s+[a-zA-Z_]\w*\s*\([^)]*\)\s*:/,
    /\bimport\s+[a-zA-Z_]\w*(\s+as\s+[a-zA-Z_]\w*)?/,
    /\bfrom\s+[a-zA-Z_]\w*\s+import\b/,
    /\bif\s+__name__\s*==\s*['"]__main__['"]\s*:/,
    /\belif\b[\s\S]*?:/,
  ];
  if (pythonPatterns.some((pattern) => pattern.test(trimmed))) {
    return 'python';
  }

  // 7. JavaScript / TypeScript Detection:
  const jsPatterns = [
    /\b(const|let|var)\s+[a-zA-Z_$][a-zA-Z0-9_$]*\s*=/,
    /\bfunction\s+[a-zA-Z_$][a-zA-Z0-9_$]*\s*\(/,
    /=>\s*[{]/,
    /\bconsole\.(log|error|warn)\s*\(/,
    /\bimport\s+.*\s+from\s+['"].*['"]/,
  ];
  if (jsPatterns.some((pattern) => pattern.test(trimmed))) {
    return 'javascript';
  }

  // 8. Markdown Detection:
  if (/^#+\s+|\b\|.*\|.*\|\b|\[.*\]\(http.*\)|\*\*.*\*\*/m.test(trimmed)) {
    return 'markdown';
  }

  return 'text';
}

export function formatUniversal(
  input: string,
  options: UniversalFormatterOptions = {}
): UniversalFormatterResult {
  const startTime = performance.now();
  const rawLanguage = options.language ?? 'auto';
  const effectiveLanguage = rawLanguage === 'auto' ? detectLanguage(input) : rawLanguage;

  let formatted = input;
  let isValid = true;
  let error: string | undefined;
  let repaired = false;

  const indentSize = options.indentSize ?? (effectiveLanguage === 'dax' || effectiveLanguage === 'python' || effectiveLanguage === 'powerquery' || effectiveLanguage === 'excel' ? 4 : 2);
  const uppercaseKeywords = options.uppercaseKeywords ?? true;
  const fixTypos = options.fixTypos ?? true;

  switch (effectiveLanguage) {
    case 'dax': {
      const daxOpts: DaxFormatOptions = {
        indentSize,
        uppercaseKeywords,
        fixTypos,
        wrapLogicalOperators: true,
      };
      formatted = formatDax(input, daxOpts);
      break;
    }
    case 'excel': {
      const excelOpts: ExcelFormatOptions = {
        indentSize,
        uppercaseFunctions: uppercaseKeywords,
        fixTypos,
        spaceAroundOperators: true,
      };
      formatted = formatExcelFormula(input, excelOpts);
      break;
    }
    case 'powerquery': {
      formatted = formatPowerQueryM(input, { indentSize });
      break;
    }
    case 'sql': {
      const sqlOpts: SqlFormatOptions = {
        indentSize,
        uppercaseKeywords,
        fixTypos,
      };
      formatted = formatSql(input, sqlOpts);
      break;
    }
    case 'json': {
      const jsonOpts: JsonFormatOptions = {
        indentSize,
        minify: options.minifyJson ?? false,
        repair: options.repairJson ?? true,
      };
      const res = formatJson(input, jsonOpts);
      formatted = res.formatted;
      isValid = res.isValid;
      error = res.error;
      repaired = res.repaired ?? false;
      break;
    }
    case 'python': {
      const pyOpts: PythonFormatOptions = { indentSize };
      formatted = formatPython(input, pyOpts);
      break;
    }
    case 'javascript': {
      const jsOpts: JsFormatOptions = { indentSize };
      formatted = formatJavascript(input, jsOpts);
      break;
    }
    case 'markdown': {
      if (input.includes('|') && input.includes('-')) {
        formatted = formatMarkdownTable(input);
      } else {
        formatted = cleanGeneralText(input);
      }
      break;
    }
    case 'text':
    default: {
      const mode = options.textMode ?? 'clean';
      switch (mode) {
        case 'titleCase':
          formatted = toTitleCase(input);
          break;
        case 'sentenceCase':
          formatted = toSentenceCase(input);
          break;
        case 'upperCase':
          formatted = input.toUpperCase();
          break;
        case 'lowerCase':
          formatted = input.toLowerCase();
          break;
        case 'camelCase':
          formatted = toCamelCase(input);
          break;
        case 'snakeCase':
          formatted = toSnakeCase(input);
          break;
        case 'kebabCase':
          formatted = toKebabCase(input);
          break;
        case 'markdownTable':
          formatted = formatMarkdownTable(input);
          break;
        case 'clean':
        default:
          formatted = cleanGeneralText(input);
          break;
      }
      break;
    }
  }

  const endTime = performance.now();
  const executionMs = Math.round((endTime - startTime) * 100) / 100;
  const lineCount = formatted ? formatted.split('\n').length : 0;
  const charCount = formatted.length;
  const changed = formatted !== input;

  return {
    formatted,
    detectedLanguage: effectiveLanguage,
    executionMs,
    lineCount,
    charCount,
    changed,
    isValid,
    error,
    repaired,
  };
}

export * from './daxFormatter';
export * from './excelFormatter';
export * from './sqlFormatter';
export * from './jsonFormatter';
export * from './pythonFormatter';
export * from './javascriptFormatter';
export * from './mCodeFormatter';
export * from './textMarkdownFormatter';
