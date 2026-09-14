// Professional Python Formatter Engine

export interface PythonFormatOptions {
  indentSize?: number; // default 4
}

export function formatPython(input: string, options: PythonFormatOptions = {}): string {
  if (!input || !input.trim()) return '';

  // Normalize indentation if needed
  void options;

  const lines = input.split(/\r?\n/);
  const formattedLines: string[] = [];

  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      formattedLines.push('');
      continue;
    }

    // Preserve comments
    if (trimmed.startsWith('#')) {
      formattedLines.push(line);
      continue;
    }

    // Spacing around commas: a,b,c -> a, b, c
    let formatted = line.replace(/,([^\s\n])/g, ', $1');

    // Spacing around operators in code (avoiding comments)
    // =, ==, !=, <=, >=, +, -, *, /, //, %
    formatted = formatted.replace(/([^\s=!<>+\-*/%])\s*(=|==|!=|<=|>=|\+=|-=|\*=|\/=|%)\s*([^\s=])/g, '$1 $2 $3');

    // Spacing after colons in dictionaries or definitions: e.g. "key":value -> "key": value
    formatted = formatted.replace(/:\s*([^\s\n#])/g, ': $1');

    formattedLines.push(formatted);
  }

  // Normalize consecutive blank lines to maximum 2
  let result = formattedLines.join('\n');
  result = result.replace(/\n{4,}/g, '\n\n\n');

  return result.trim();
}
