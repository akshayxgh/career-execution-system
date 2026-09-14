// Professional JavaScript / TypeScript Formatter Engine

export interface JsFormatOptions {
  indentSize?: number;
  semicolons?: boolean;
}

export function formatJavascript(input: string, options: JsFormatOptions = {}): string {
  if (!input || !input.trim()) return '';

  const indentSize = options.indentSize ?? 2;
  const indentStr = ' '.repeat(indentSize);

  let currentIndent = 0;
  const lines = input.split(/\r?\n/);
  const formattedLines: string[] = [];

  for (let line of lines) {
    let trimmed = line.trim();
    if (!trimmed) {
      formattedLines.push('');
      continue;
    }

    // Spacing around commas: a,b -> a, b
    trimmed = trimmed.replace(/,([^\s])/g, ', $1');

    // Spacing around operators
    trimmed = trimmed.replace(/([^\s=!<>+\-*/%&|])\s*(=|==|===|!=|!==|<=|>=|\+=|-=|\*=|\/=|&&|\|\|)\s*([^\s=!<>])/g, '$1 $2 $3');

    // Adjust indent for closing brackets at start of line
    if (/^[}\])]/.test(trimmed)) {
      currentIndent = Math.max(0, currentIndent - 1);
    }

    formattedLines.push(indentStr.repeat(currentIndent) + trimmed);

    // Count open vs close braces in this line
    const opens = (trimmed.match(/[{[(]/g) || []).length;
    const closes = (trimmed.match(/[}\])]/g) || []).length;
    
    // Only adjust by net open/close difference (excluding already counted starting close)
    const net = opens - closes;
    if (!/^[}\])]/.test(trimmed)) {
      currentIndent = Math.max(0, currentIndent + net);
    } else {
      currentIndent = Math.max(0, currentIndent + (opens - (closes - 1)));
    }
  }

  return formattedLines.join('\n').trim();
}
