// Professional Power Query (M Code) Formatter Engine
// Formats Power Query M scripts used in Power BI, Excel, and Fabric Dataflows.

export interface MFormatOptions {
  indentSize?: number; // default 4
}

export function formatPowerQueryM(input: string, options: MFormatOptions = {}): string {
  if (!input || !input.trim()) return '';

  const indentSize = options.indentSize ?? 4;
  const indentStr = ' '.repeat(indentSize);

  let raw = input.trim();

  // Normalize spaces around commas
  raw = raw.replace(/,([^\s\n])/g, ', $1');

  // Normalize assignment =
  raw = raw.replace(/([a-zA-Z0-9_#"])\s*=\s*([a-zA-Z0-9_#"(])/g, '$1 = $2');

  const lines = raw.split(/\r?\n/);
  const formattedLines: string[] = [];
  let inLetBlock = false;

  for (let line of lines) {
    let trimmed = line.trim();
    if (!trimmed) {
      formattedLines.push('');
      continue;
    }

    if (/^let\b/i.test(trimmed)) {
      formattedLines.push('let');
      inLetBlock = true;
      const rest = trimmed.replace(/^let\b/i, '').trim();
      if (rest) {
        formattedLines.push(indentStr + rest);
      }
      continue;
    }

    if (/^in\b/i.test(trimmed)) {
      inLetBlock = false;
      formattedLines.push('in');
      const rest = trimmed.replace(/^in\b/i, '').trim();
      if (rest) {
        formattedLines.push(indentStr + rest);
      }
      continue;
    }

    if (inLetBlock) {
      // Indent step definitions
      formattedLines.push(indentStr + trimmed);
    } else {
      formattedLines.push(trimmed);
    }
  }

  return formattedLines.join('\n').trim();
}
