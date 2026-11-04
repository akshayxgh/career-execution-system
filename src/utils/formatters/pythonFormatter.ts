// Professional Python & Pandas Formatter Engine
// Formats Python scripts, Pandas/PySpark data manipulation pipelines, and PEP 8 method chains.

export interface PythonFormatOptions {
  indentSize?: number; // default 4
}

interface Token {
  type: string;
  value: string;
  lineIdx: number;
}

interface BracketInfo {
  openIdx: number;
  closeIdx: number;
  bracketType: 'paren' | 'bracket' | 'brace';
  isCallOrDef: boolean;
  callerName: string;
  commaIndices: number[];
  argCount: number;
  hasKwargs: boolean;
  isMultiline: boolean;
}

const PANDAS_MULTI_ARG_METHODS = new Set([
  'agg', 'aggregate', 'assign', 'merge', 'join', 'concat',
  'pivot_table', 'melt', 'rename', 'replace', 'set_index', 'reset_index',
  'to_csv', 'read_csv', 'read_sql', 'to_sql', 'to_parquet', 'read_parquet'
]);

export function formatPython(input: string, options: PythonFormatOptions = {}): string {
  if (!input || !input.trim()) return '';

  const indentSize = options.indentSize ?? 4;
  const indentStr = ' '.repeat(indentSize);

  // 1. Analyze original lines to get base block indentation for lines
  const rawLines = input.split(/\r?\n/);
  const lineIndents: number[] = rawLines.map(line => {
    const match = line.match(/^[ \t]*/);
    if (!match) return 0;
    const ws = match[0];
    let spaces = 0;
    for (const c of ws) {
      spaces += c === '\t' ? indentSize : 1;
    }
    return Math.round(spaces / indentSize);
  });

  // 2. Tokenize Python source preserving strings, comments, numbers, and operators
  const rawTokens: Token[] = [];
  let i = 0;
  const n = input.length;
  let currentLine = 0;

  while (i < n) {
    const ch = input[i];

    // Comments: # ...
    if (ch === '#') {
      let comment = '#';
      i++;
      while (i < n && input[i] !== '\n' && input[i] !== '\r') {
        comment += input[i];
        i++;
      }
      rawTokens.push({ type: 'comment', value: comment, lineIdx: currentLine });
      continue;
    }

    // Newlines
    if (ch === '\n') {
      rawTokens.push({ type: 'newline', value: '\n', lineIdx: currentLine });
      currentLine++;
      i++;
      continue;
    }
    if (ch === '\r') {
      if (i + 1 < n && input[i + 1] === '\n') {
        rawTokens.push({ type: 'newline', value: '\n', lineIdx: currentLine });
        currentLine++;
        i += 2;
      } else {
        rawTokens.push({ type: 'newline', value: '\n', lineIdx: currentLine });
        currentLine++;
        i++;
      }
      continue;
    }

    // Whitespace (non-newline)
    if (ch === ' ' || ch === '\t') {
      let ws = '';
      while (i < n && (input[i] === ' ' || input[i] === '\t')) {
        ws += input[i];
        i++;
      }
      rawTokens.push({ type: 'whitespace', value: ws, lineIdx: currentLine });
      continue;
    }

    // Strings: single, double, triple quotes (with optional prefix: r, u, f, b, etc.)
    const isStringPrefix =
      (ch === 'r' || ch === 'u' || ch === 'f' || ch === 'b' || ch === 'R' || ch === 'U' || ch === 'F' || ch === 'B') &&
      (input[i + 1] === '"' || input[i + 1] === "'" ||
        ((input[i + 1] === 'r' || input[i + 1] === 'b' || input[i + 1] === 'f' || input[i + 1] === 'R' || input[i + 1] === 'B' || input[i + 1] === 'F') &&
         (input[i + 2] === '"' || input[i + 2] === "'")));

    if (ch === '"' || ch === "'" || isStringPrefix) {
      let strPrefix = '';
      if (isStringPrefix) {
        strPrefix += input[i];
        i++;
        if (input[i] !== '"' && input[i] !== "'") {
          strPrefix += input[i];
          i++;
        }
      }

      const quoteChar = input[i];
      const isTriple =
        i + 2 < n && input[i + 1] === quoteChar && input[i + 2] === quoteChar;

      let strVal = strPrefix;
      if (isTriple) {
        const tripleQuote = quoteChar + quoteChar + quoteChar;
        strVal += tripleQuote;
        i += 3;
        while (i < n) {
          if (
            input[i] === quoteChar &&
            i + 2 < n &&
            input[i + 1] === quoteChar &&
            input[i + 2] === quoteChar
          ) {
            strVal += tripleQuote;
            i += 3;
            break;
          }
          if (input[i] === '\\' && i + 1 < n) {
            strVal += input[i] + input[i + 1];
            i += 2;
          } else {
            if (input[i] === '\n') currentLine++;
            strVal += input[i];
            i++;
          }
        }
      } else {
        strVal += quoteChar;
        i++;
        while (i < n && input[i] !== quoteChar && input[i] !== '\n' && input[i] !== '\r') {
          if (input[i] === '\\' && i + 1 < n) {
            strVal += input[i] + input[i + 1];
            i += 2;
          } else {
            strVal += input[i];
            i++;
          }
        }
        if (i < n && input[i] === quoteChar) {
          strVal += quoteChar;
          i++;
        }
      }
      rawTokens.push({ type: 'string', value: strVal, lineIdx: currentLine });
      continue;
    }

    // Punctuation
    if (ch === '(') { rawTokens.push({ type: 'paren_open', value: '(', lineIdx: currentLine }); i++; continue; }
    if (ch === ')') { rawTokens.push({ type: 'paren_close', value: ')', lineIdx: currentLine }); i++; continue; }
    if (ch === '[') { rawTokens.push({ type: 'bracket_open', value: '[', lineIdx: currentLine }); i++; continue; }
    if (ch === ']') { rawTokens.push({ type: 'bracket_close', value: ']', lineIdx: currentLine }); i++; continue; }
    if (ch === '{') { rawTokens.push({ type: 'brace_open', value: '{', lineIdx: currentLine }); i++; continue; }
    if (ch === '}') { rawTokens.push({ type: 'brace_close', value: '}', lineIdx: currentLine }); i++; continue; }
    if (ch === ',') { rawTokens.push({ type: 'comma', value: ',', lineIdx: currentLine }); i++; continue; }
    if (ch === ':') { rawTokens.push({ type: 'colon', value: ':', lineIdx: currentLine }); i++; continue; }
    if (ch === '.') { rawTokens.push({ type: 'dot', value: '.', lineIdx: currentLine }); i++; continue; }

    // Multi-char operators
    const three = input.slice(i, i + 3);
    if (three === '//=' || three === '**=' || three === '<<=' || three === '>>=') {
      rawTokens.push({ type: 'operator', value: three, lineIdx: currentLine });
      i += 3;
      continue;
    }

    const two = input.slice(i, i + 2);
    if (
      two === '==' || two === '!=' || two === '<=' || two === '>=' ||
      two === '+=' || two === '-=' || two === '*=' || two === '/=' ||
      two === '%=' || two === '//' || two === '**' || two === ':=' ||
      two === '->' || two === '<<' || two === '>>'
    ) {
      rawTokens.push({ type: 'operator', value: two, lineIdx: currentLine });
      i += 2;
      continue;
    }

    // Single-char operators
    if ('=+-*/%<>!&|^~@'.includes(ch)) {
      rawTokens.push({ type: 'operator', value: ch, lineIdx: currentLine });
      i++;
      continue;
    }

    // Identifiers
    if (/[a-zA-Z_]/.test(ch)) {
      let id = '';
      while (i < n && /[a-zA-Z0-9_]/.test(input[i])) {
        id += input[i];
        i++;
      }
      rawTokens.push({ type: 'identifier', value: id, lineIdx: currentLine });
      continue;
    }

    // Numbers
    if (/[0-9]/.test(ch)) {
      let num = '';
      while (i < n && /[0-9.eE_xXoObBa-fA-F+-]/.test(input[i])) {
        if ((input[i] === '+' || input[i] === '-') && !/[eE]/.test(num.slice(-1))) {
          break;
        }
        num += input[i];
        i++;
      }
      rawTokens.push({ type: 'number', value: num, lineIdx: currentLine });
      continue;
    }

    rawTokens.push({ type: 'other', value: ch, lineIdx: currentLine });
    i++;
  }

  // Filter out whitespace tokens
  const tokens: Token[] = [];
  for (const t of rawTokens) {
    if (t.type === 'whitespace') continue;
    tokens.push(t);
  }

  // 3. Bracket Matching & Multiline Determination
  const bracketMap = new Map<number, BracketInfo>();
  const stack: { openIdx: number; bracketType: 'paren' | 'bracket' | 'brace' }[] = [];

  for (let idx = 0; idx < tokens.length; idx++) {
    const t = tokens[idx];
    if (t.type === 'paren_open' || t.type === 'bracket_open' || t.type === 'brace_open') {
      const bType = t.type === 'paren_open' ? 'paren' : t.type === 'bracket_open' ? 'bracket' : 'brace';
      stack.push({ openIdx: idx, bracketType: bType });
    } else if (t.type === 'paren_close' || t.type === 'bracket_close' || t.type === 'brace_close') {
      const popped = stack.pop();
      if (popped) {
        const openIdx = popped.openIdx;
        const prevToken = openIdx > 0 ? tokens[openIdx - 1] : null;
        const isDef = openIdx >= 2 && tokens[openIdx - 2].value === 'def';
        const isCall = !isDef && popped.bracketType === 'paren' && !!prevToken && (prevToken.type === 'identifier' || prevToken.type === 'paren_close' || prevToken.type === 'bracket_close');
        const callerName = (isCall || isDef) && prevToken && prevToken.type === 'identifier' ? prevToken.value : '';

        // Analyze internal tokens at depth 0
        let depth = 0;
        const commaIndices: number[] = [];
        let hasKwargs = false;
        let internalChars = 0;
        let hasNewlines = false;

        for (let j = openIdx + 1; j < idx; j++) {
          const it = tokens[j];
          if (it.type === 'paren_open' || it.type === 'bracket_open' || it.type === 'brace_open') {
            depth++;
          } else if (it.type === 'paren_close' || it.type === 'bracket_close' || it.type === 'brace_close') {
            depth--;
          } else if (depth === 0) {
            if (it.type === 'comma') {
              commaIndices.push(j);
            } else if (it.type === 'operator' && it.value === '=') {
              hasKwargs = true;
            } else if (it.type === 'newline') {
              hasNewlines = true;
            }
          }
          internalChars += it.value.length;
        }

        const argCount = commaIndices.length + (idx > openIdx + 1 ? 1 : 0);

        let isMultiline = false;
        if (isDef) {
          if (hasNewlines || (argCount >= 4 && internalChars > 65)) {
            isMultiline = true;
          }
        } else if (isCall) {
          if (argCount >= 2) {
            if (PANDAS_MULTI_ARG_METHODS.has(callerName.toLowerCase())) {
              isMultiline = true;
            } else if (hasKwargs) {
              isMultiline = true;
            } else if (internalChars > 50) {
              isMultiline = true;
            } else if (hasNewlines) {
              isMultiline = true;
            }
          } else if (argCount === 1) {
            if (hasNewlines || internalChars > 65) {
              isMultiline = true;
            }
          }
        } else if (popped.bracketType === 'brace') {
          // Dictionary expansion
          if (argCount >= 2 || (hasNewlines && argCount >= 1)) {
            isMultiline = true;
          }
        } else if (popped.bracketType === 'bracket') {
          // List expansion
          if (argCount >= 3 && internalChars > 45) {
            isMultiline = true;
          }
        }

        const info: BracketInfo = {
          openIdx,
          closeIdx: idx,
          bracketType: popped.bracketType,
          isCallOrDef: isCall || isDef,
          callerName,
          commaIndices,
          argCount,
          hasKwargs,
          isMultiline,
        };
        bracketMap.set(openIdx, info);
        bracketMap.set(idx, info);
      }
    }
  }

  // 4. Format Tokens
  let result = '';
  let currentIndent = 0;
  const activeScopes: { info: BracketInfo; baseIndent: number }[] = [];

  const append = (text: string) => {
    result += text;
  };

  const newLine = (indentCount: number) => {
    result = result.replace(/[ \t]+$/, '');
    result += '\n' + indentStr.repeat(Math.max(0, indentCount));
  };

  const isLineStart = () => {
    return /\n[ \t]*$/.test(result) || result === '';
  };

  for (let idx = 0; idx < tokens.length; idx++) {
    const t = tokens[idx];
    const prev = idx > 0 ? tokens[idx - 1] : null;
    const next = idx + 1 < tokens.length ? tokens[idx + 1] : null;

    // Handle newlines outside multiline brackets
    if (t.type === 'newline') {
      if (activeScopes.length > 0 && activeScopes.some(s => s.info.isMultiline)) {
        continue;
      }
      if (!isLineStart()) {
        const nextToken = next;
        if (nextToken && nextToken.type !== 'newline') {
          const nextOrigIndent = lineIndents[nextToken.lineIdx] ?? 0;
          currentIndent = nextOrigIndent;
          newLine(currentIndent);
        } else {
          result = result.replace(/[ \t]+$/, '');
          result += '\n';
        }
      }
      continue;
    }

    if (t.type === 'comment') {
      if (result === '') {
        const orig = lineIndents[t.lineIdx] ?? 0;
        currentIndent = orig;
        append(indentStr.repeat(currentIndent));
      } else if (!result.endsWith(' ')) {
        append('  ');
      }
      append(t.value);
      newLine(currentIndent);
      continue;
    }

    // Ensure first token on file has proper base indentation if needed
    if (result === '' && activeScopes.length === 0) {
      const orig = lineIndents[t.lineIdx] ?? 0;
      currentIndent = orig;
      append(indentStr.repeat(currentIndent));
    }

    if (t.type === 'paren_open' || t.type === 'bracket_open' || t.type === 'brace_open') {
      const info = bracketMap.get(idx);
      append(t.value);
      if (info && info.isMultiline) {
        activeScopes.push({ info, baseIndent: currentIndent });
        currentIndent++;
        newLine(currentIndent);
      } else if (info) {
        activeScopes.push({ info, baseIndent: currentIndent });
      }
      continue;
    }

    if (t.type === 'paren_close' || t.type === 'bracket_close' || t.type === 'brace_close') {
      const scope = activeScopes.pop();
      if (scope && scope.info.isMultiline) {
        if (!result.trimEnd().endsWith(',')) {
          append(',');
        }
        currentIndent = scope.baseIndent;
        newLine(currentIndent);
      }
      append(t.value);
      continue;
    }

    if (t.type === 'comma') {
      const topScope = activeScopes[activeScopes.length - 1];
      if (topScope && topScope.info.isMultiline) {
        append(',');
        newLine(currentIndent);
      } else {
        append(', ');
      }
      continue;
    }

    if (t.type === 'colon') {
      if (next && next.type !== 'newline') {
        append(': ');
      } else {
        append(':');
      }
      continue;
    }

    if (t.type === 'dot') {
      append('.');
      continue;
    }

    if (t.type === 'operator') {
      const topScope = activeScopes[activeScopes.length - 1];
      const isKwargEqual =
        t.value === '=' &&
        topScope &&
        topScope.info.isCallOrDef &&
        prev &&
        prev.type === 'identifier';

      if (isKwargEqual) {
        // PEP 8: no spaces around '=' for keyword arguments or default parameters
        append('=');
      } else {
        if (!isLineStart() && !result.endsWith(' ')) append(' ');
        append(t.value);
        if (next && next.type !== 'newline' && next.type !== 'comma') append(' ');
      }
      continue;
    }

    if (t.type === 'identifier' || t.type === 'string' || t.type === 'number') {
      if (prev) {
        if (
          (prev.type === 'identifier' || prev.type === 'string' || prev.type === 'number') &&
          !isLineStart() &&
          !result.endsWith(' ')
        ) {
          append(' ');
        }
      }
      append(t.value);
      continue;
    }

    append(t.value);
  }

  // Normalize consecutive blank lines to at most 2
  return result.replace(/\n{3,}/g, '\n\n').trim();
}
