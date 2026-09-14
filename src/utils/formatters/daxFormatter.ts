// Professional DAX Formatter Engine
// Formats Power BI / Analysis Services DAX expressions according to Microsoft & SQLBI best practices.

const DAX_KEYWORDS = new Set([
  'CALCULATE', 'CALCULATETABLE', 'FILTER', 'ALL', 'ALLEXCEPT', 'ALLSELECTED', 'ALLNOBLANKROW',
  'VALUES', 'DISTINCT', 'RELATED', 'RELATEDTABLE', 'USERELATIONSHIP', 'CROSSFILTER',
  'SUM', 'SUMX', 'AVERAGE', 'AVERAGEX', 'COUNT', 'COUNTA', 'COUNTAX', 'COUNTROWS', 'COUNTBLANK', 'DISTINCTCOUNT',
  'MIN', 'MINX', 'MAX', 'MAXX', 'MEDIAN', 'MEDIANX',
  'DIVIDE', 'IF', 'IFERROR', 'SWITCH', 'TRUE', 'FALSE', 'BLANK', 'ISBLANK', 'NOT', 'AND', 'OR',
  'VAR', 'RETURN', 'EVALUATE', 'DEFINE', 'MEASURE', 'ORDER BY',
  'DATEADD', 'DATESYTD', 'DATESMTD', 'DATESQTD', 'SAMEPERIODLASTYEAR', 'TOTALYTD', 'TOTALMTD', 'TOTALQTD',
  'PARALLELPERIOD', 'PREVIOUSDAY', 'PREVIOUSMONTH', 'PREVIOUSYEAR', 'NEXTDAY', 'NEXTMONTH', 'NEXTYEAR',
  'CLOSINGBALANCEMONTH', 'CLOSINGBALANCEYEAR', 'OPENINGBALANCEMONTH', 'OPENINGBALANCEYEAR',
  'KEEPFILTERS', 'REMOVEFILTERS', 'SELECTEDVALUE', 'HASONEVALUE', 'ISINSCOPE', 'ISFILTERED', 'ISCROSSFILTERED',
  'LOOKUPVALUE', 'TREATAS', 'CONTAINS', 'CONTAINSROW', 'IN', 'EXCEPT', 'INTERSECT', 'UNION', 'NATURALINNERJOIN',
  'NATURALLEFTOUTERJOIN', 'SUMMARIZE', 'SUMMARIZECOLUMNS', 'ADDCOLUMNS', 'SELECTCOLUMNS', 'ROW', 'DATATABLE',
  'TOPN', 'GENERATE', 'GENERATEALL', 'CROSSJOIN', 'EARLIER', 'EARLIEST',
  'RANKX', 'WINDOW', 'OFFSET', 'INDEX', 'RANK', 'ROWNUMBER',
  'FORMAT', 'LEFT', 'RIGHT', 'MID', 'LEN', 'LOWER', 'UPPER', 'TRIM', 'CONCATENATE', 'CONCATENATEX',
  'EXACT', 'FIND', 'SEARCH', 'REPLACE', 'SUBSTITUTE', 'UNICHAR', 'COMBINEVALUES',
  'DATE', 'TIME', 'YEAR', 'MONTH', 'DAY', 'HOUR', 'MINUTE', 'SECOND', 'WEEKDAY', 'WEEKNUM', 'TODAY', 'NOW', 'EDATE', 'EOMONTH',
  'COALESCE', 'ERROR'
]);

export interface DaxFormatOptions {
  indentSize?: number; // default 4
  uppercaseKeywords?: boolean; // default true
  fixTypos?: boolean; // default true
  wrapLogicalOperators?: boolean; // default true (&& and || on new lines inside filters)
}

// Common typo corrections in DAX expressions & measure headers
const TYPO_MAP: Record<string, string> = {
  'greate': 'Greater',
  'greator': 'Greater',
  'total': 'Total',
  'sum': 'Sum',
  'calc': 'Calc',
  'calclate': 'CALCULATE',
  'claculate': 'CALCULATE',
  'filtre': 'FILTER',
  'realted': 'RELATED',
  'devide': 'DIVIDE',
  'retun': 'RETURN',
};

export function formatDax(input: string, options: DaxFormatOptions = {}): string {
  if (!input || !input.trim()) return '';

  const indentSize = options.indentSize ?? 4;
  const uppercaseKeywords = options.uppercaseKeywords ?? true;
  const fixTypos = options.fixTypos ?? true;
  const wrapLogical = options.wrapLogicalOperators ?? true;
  const indentStr = ' '.repeat(indentSize);

  let raw = input.trim();

  // 1. Separate Measure Header if present:
  // e.g. "Greate Sales In East = CALCULATE ( ... )"
  let measureHeader = '';
  let expressionPart = raw;

  // Match: Measure Name = (can be multiline or single line)
  const headerMatch = raw.match(/^([^=]+?)\s*=\s*([\s\S]*)$/);
  if (headerMatch && !headerMatch[1].includes('(') && !headerMatch[1].includes(',')) {
    let headerName = headerMatch[1].trim();

    if (fixTypos) {
      // Fix common typos in header, like "Greate" -> "Greater"
      const words = headerName.split(/\s+/);
      const fixedWords = words.map(w => {
        const lower = w.toLowerCase();
        if (TYPO_MAP[lower]) {
          // Preserve casing intent
          return TYPO_MAP[lower];
        }
        return w;
      });
      headerName = fixedWords.join(' ');
    }

    measureHeader = `${headerName} =`;
    expressionPart = headerMatch[2].trim();
  }

  // 2. Normalize table and column spacing:
  // e.g. 'Table' [Region] -> 'Table'[Region]
  // e.g. 'Table'   [Region] -> 'Table'[Region]
  expressionPart = expressionPart.replace(/'([^']+)'\s+\[/g, "'$1'[");

  // e.g. 'Table','Table' -> 'Table', 'Table'
  expressionPart = expressionPart.replace(/,([^\s])/g, ', $1');

  // e.g. CALCULATE ( -> CALCULATE(
  expressionPart = expressionPart.replace(/\b([A-Za-z_][A-Za-z0-9_]*)\s+\(/g, '$1(');

  // 3. Tokenize expression preserving strings, brackets, comments, identifiers, operators
  interface Token {
    type: 'string' | 'bracket' | 'table' | 'identifier' | 'operator' | 'comma' | 'paren_open' | 'paren_close' | 'whitespace' | 'other';
    value: string;
  }

  const tokens: Token[] = [];
  let i = 0;
  const n = expressionPart.length;

  while (i < n) {
    const char = expressionPart[i];

    // String: "..."
    if (char === '"') {
      let str = '"';
      i++;
      while (i < n && expressionPart[i] !== '"') {
        if (expressionPart[i] === '\\' && i + 1 < n) {
          str += expressionPart[i] + expressionPart[i + 1];
          i += 2;
        } else {
          str += expressionPart[i];
          i++;
        }
      }
      if (i < n) {
        str += '"';
        i++;
      }
      tokens.push({ type: 'string', value: str });
      continue;
    }

    // Table reference: '...'
    if (char === "'") {
      let tbl = "'";
      i++;
      while (i < n && expressionPart[i] !== "'") {
        tbl += expressionPart[i];
        i++;
      }
      if (i < n) {
        tbl += "'";
        i++;
      }
      tokens.push({ type: 'table', value: tbl });
      continue;
    }

    // Measure/Column bracket: [...]
    if (char === '[') {
      let b = '[';
      i++;
      while (i < n && expressionPart[i] !== ']') {
        b += expressionPart[i];
        i++;
      }
      if (i < n) {
        b += ']';
        i++;
      }
      tokens.push({ type: 'bracket', value: b });
      continue;
    }

    // Parentheses
    if (char === '(') {
      tokens.push({ type: 'paren_open', value: '(' });
      i++;
      continue;
    }
    if (char === ')') {
      tokens.push({ type: 'paren_close', value: ')' });
      i++;
      continue;
    }

    // Comma
    if (char === ',') {
      tokens.push({ type: 'comma', value: ',' });
      i++;
      continue;
    }

    // Multi-char operators: &&, ||, ==, <=, >=, <>
    if (char === '&' && expressionPart[i + 1] === '&') {
      tokens.push({ type: 'operator', value: '&&' });
      i += 2;
      continue;
    }
    if (char === '|' && expressionPart[i + 1] === '|') {
      tokens.push({ type: 'operator', value: '||' });
      i += 2;
      continue;
    }
    if (char === '<' && expressionPart[i + 1] === '=') {
      tokens.push({ type: 'operator', value: '<=' });
      i += 2;
      continue;
    }
    if (char === '>' && expressionPart[i + 1] === '=') {
      tokens.push({ type: 'operator', value: '>=' });
      i += 2;
      continue;
    }
    if (char === '<' && expressionPart[i + 1] === '>') {
      tokens.push({ type: 'operator', value: '<>' });
      i += 2;
      continue;
    }
    if (char === '=' && expressionPart[i + 1] === '=') {
      tokens.push({ type: 'operator', value: '==' });
      i += 2;
      continue;
    }

    // Single-char operators: =, >, <, +, -, *, /, ^
    if ('=><+-*/^'.includes(char)) {
      tokens.push({ type: 'operator', value: char });
      i++;
      continue;
    }

    // Identifiers (functions, keywords, variables)
    if (/[a-zA-Z_]/.test(char)) {
      let id = '';
      while (i < n && /[a-zA-Z0-9_]/.test(expressionPart[i])) {
        id += expressionPart[i];
        i++;
      }
      tokens.push({ type: 'identifier', value: id });
      continue;
    }

    // Numbers
    if (/[0-9]/.test(char)) {
      let num = '';
      while (i < n && /[0-9.]/.test(expressionPart[i])) {
        num += expressionPart[i];
        i++;
      }
      tokens.push({ type: 'other', value: num });
      continue;
    }

    // Whitespace
    if (/\s/.test(char)) {
      i++;
      continue;
    }

    tokens.push({ type: 'other', value: char });
    i++;
  }

  // 4. Transform and Format Tokens
  interface Scope {
    funcName: string;
    argIndex: number;
    depth: number;
    multiline: boolean;
  }

  const scopeStack: Scope[] = [];
  let currentIndent = 0;
  let formatted = '';
  let lineHasContent = false;

  const append = (text: string) => {
    formatted += text;
    lineHasContent = true;
  };

  const newLine = (indentCount: number) => {
    formatted = formatted.replace(/[ \t]+$/, '');
    formatted += '\n' + indentStr.repeat(Math.max(0, indentCount));
    lineHasContent = indentCount > 0;
  };

  for (let idx = 0; idx < tokens.length; idx++) {
    const t = tokens[idx];
    const prev = idx > 0 ? tokens[idx - 1] : null;
    const next = idx + 1 < tokens.length ? tokens[idx + 1] : null;

    if (t.type === 'identifier') {
      let val = t.value;
      const upper = val.toUpperCase();
      if (uppercaseKeywords && DAX_KEYWORDS.has(upper)) {
        val = upper;
      }

      // Check if this is a VAR or RETURN
      if (val === 'VAR') {
        if (lineHasContent) newLine(currentIndent);
        append('VAR ');
        continue;
      }
      if (val === 'RETURN') {
        if (lineHasContent) newLine(currentIndent);
        append('RETURN');
        newLine(currentIndent);
        continue;
      }

      // Check if next token is '(' -> Function Call!
      if (next && next.type === 'paren_open') {
        append(val);
        continue;
      }

      // Standalone identifier or boolean
      if (prev && (prev.type === 'operator' || prev.type === 'comma' || prev.type === 'paren_open')) {
        if (prev.type !== 'paren_open') append(' ');
      }
      append(val);
      continue;
    }

    if (t.type === 'paren_open') {
      const callingFunc = prev && prev.type === 'identifier' ? prev.value.toUpperCase() : '';
      
      let isMultiline = false;
      if (callingFunc && ['CALCULATE', 'CALCULATETABLE', 'FILTER', 'SUMX', 'AVERAGEX', 'COUNTX', 'MINX', 'MAXX', 'IF', 'SWITCH', 'ADDCOLUMNS', 'SUMMARIZE', 'SUMMARIZECOLUMNS'].includes(callingFunc)) {
        isMultiline = true;
      } else {
        let pDepth = 1;
        for (let s = idx + 1; s < tokens.length; s++) {
          if (tokens[s].type === 'paren_open') pDepth++;
          else if (tokens[s].type === 'paren_close') {
            pDepth--;
            if (pDepth === 0) break;
          } else if (tokens[s].type === 'comma' && pDepth === 1) {
            isMultiline = true;
            break;
          }
        }
      }

      scopeStack.push({
        funcName: callingFunc,
        argIndex: 0,
        depth: currentIndent,
        multiline: isMultiline
      });

      append('(');
      if (isMultiline) {
        currentIndent++;
        newLine(currentIndent);
      }
      continue;
    }

    if (t.type === 'paren_close') {
      const topScope = scopeStack.pop();
      if (topScope && topScope.multiline) {
        currentIndent = topScope.depth;
        newLine(currentIndent);
      }
      append(')');
      continue;
    }

    if (t.type === 'comma') {
      const currentScope = scopeStack[scopeStack.length - 1];
      if (currentScope) {
        currentScope.argIndex++;
        if (currentScope.multiline) {
          append(',');
          newLine(currentIndent);
          continue;
        }
      }
      append(', ');
      continue;
    }

    if (t.type === 'operator') {
      if (t.value === '&&' || t.value === '||') {
        const currentScope = scopeStack[scopeStack.length - 1];
        if (wrapLogical && currentScope && currentScope.multiline) {
          append(' ' + t.value);
          newLine(currentIndent);
        } else {
          append(' ' + t.value + ' ');
        }
        continue;
      }

      append(` ${t.value} `);
      continue;
    }

    if (t.type === 'table') {
      append(t.value);
      continue;
    }

    if (t.type === 'bracket') {
      append(t.value);
      continue;
    }

    if (t.type === 'string') {
      append(t.value);
      continue;
    }

    append(t.value);
  }

  let resultBody = formatted
    .split('\n')
    .map(l => l.replace(/\s+$/, ''))
    .join('\n')
    .trim();

  if (measureHeader) {
    return `${measureHeader}\n${resultBody}`;
  }

  return resultBody;
}
