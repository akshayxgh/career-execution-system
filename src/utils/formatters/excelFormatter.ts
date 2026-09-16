// Professional Excel Formula Formatter Engine
// Formats complex nested Excel formulas (XLOOKUP, VLOOKUP, INDEX/MATCH, SUMIFS, LET, LAMBDA, IF, IFS, etc.)

const EXCEL_FUNCTIONS = new Set([
  // Lookup & Reference
  'XLOOKUP', 'VLOOKUP', 'HLOOKUP', 'LOOKUP', 'INDEX', 'MATCH', 'XMATCH', 'OFFSET', 'INDIRECT', 'CHOOSE',
  'CHOOSECOLS', 'CHOOSEROWS', 'DROP', 'TAKE', 'EXPAND', 'TOCOL', 'TOROW', 'WRAPCOLS', 'WRAPROWS',
  'HSTACK', 'VSTACK', 'FILTER', 'SORT', 'SORTBY', 'UNIQUE', 'SEQUENCE', 'RANDARRAY',
  
  // Logical
  'IF', 'IFS', 'IFERROR', 'IFNA', 'SWITCH', 'AND', 'OR', 'XOR', 'NOT', 'TRUE', 'FALSE',
  'LET', 'LAMBDA', 'BYCOL', 'BYROW', 'SCAN', 'REDUCE', 'MAP', 'MAKEARRAY',
  
  // Math & Stats
  'SUM', 'SUMIF', 'SUMIFS', 'SUMPRODUCT', 'COUNT', 'COUNTA', 'COUNTBLANK', 'COUNTIF', 'COUNTIFS',
  'AVERAGE', 'AVERAGEA', 'AVERAGEIF', 'AVERAGEIFS', 'MIN', 'MAX', 'MINIFS', 'MAXIFS', 'MEDIAN', 'MODE',
  'ROUND', 'ROUNDUP', 'ROUNDDOWN', 'INT', 'ABS', 'MOD', 'POWER', 'SQRT', 'CEILING', 'FLOOR',
  'SUBTOTAL', 'AGGREGATE',
  
  // Text
  'TEXT', 'TEXTBEFORE', 'TEXTAFTER', 'TEXTSPLIT', 'TEXTJOIN', 'CONCAT', 'CONCATENATE',
  'LEFT', 'RIGHT', 'MID', 'LEN', 'FIND', 'SEARCH', 'SUBSTITUTE', 'REPLACE', 'TRIM', 'CLEAN',
  'UPPER', 'LOWER', 'PROPER', 'EXACT', 'VALUETOTEXT', 'ARRAYTOTEXT', 'VALUE',
  
  // Date & Time
  'DATE', 'TIME', 'YEAR', 'MONTH', 'DAY', 'HOUR', 'MINUTE', 'SECOND',
  'TODAY', 'NOW', 'EDATE', 'EOMONTH', 'NETWORKDAYS', 'WORKDAY', 'DATEDIF', 'YEARFRAC', 'WEEKDAY', 'WEEKNUM',
  
  // Information & Financial
  'ISBLANK', 'ISERROR', 'ISERR', 'ISNA', 'ISNUMBER', 'ISTEXT', 'ISLOGICAL', 'ISREF',
  'PMT', 'IPMT', 'PPMT', 'NPV', 'IRR', 'XNPV', 'XIRR', 'FV', 'PV', 'RATE'
]);

export interface ExcelFormatOptions {
  indentSize?: number; // default 4
  uppercaseFunctions?: boolean; // default true
  fixTypos?: boolean; // default true
  spaceAroundOperators?: boolean; // default true
}

const EXCEL_TYPOS: Record<string, string> = {
  vookup: 'VLOOKUP',
  vlookp: 'VLOOKUP',
  vloopup: 'VLOOKUP',
  xookup: 'XLOOKUP',
  xlookp: 'XLOOKUP',
  indxe: 'INDEX',
  indx: 'INDEX',
  mtch: 'MATCH',
  matc: 'MATCH',
  sumif: 'SUMIFS',
  sumisf: 'SUMIFS',
  iff: 'IF',
  ifff: 'IF',
  iferoor: 'IFERROR',
  iferr: 'IFERROR',
  averge: 'AVERAGE',
  avrg: 'AVERAGE',
  countf: 'COUNTIFS',
  conct: 'CONCATENATE',
  textjoinn: 'TEXTJOIN',
  filtre: 'FILTER',
};

export function formatExcelFormula(input: string, options: ExcelFormatOptions = {}): string {
  if (!input || !input.trim()) return '';

  const indentSize = options.indentSize ?? 4;
  const uppercaseFunctions = options.uppercaseFunctions ?? true;
  const fixTypos = options.fixTypos ?? true;
  const spaceOperators = options.spaceAroundOperators ?? true;
  const indentStr = ' '.repeat(indentSize);

  let raw = input.trim();

  // Excel formulas typically start with '='
  const hasEquals = raw.startsWith('=');
  let formulaBody = hasEquals ? raw.slice(1).trim() : raw;

  // Normalize comma spacing
  formulaBody = formulaBody.replace(/,([^\s])/g, ', $1');

  // Tokenize Excel formula: strings ("..."), structured refs ([...]), function names, parens, commas, operators
  interface Token {
    type: 'string' | 'table_ref' | 'identifier' | 'operator' | 'comma' | 'paren_open' | 'paren_close' | 'other';
    value: string;
  }

  const tokens: Token[] = [];
  let i = 0;
  const n = formulaBody.length;

  while (i < n) {
    const char = formulaBody[i];

    // String literal: "..."
    if (char === '"') {
      let str = '"';
      i++;
      while (i < n) {
        if (formulaBody[i] === '"') {
          str += '"';
          // Check for escaped quote in Excel: ""
          if (i + 1 < n && formulaBody[i + 1] === '"') {
            str += '"';
            i += 2;
            continue;
          }
          i++;
          break;
        } else {
          str += formulaBody[i];
          i++;
        }
      }
      tokens.push({ type: 'string', value: str });
      continue;
    }

    // Structured reference / table column: [...]
    if (char === '[') {
      let bracketDepth = 1;
      let ref = '[';
      i++;
      while (i < n && bracketDepth > 0) {
        ref += formulaBody[i];
        if (formulaBody[i] === '[') bracketDepth++;
        else if (formulaBody[i] === ']') bracketDepth--;
        i++;
      }
      tokens.push({ type: 'table_ref', value: ref });
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

    // Multi-char operators: <=, >=, <>, ==
    if (char === '<' && formulaBody[i + 1] === '=') {
      tokens.push({ type: 'operator', value: '<=' });
      i += 2;
      continue;
    }
    if (char === '>' && formulaBody[i + 1] === '=') {
      tokens.push({ type: 'operator', value: '>=' });
      i += 2;
      continue;
    }
    if (char === '<' && formulaBody[i + 1] === '>') {
      tokens.push({ type: 'operator', value: '<>' });
      i += 2;
      continue;
    }
    if (char === '=' && formulaBody[i + 1] === '=') {
      tokens.push({ type: 'operator', value: '==' });
      i += 2;
      continue;
    }

    // Single-char operators: =, >, <, +, -, *, /, &, ^, %
    if ('=><+-*/&^%'.includes(char)) {
      tokens.push({ type: 'operator', value: char });
      i++;
      continue;
    }

    // Identifiers (Function names, Cell references like A1:B10, Sheet1!A1, Range names)
    // Could contain letters, numbers, underscores, dots, exclamation mark for sheet names
    if (/[a-zA-Z_]/.test(char)) {
      let id = '';
      while (i < n && /[a-zA-Z0-9_.!$:]/.test(formulaBody[i])) {
        id += formulaBody[i];
        i++;
      }
      tokens.push({ type: 'identifier', value: id });
      continue;
    }

    // Numbers
    if (/[0-9]/.test(char)) {
      let num = '';
      while (i < n && /[0-9.]/.test(formulaBody[i])) {
        num += formulaBody[i];
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

  // Format with line breaks and indentation
  interface Scope {
    funcName: string;
    argIndex: number;
    depth: number;
    multiline: boolean;
  }

  const scopeStack: Scope[] = [];
  let currentIndent = 0;
  let formatted = '';

  const append = (text: string) => {
    formatted += text;
  };

  const newLine = (indentCount: number) => {
    formatted = formatted.replace(/[ \t]+$/, '');
    formatted += '\n' + indentStr.repeat(Math.max(0, indentCount));
  };

  for (let idx = 0; idx < tokens.length; idx++) {
    const t = tokens[idx];
    const prev = idx > 0 ? tokens[idx - 1] : null;
    const next = idx + 1 < tokens.length ? tokens[idx + 1] : null;

    if (t.type === 'identifier') {
      let val = t.value;
      const lower = val.toLowerCase();
      if (fixTypos && EXCEL_TYPOS[lower]) {
        val = EXCEL_TYPOS[lower];
      }
      const upper = val.toUpperCase();

      // If followed by '(' -> Function call
      if (next && next.type === 'paren_open') {
        if (uppercaseFunctions && (EXCEL_FUNCTIONS.has(upper) || /^[A-Z0-9_.]+$/.test(upper))) {
          val = upper;
        }
        append(val);
        continue;
      }

      // Boolean literals
      if (upper === 'TRUE' || upper === 'FALSE') {
        val = upper;
      }

      append(val);
      continue;
    }

    if (t.type === 'paren_open') {
      const callingFunc = prev && prev.type === 'identifier' ? prev.value.toUpperCase() : '';

      // Determine multiline: if top-level or complex function like IF, IFS, LET, LAMBDA, XLOOKUP, INDEX, etc.
      // or if it contains commas
      let isMultiline = false;
      if (callingFunc && ['IF', 'IFS', 'SWITCH', 'LET', 'LAMBDA', 'XLOOKUP', 'VLOOKUP', 'INDEX', 'MATCH', 'FILTER', 'SORT', 'CHOOSE', 'SUMIFS', 'COUNTIFS', 'AVERAGEIFS'].includes(callingFunc)) {
        isMultiline = true;
      } else if (callingFunc) {
        // Look ahead for commas at depth 1
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
        multiline: isMultiline,
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
      if (spaceOperators) {
        append(` ${t.value} `);
      } else {
        append(t.value);
      }
      continue;
    }

    append(t.value);
  }

  const resultBody = formatted
    .split('\n')
    .map((l) => l.replace(/\s+$/, ''))
    .join('\n')
    .trim();

  return hasEquals ? `=${resultBody}` : resultBody;
}
