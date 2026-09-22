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

  // 1. Power Query (M) Detection:
  const pqPatterns = [
    /^\s*let\b[\s\S]*?\bin\b/i,
    /#"[^"]+"\s*=/i,
    /Table\.(SelectRows|AddColumn|NestedJoin|TransformColumnTypes|RenameColumns|FromRows|FromRecords|ExpandTableColumn)/,
  ];
  if (pqPatterns.some((pattern) => pattern.test(trimmed))) {
    return 'powerquery';
  }

  // 2. DAX (Power BI) Detection - HIGHEST PRIORITY FOR FORMULAS & MEASURES:
  // a) DAX Core & Signature Functions
  const daxCoreFunctions = /\b(CALCULATE|CALCULATETABLE|DIVIDE|FILTER|ALL|ALLEXCEPT|ALLSELECTED|ALLNOBLANKROW|SUMX|AVERAGEX|COUNTX|COUNTAX|MINX|MAXX|MEDIANX|PRODUCTX|RANKX|CONCATENATEX|GEOMETRICMEANX|COUNTROWS|COUNTBLANK|DISTINCTCOUNT|DISTINCTCOUNTNOBLANK|DATESYTD|DATESMTD|DATESQTD|TOTALYTD|TOTALMTD|TOTALQTD|SAMEPERIODLASTYEAR|DATEADD|DATEDIFF|DATESBETWEEN|DATESINPERIOD|PARALLELPERIOD|PREVIOUSDAY|PREVIOUSMONTH|PREVIOUSQUARTER|PREVIOUSYEAR|NEXTDAY|NEXTMONTH|NEXTQUARTER|NEXTYEAR|OPENINGBALANCEMONTH|OPENINGBALANCEYEAR|CLOSINGBALANCEMONTH|CLOSINGBALANCEYEAR|RELATED|RELATEDTABLE|USERELATIONSHIP|CROSSFILTER|KEEPFILTERS|REMOVEFILTERS|TREATAS|SELECTEDVALUE|HASONEVALUE|HASONEFILTER|ISINSCOPE|ISFILTERED|ISCROSSFILTERED|LOOKUPVALUE|SUMMARIZE|SUMMARIZECOLUMNS|ADDCOLUMNS|SELECTCOLUMNS|GENERATE|GENERATEALL|ROW|DATATABLE|TOPN|EARLIER|EARLIEST|BLANK|ISBLANK|COALESCE|ROLLUP|ROLLUPGROUP|SUBSTITUTEWITHINDEX|COMBINEVALUES|CUSTOMDATA)\s*\(/i;

  // b) Check for Measure Assignment Header: e.g. "Selected % = ...", "Total Sales = ...", "[Growth %] = ..."
  const measureHeaderMatch = trimmed.match(/^(\[?[a-zA-Z0-9_\s%#$@\.\-\/\(\)&+]+\]?)\s*=\s*([\s\S]+)$/);
  let isDaxMeasure = false;
  if (
    measureHeaderMatch &&
    !/^\s*(const|let|var)\s+/i.test(trimmed) &&
    !/==/.test(measureHeaderMatch[1])
  ) {
    const header = measureHeaderMatch[1].trim();
    const body = measureHeaderMatch[2].trim();

    const headerLooksLikeMeasure =
      /(\s|[%#$]|\[[^\]]+\])/.test(header) ||
      /^(sales|total|ytd|margin|growth|measure|qty|revenue|profit|count|avg|target|actual)/i.test(header);

    const bodyLooksLikeDax =
      daxCoreFunctions.test(body) ||
      /\[[^\]]+\]/.test(body) ||
      /'[^']+'\s*\[/.test(body) ||
      /\b(SUM|AVERAGE|MIN|MAX|COUNT|IF|SWITCH|BLANK|TRUE|FALSE|DIVIDE|CALCULATE|FILTER)\s*\(/i.test(body);

    if (headerLooksLikeMeasure || bodyLooksLikeDax) {
      isDaxMeasure = true;
    }
  }

  const hasDaxTableColumn = /'[^']+'\s*\[[^\]]+\]/.test(trimmed);
  const hasDaxVarReturn = /\bVAR\b[\s\S]*?\bRETURN\b/i.test(trimmed);
  const hasDaxEvaluate = /^\s*(EVALUATE|DEFINE\s+MEASURE)\b/i.test(trimmed);
  const hasDaxMeasureRef = /(?:^|[=+\-*/(,\s])\[[a-zA-Z0-9_\s%#$@\.\-\/]+\]/.test(trimmed) &&
    !/\[@[^\]]+\]/.test(trimmed);

  // Excel coordinates and Excel-specific signatures:
  const hasExcelCellCoords = /\b\$?[A-Z]+\$?[0-9]+(?::\$?[A-Z]+\$?[0-9]+)?\b/i.test(trimmed) || /!\$?[A-Z]+\$?[0-9]+/i.test(trimmed);
  const hasExcelStructuredRowRef = /\[@[^\]]+\]/.test(trimmed);
  const excelSpecificFunctions = /\b(XLOOKUP|VLOOKUP|HLOOKUP|XMATCH|MATCH|INDEX|LET|LAMBDA|CHOOSECOLS|CHOOSEROWS|HSTACK|VSTACK|TEXTJOIN|TEXTSPLIT|COUNTIF|COUNTIFS|SUMIF|SUMIFS|AVERAGEIF|AVERAGEIFS|SUMPRODUCT|FILTERXML|INDIRECT|OFFSET|ADDRESS|TRANSPOSE|SORTBY|SEQUENCE|UNIQUE)\s*\(/i;

  // If it's a DAX measure declaration
  if (isDaxMeasure) {
    return 'dax';
  }

  // If it has DAX-specific core functions (DIVIDE, CALCULATE, etc. take precedence even if prefixed with =)
  if (daxCoreFunctions.test(trimmed)) {
    return 'dax';
  }

  // If it has 'Table'[Column], VAR...RETURN, or EVALUATE
  if (hasDaxTableColumn || hasDaxVarReturn || hasDaxEvaluate) {
    return 'dax';
  }

  // If it has bracketed measure references [Measure] and lacks Excel cell coordinates / Excel-only functions
  if (hasDaxMeasureRef && !hasExcelCellCoords && !hasExcelStructuredRowRef && !excelSpecificFunctions.test(trimmed)) {
    return 'dax';
  }

  // 3. Excel Formula Detection:
  if (
    excelSpecificFunctions.test(trimmed) ||
    hasExcelCellCoords ||
    hasExcelStructuredRowRef ||
    /^=\s*[A-Z_]/i.test(trimmed)
  ) {
    return 'excel';
  }

  // 4. SQL Detection:
  const sqlPatterns = [
    /\b(SELECT|WITH)\b[\s\S]*?\bFROM\b/i,
    /\bINSERT\s+INTO\b/i,
    /\bUPDATE\s+[\w.]+\s+SET\b/i,
    /\bDELETE\s+FROM\b/i,
    /\bCREATE\s+TABLE\b/i,
    /\bALTER\s+TABLE\b/i,
  ];
  if (sqlPatterns.some((pattern) => pattern.test(trimmed))) {
    return 'sql';
  }

  // 5. JSON Detection:
  if (trimmed.startsWith('{')) {
    try {
      JSON.parse(trimmed);
      return 'json';
    } catch {
      if (/^\{\s*["']?[\w$-]+["']?\s*:/m.test(trimmed)) {
        return 'json';
      }
    }
  } else if (trimmed.startsWith('[')) {
    // Array: check if valid JSON or array of objects/primitives, NOT a DAX bracket reference
    const isDaxBracket = /^\[[^\]]+\]\s*(=|\+|-|\*|\/|,|\)|&&|\|\||$)/.test(trimmed) ||
                         /\[[^\]]+\]\s*$/.test(trimmed);
    if (!isDaxBracket) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return 'json';
      } catch {
        if (/^\[\s*\{/.test(trimmed) || /^\[\s*["'\d\-\]]/m.test(trimmed)) {
          return 'json';
        }
      }
    }
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
