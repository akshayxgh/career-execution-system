// Professional JSON Formatter & Repairer Engine

export interface JsonFormatOptions {
  indentSize?: number;
  minify?: boolean;
  repair?: boolean;
}

export interface JsonFormatResult {
  formatted: string;
  isValid: boolean;
  error?: string;
  repaired?: boolean;
}

export function repairJson(raw: string): string {
  let text = raw.trim();

  // Strip single-line comments //
  text = text.replace(/\/\/.*$/gm, '');

  // Strip multi-line comments /* ... */
  text = text.replace(/\/\*[\s\S]*?\*\//g, '');

  // Python constants to JSON
  text = text.replace(/\bTrue\b/g, 'true');
  text = text.replace(/\bFalse\b/g, 'false');
  text = text.replace(/\bNone\b/g, 'null');

  // Single-quoted keys and values to double quotes
  // Replace 'string' with "string" while escaping internal double quotes
  text = text.replace(/'([^'\\]*(\\.[^'\\]*)*)'/g, (_match, group) => {
    const escaped = group.replace(/"/g, '\\"');
    return `"${escaped}"`;
  });

  // Unquoted object keys: { foo: 1, bar_baz: 2 } -> { "foo": 1, "bar_baz": 2 }
  text = text.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_-]*)\s*:/g, '$1"$2":');

  // Trailing commas in objects & arrays: [1, 2, ] -> [1, 2]
  text = text.replace(/,\s*([}\]])/g, '$1');

  return text;
}

export function formatJson(input: string, options: JsonFormatOptions = {}): JsonFormatResult {
  if (!input || !input.trim()) {
    return { formatted: '', isValid: true };
  }

  const indent = options.indentSize ?? 2;
  const minify = options.minify ?? false;
  const allowRepair = options.repair ?? true;

  try {
    // Try standard JSON.parse first
    const parsed = JSON.parse(input);
    const formatted = minify ? JSON.stringify(parsed) : JSON.stringify(parsed, null, indent);
    return { formatted, isValid: true };
  } catch (err: unknown) {
    if (allowRepair) {
      try {
        const repairedRaw = repairJson(input);
        const parsed = JSON.parse(repairedRaw);
        const formatted = minify ? JSON.stringify(parsed) : JSON.stringify(parsed, null, indent);
        return { formatted, isValid: true, repaired: true };
      } catch (err2: unknown) {
        return {
          formatted: input,
          isValid: false,
          error: err2 instanceof Error ? err2.message : 'Invalid JSON syntax'
        };
      }
    }

    return {
      formatted: input,
      isValid: false,
      error: err instanceof Error ? err.message : 'Invalid JSON syntax'
    };
  }
}
