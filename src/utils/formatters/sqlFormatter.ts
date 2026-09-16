// Professional SQL Formatter Engine (MySQL, PostgreSQL, Snowflake, BigQuery, T-SQL)
// Powered by sql-formatter with Data Professional CTE, Window Function, and Join layout rules.

import { format as sqlFormat, type SqlLanguage } from 'sql-formatter';

export interface SqlFormatOptions {
  indentSize?: number; // default 4
  uppercaseKeywords?: boolean; // default true
  fixTypos?: boolean; // default true
  dialect?: SqlLanguage; // default 'mysql'
}

const SQL_TYPOS: [RegExp, string][] = [
  [/\b(selec|slect|selct|sleect)\b/gi, 'SELECT'],
  [/\bform\b(?=\s+[a-zA-Z0-9_`"\[])/gi, 'FROM'],
  [/\b(wher|whre|wheree)\b/gi, 'WHERE'],
  [/\b(grop\s+by|groupby)\b/gi, 'GROUP BY'],
  [/\b(oder\s+by|order\s+byy|orderby)\b/gi, 'ORDER BY'],
  [/\b(distict|distinc|distint)\b/gi, 'DISTINCT'],
  [/\brigth\s+join\b/gi, 'RIGHT JOIN'],
  [/\b(lefft|letf)\s+join\b/gi, 'LEFT JOIN'],
  [/\biner\s+join\b/gi, 'INNER JOIN'],
  [/\b(colaesce|coalece)\b/gi, 'COALESCE'],
  [/\b(havng|havign)\b/gi, 'HAVING'],
  [/\b(unon|uniom)\b/gi, 'UNION'],
  [/\b(inser\s+into|insertinto)\b/gi, 'INSERT INTO'],
  [/\b(udpate|updat)\b/gi, 'UPDATE'],
  [/\b(delte|delet)\b/gi, 'DELETE'],
  [/\b(partion\s+by|partition\s+byy)\b/gi, 'PARTITION BY'],
  [/\bdenserank\b/gi, 'DENSE_RANK'],
  [/\brownumber\b/gi, 'ROW_NUMBER'],
];

export function formatSql(input: string, options: SqlFormatOptions = {}): string {
  if (!input || !input.trim()) return '';

  const tabWidth = options.indentSize ?? 4;
  const uppercase = options.uppercaseKeywords ?? true;
  const fixTypos = options.fixTypos ?? true;
  const dialect = options.dialect ?? 'mysql';

  let raw = input;
  if (fixTypos) {
    for (const [regex, replacement] of SQL_TYPOS) {
      raw = raw.replace(regex, replacement);
    }
  }

  // 1. Initial AST format using sql-formatter
  let formatted = '';
  try {
    formatted = sqlFormat(raw, {
      language: dialect,
      tabWidth,
      keywordCase: uppercase ? 'upper' : 'preserve',
      functionCase: uppercase ? 'upper' : 'preserve',
      dataTypeCase: uppercase ? 'upper' : 'preserve',
      expressionWidth: 80,
      denseOperators: false,
    });
  } catch {
    // Fallback to generic sql dialect if custom syntax errors occur
    formatted = sqlFormat(raw, {
      language: 'sql',
      tabWidth,
      keywordCase: uppercase ? 'upper' : 'preserve',
      functionCase: uppercase ? 'upper' : 'preserve',
      dataTypeCase: uppercase ? 'upper' : 'preserve',
      expressionWidth: 80,
      denseOperators: false,
    });
  }

  // 2. Collapse OVER ( ... ) window function blocks if concise
  const lines = formatted.split('\n');
  const resultLines: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    if (line.includes('OVER (')) {
      let overBlock = line;
      let j = i + 1;
      let closed = false;
      while (j < lines.length && j <= i + 10) {
        overBlock += ' ' + lines[j].trim();
        if (lines[j].includes(')')) {
          closed = true;
          break;
        }
        j++;
      }
      if (closed) {
        const collapsed = overBlock
          .replace(/OVER\s*\(\s*/i, 'OVER(')
          .replace(/\s*PARTITION\s+BY\s+/i, 'PARTITION BY ')
          .replace(/\s*ORDER\s+BY\s+/i, ' ORDER BY ')
          .replace(/\s+\)/g, ')')
          .replace(/\s{2,}/g, ' ');

        const match = line.match(/^\s*/);
        const leadingIndent = match ? match[0] : '';
        resultLines.push(leadingIndent + collapsed.trim());
        i = j + 1;
        continue;
      }
    }

    resultLines.push(line);
    i++;
  }

  let text = resultLines.join('\n');

  // 3. Keep SELECT * on one line and FROM table [alias] on one line
  text = text.replace(/^(\s*)SELECT\s*\n\s*\*\s*$/gim, '$1SELECT *');
  text = text.replace(/^(\s*)FROM\s*\n\s*([a-zA-Z0-9_.]+(?:\s+[a-zA-Z0-9_]+)?)\s*$/gim, '$1FROM $2');

  // 4. Normalize CTE indentation:
  // WITH
  //     summary AS (
  //         SELECT ...
  //     ),
  //     matches AS (
  //         SELECT ...
  //     )
  //
  // Into standard Data Analyst layout:
  // WITH summary AS (
  //     SELECT ...
  // ),
  // matches AS (
  //     SELECT ...
  // )
  if (/^WITH\s*\n\s*[a-zA-Z0-9_]+\s+AS\s*\(/m.test(text)) {
    const allLines = text.split('\n');
    const cteProcessed: string[] = [];
    let inCteHeader = true;

    for (let idx = 0; idx < allLines.length; idx++) {
      const curLine = allLines[idx];

      if (inCteHeader) {
        // WITH\n    name AS (
        if (/^WITH\b/.test(curLine.trim())) {
          if (idx + 1 < allLines.length && /\bAS\s*\($/.test(allLines[idx + 1].trim())) {
            cteProcessed.push(`WITH ${allLines[idx + 1].trim()}`);
            idx++;
            continue;
          }
        }

        // ),\n    name AS (
        if (/^\s*\),\s*$/.test(curLine)) {
          cteProcessed.push('),');
          if (idx + 1 < allLines.length && /\bAS\s*\($/.test(allLines[idx + 1].trim())) {
            cteProcessed.push(`${allLines[idx + 1].trim()}`);
            idx++;
          }
          continue;
        }

        // Closing paren of last CTE: )
        if (/^\s{4}\)\s*$/.test(curLine)) {
          cteProcessed.push(')');
          inCteHeader = false;
          continue;
        }

        // Inside CTE body: reduce 4 spaces of indentation
        if (/^\s{8}/.test(curLine)) {
          cteProcessed.push(curLine.substring(4));
          continue;
        }
      }

      cteProcessed.push(curLine);
    }
    text = cteProcessed.join('\n');
  }

  // 5. Clean JOIN and ON indentation:
  const linesAfter = text.split('\n');
  const finalLines: string[] = [];
  const indentStr = ' '.repeat(tabWidth);

  for (let line of linesAfter) {
    if (/^\s{4}(INNER|LEFT|RIGHT|FULL|CROSS)?\s*JOIN\b/i.test(line)) {
      line = line.trim();
    }

    // Break ON onto indented line if on same line as JOIN
    const onMatch = line.match(/^((?:INNER|LEFT|RIGHT|FULL|CROSS)?\s*JOIN\s+[^\n]+?)\s+ON\s+([^\n]+)$/i);
    if (onMatch) {
      finalLines.push(onMatch[1].trim());
      finalLines.push(indentStr + 'ON ' + onMatch[2].trim());
      continue;
    }

    if (/^ON\s+/i.test(line)) {
      finalLines.push(indentStr + line);
      continue;
    }

    finalLines.push(line);
  }

  text = finalLines.join('\n');

  // 6. Compact single-clause WHERE conditions if clean:
  text = text.replace(/^(\s*)WHERE\s*\n\s*([^\n]+?)(?=\n\s*(?:GROUP|HAVING|ORDER|LIMIT|\)|;|$))/gim, '$1WHERE $2');

  // 7. Fix comparison operators spacing: <=, >=, <>, =, <, >
  text = text.replace(/([a-zA-Z0-9_'"\])])\s*(<=|>=|<>|!=|=|<|>)\s*([a-zA-Z0-9_'"\[(])/g, '$1 $2 $3');

  // 8. Semicolon at end of query if original had it
  if (input.trim().endsWith(';') && !text.trim().endsWith(';')) {
    text = text.trim() + ';';
  }

  return text;
}
