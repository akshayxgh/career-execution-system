// Professional SQL Formatter Engine

export interface SqlFormatOptions {
  indentSize?: number; // default 2 or 4
  uppercaseKeywords?: boolean; // default true
  commaPosition?: 'trailing' | 'leading'; // default trailing
}

const MAJOR_CLAUSES = [
  'SELECT',
  'FROM',
  'WHERE',
  'GROUP BY',
  'HAVING',
  'ORDER BY',
  'LIMIT',
  'OFFSET',
  'INSERT INTO',
  'VALUES',
  'UPDATE',
  'SET',
  'DELETE FROM',
  'UNION ALL',
  'UNION',
  'WITH',
];

const JOIN_CLAUSES = [
  'LEFT OUTER JOIN',
  'RIGHT OUTER JOIN',
  'FULL OUTER JOIN',
  'LEFT JOIN',
  'RIGHT JOIN',
  'INNER JOIN',
  'CROSS JOIN',
  'NATURAL JOIN',
  'JOIN',
];

const SQL_KEYWORDS = new Set([
  'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'IS', 'NULL', 'LIKE', 'ILIKE',
  'BETWEEN', 'EXISTS', 'ALL', 'ANY', 'SOME', 'AS', 'ON', 'JOIN', 'INNER', 'LEFT', 'RIGHT',
  'FULL', 'OUTER', 'CROSS', 'NATURAL', 'GROUP', 'BY', 'ORDER', 'HAVING', 'LIMIT', 'OFFSET',
  'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'UNION', 'EXCEPT', 'INTERSECT',
  'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'DISTINCT', 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX',
  'COALESCE', 'OVER', 'PARTITION', 'ROW_NUMBER', 'RANK', 'DENSE_RANK', 'LEAD', 'LAG',
  'WITH', 'RECURSIVE', 'CREATE', 'TABLE', 'ALTER', 'DROP', 'INDEX', 'VIEW', 'PRIMARY', 'KEY',
  'FOREIGN', 'REFERENCES', 'CHECK', 'DEFAULT', 'CONSTRAINT', 'CASCADE', 'DESC', 'ASC',
  'NULLS', 'FIRST', 'LAST', 'TRUE', 'FALSE', 'CAST', 'EXTRACT'
]);

export function formatSql(input: string, options: SqlFormatOptions = {}): string {
  if (!input || !input.trim()) return '';

  const indentSize = options.indentSize ?? 2;
  const uppercaseKeywords = options.uppercaseKeywords ?? true;
  const indentStr = ' '.repeat(indentSize);

  let sql = input.trim();

  // Normalize spaces
  sql = sql.replace(/\s+/g, ' ');

  // Spacing around commas: col1,col2 -> col1, col2
  sql = sql.replace(/,\s*/g, ', ');

  // Uppercase keywords
  if (uppercaseKeywords) {
    sql = sql.replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g, (match) => {
      const up = match.toUpperCase();
      return SQL_KEYWORDS.has(up) ? up : match;
    });
  }

  // Pre-split major clauses
  for (const clause of MAJOR_CLAUSES) {
    const reg = new RegExp(`\\b(${clause})\\b`, 'gi');
    sql = sql.replace(reg, '\n$1\n' + indentStr);
  }

  for (const join of JOIN_CLAUSES) {
    const reg = new RegExp(`\\b(${join})\\b`, 'gi');
    sql = sql.replace(reg, '\n$1 ');
  }

  // Handle AND / OR under WHERE
  sql = sql.replace(/\b(AND|OR)\b/gi, '\n' + indentStr + '$1');

  // Handle commas in SELECT list (break items into indented lines)
  const lines = sql.split('\n');
  const formattedLines: string[] = [];

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    const up = line.toUpperCase();
    const isMajor = MAJOR_CLAUSES.some((c) => up.startsWith(c));
    const isJoin = JOIN_CLAUSES.some((j) => up.startsWith(j));

    if (isMajor) {
      formattedLines.push(line);
    } else if (isJoin) {
      formattedLines.push(indentStr + line);
    } else {
      formattedLines.push(indentStr + line);
    }
  }

  return formattedLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
