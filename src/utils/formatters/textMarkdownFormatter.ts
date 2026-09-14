// Professional Text & Markdown Formatter Engine

export type TextTransformMode =
  | 'clean'
  | 'titleCase'
  | 'sentenceCase'
  | 'upperCase'
  | 'lowerCase'
  | 'camelCase'
  | 'snakeCase'
  | 'kebabCase'
  | 'markdownTable';

export function formatMarkdownTable(raw: string): string {
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.startsWith('|') || l.includes('|'));
  if (lines.length < 2) return raw;

  // Split lines into cells
  const rows: string[][] = lines.map((line) => {
    // Remove leading and trailing pipes if any
    const trimmed = line.replace(/^\||\|$/g, '');
    return trimmed.split('|').map((cell) => cell.trim());
  });

  const colCount = Math.max(...rows.map((r) => r.length));
  const colWidths: number[] = Array(colCount).fill(3);

  // Measure max width per column
  for (let r = 0; r < rows.length; r++) {
    // Skip separator row for measuring width
    if (r === 1 && rows[r].every((c) => /^:?-+:?$/.test(c))) continue;
    for (let c = 0; c < colCount; c++) {
      const cell = rows[r][c] || '';
      if (cell.length > colWidths[c]) {
        colWidths[c] = cell.length;
      }
    }
  }

  // Build aligned table
  const formattedRows: string[] = [];
  for (let r = 0; r < rows.length; r++) {
    const isSeparator = r === 1 && rows[r].every((c) => /^:?-+:?$/.test(c));
    const cells: string[] = [];

    for (let c = 0; c < colCount; c++) {
      const width = colWidths[c];
      if (isSeparator) {
        cells.push('-'.repeat(width));
      } else {
        const val = rows[r][c] || '';
        cells.push(val.padEnd(width, ' '));
      }
    }

    formattedRows.push(`| ${cells.join(' | ')} |`);
  }

  return formattedRows.join('\n');
}

export function toTitleCase(str: string): string {
  const minorWords = new Set(['a', 'an', 'the', 'and', 'but', 'or', 'for', 'nor', 'on', 'at', 'to', 'from', 'by', 'with', 'in', 'of']);
  return str.replace(/[A-Za-z0-9]+('[A-Za-z]+)?/g, (word, _apostrophe, index) => {
    const lower = word.toLowerCase();
    if (index > 0 && minorWords.has(lower)) {
      return lower;
    }
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  });
}

export function toSentenceCase(str: string): string {
  // Lowercase all, then capitalize after sentence terminators (. ! ?)
  return str.toLowerCase().replace(/(^\s*|[.!?]\s+)([a-z])/g, (_m, prefix, char) => {
    return prefix + char.toUpperCase();
  }).replace(/\bi\b/g, 'I');
}

export function toCamelCase(str: string): string {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (letter, index) =>
      index === 0 ? letter.toLowerCase() : letter.toUpperCase()
    )
    .replace(/[\s\-_]+/g, '');
}

export function toSnakeCase(str: string): string {
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[\s\-]+/g, '_')
    .toLowerCase();
}

export function toKebabCase(str: string): string {
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

export function cleanGeneralText(raw: string): string {
  let text = raw;

  // Fix punctuation spacing: hello , world . -> hello, world.
  text = text.replace(/\s+([,.:;!?])/g, '$1');
  text = text.replace(/([,.:;!?])(?=[^\s\d"'`)}\]])/g, '$1 ');

  // Fix multiple spaces
  text = text.replace(/[ \t]{2,}/g, ' ');

  // Capitalize standalone 'i'
  text = text.replace(/\bi\b/g, 'I');

  // Fix capitalization at start of sentences
  text = text.replace(/(^|[.!?]\s+)([a-z])/g, (_m, prefix, char) => prefix + char.toUpperCase());

  // Markdown lists normalize: *  item -> - item
  text = text.replace(/^\s*\*\s+/gm, '- ');

  // Trim trailing line whitespace
  text = text
    .split('\n')
    .map((l) => l.replace(/\s+$/, ''))
    .join('\n');

  // Reduce excessive blank lines to max 2
  text = text.replace(/\n{3,}/g, '\n\n');

  return text.trim();
}
