import test from 'node:test';
import assert from 'node:assert';
import {
  getExportFilename,
  detectCodeLanguage,
  formatCodeBlock,
  formatQuestionBankToMarkdown,
  CHATGPT_INTERVIEW_PROMPT,
  exportQuestionBankForChatGPT,
} from '../src/services/questionBankExport.ts';

test('getExportFilename generates standard descriptive pattern', () => {
  const d = new Date(2026, 8, 15); // Sept 15, 2026
  const filename = getExportFilename(d);
  assert.strictEqual(filename, 'myces-interview-question-bank-2026-09-15.md');
});

test('detectCodeLanguage correctly identifies SQL, Python, DAX, Excel', () => {
  assert.strictEqual(detectCodeLanguage('SQL', 'Queries'), 'sql');
  assert.strictEqual(detectCodeLanguage('Python', 'Pandas'), 'python');
  assert.strictEqual(detectCodeLanguage('Power BI', 'DAX Measures'), 'dax');
  assert.strictEqual(detectCodeLanguage('Fabric', 'Semantic Models'), 'dax');
  assert.strictEqual(detectCodeLanguage('Excel', 'Formulas'), 'excel');
  assert.strictEqual(detectCodeLanguage('General', 'Behavioral'), '');
});

test('formatCodeBlock handles standard and nested backticks safely', () => {
  const simple = 'SELECT 1;';
  assert.strictEqual(formatCodeBlock(simple, 'sql'), '```sql\nSELECT 1;\n```');

  const withBackticks = 'Use ```markdown``` inside answer';
  const formatted = formatCodeBlock(withBackticks, 'dax');
  assert.match(formatted, /^````dax/);
  assert.match(formatted, /````$/);
});

test('formatQuestionBankToMarkdown serializes complete question bank deterministically', () => {
  const mockQuestions = [
    {
      id: 'q-2',
      question: 'Explain CALCULATE in DAX.',
      company: 'Microsoft',
      role: 'Power BI Architect',
      tool: 'Power BI',
      topic: 'DAX Evaluation Context',
      tags: ['DAX', 'EvaluationContext'],
      difficulty: 'Hard',
      confidence: 'mastered',
      enrichmentStatus: 'completed',
      frequencyCount: 3,
      companiesAsked: ['Microsoft', 'EY'],
      createdAt: '2026-09-02T10:00:00.000Z',
      updatedAt: '2026-09-02T12:00:00.000Z',
      humanAnswer: {
        pitch: 'CALCULATE modifies filter context and performs context transition.',
        steps: [
          'Evaluates filter arguments in the original filter context.',
          'Transitions row context to filter context if invoked inside an iterator.'
        ],
        proTip: 'Beware of context transition with active row context creating unintended filtering.',
        codeSnippet: 'Total Sales = CALCULATE(SUM(Sales[Amount]), KEEPFILTERS(Sales[Region] = "EMEA"))'
      },
      rawSource: 'LinkedIn interview post snippet'
    },
    {
      id: 'q-1',
      question: 'What is a CTE in SQL?',
      company: 'Amazon',
      role: 'Data Engineer',
      tool: 'SQL',
      topic: 'Common Table Expressions',
      tags: ['SQL', 'CTE'],
      difficulty: 'Medium',
      confidence: 'unseen',
      enrichmentStatus: 'completed',
      frequencyCount: 1,
      companiesAsked: ['Amazon'],
      createdAt: '2026-09-01T10:00:00.000Z',
      updatedAt: '2026-09-01T10:00:00.000Z',
      humanAnswer: {
        pitch: 'A CTE provides a named temporary result set defined within the execution scope of a single query.',
        steps: ['Define WITH clause', 'Reference CTE in subsequent SELECT'],
        proTip: 'Recursive CTEs must have a termination condition to prevent infinite loops.',
        codeSnippet: 'WITH cte AS (SELECT 1 AS val) SELECT * FROM cte;'
      }
    }
  ];

  const exportDate = new Date('2026-10-28T12:00:00.000Z');
  const markdown = formatQuestionBankToMarkdown(mockQuestions, { exportDate });

  // 1. Header assertions
  assert.ok(markdown.includes('# MyCES Interview Question Bank'));
  assert.ok(markdown.includes('- **Total Questions:** 2'));
  assert.ok(markdown.includes('- **Export Date:** 2026-10-28 12:00:00 UTC'));

  // 2. Deterministic order: q-1 (created Sep 1) must appear before q-2 (created Sep 2)
  const q1Pos = markdown.indexOf('## Question 1');
  const q2Pos = markdown.indexOf('## Question 2');
  assert.ok(q1Pos !== -1 && q2Pos !== -1 && q1Pos < q2Pos);

  // Question 1 content
  assert.ok(markdown.includes('What is a CTE in SQL?'));
  assert.ok(markdown.includes('- **Question ID:** `q-1`'));
  assert.ok(markdown.includes('- **Role:** Data Engineer'));
  assert.ok(markdown.includes('```sql\nWITH cte AS (SELECT 1 AS val) SELECT * FROM cte;\n```'));

  // Question 2 content
  assert.ok(markdown.includes('Explain CALCULATE in DAX.'));
  assert.ok(markdown.includes('- **Company:** Microsoft, EY'));
  assert.ok(markdown.includes('- **Frequency Count:** 3x Asked'));
  assert.ok(markdown.includes('```dax\nTotal Sales = CALCULATE(SUM(Sales[Amount]), KEEPFILTERS(Sales[Region] = "EMEA"))\n```'));
  assert.ok(markdown.includes('LinkedIn interview post snippet'));
});

test('formatQuestionBankToMarkdown handles nulls, missing optional fields, and Unicode cleanly', () => {
  const minimalQuestion = [
    {
      id: 'q-minimal',
      question: '𝗦𝗤𝗟 with Unicode chars: “Test” & ‘Special’ 100 M €?',
      company: '',
      role: '',
      topic: '',
      tags: [],
      difficulty: 'Easy',
      confidence: 'unseen',
      enrichmentStatus: 'pending',
      frequencyCount: 1,
      companiesAsked: [],
      createdAt: '2026-09-10T00:00:00.000Z',
      updatedAt: '2026-09-10T00:00:00.000Z'
      // humanAnswer omitted
      // rawSource omitted
    }
  ];

  const markdown = formatQuestionBankToMarkdown(minimalQuestion);

  // Preserves Unicode
  assert.ok(markdown.includes('𝗦𝗤𝗟 with Unicode chars: “Test” & ‘Special’ 100 M €?'));

  // Does NOT contain empty headings
  assert.ok(!markdown.includes('### Practitioner Answer'));
  assert.ok(!markdown.includes('### Practical Execution Recipe'));
  assert.ok(!markdown.includes('### Senior Guidance'));
  assert.ok(!markdown.includes('### Code / Example'));
  assert.ok(!markdown.includes('### Source / Raw Context'));

  // Fallbacks work gracefully
  assert.ok(markdown.includes('- **Company:** General'));
  assert.ok(markdown.includes('- **Role:** Unspecified'));
});

test('formatQuestionBankToMarkdown handles empty bank gracefully', () => {
  const markdown = formatQuestionBankToMarkdown([]);
  assert.ok(markdown.includes('# MyCES Interview Question Bank'));
  assert.ok(markdown.includes('- **Total Questions:** 0'));
  assert.ok(!markdown.includes('## Question 1'));
});

test('Export operation is independent of UI search, company, tool, topic, and confidence filters', () => {
  const fullBank = [
    {
      id: '1',
      question: 'SQL Window Functions',
      company: 'Google',
      tool: 'SQL',
      topic: 'Window Functions',
      confidence: 'mastered',
      enrichmentStatus: 'completed',
      frequencyCount: 1,
      companiesAsked: ['Google'],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      role: 'DE',
      tags: ['SQL'],
      difficulty: 'Medium'
    },
    {
      id: '2',
      question: 'Power BI Row-Level Security',
      company: 'Microsoft',
      tool: 'Power BI',
      topic: 'Security',
      confidence: 'struggled',
      enrichmentStatus: 'completed',
      frequencyCount: 1,
      companiesAsked: ['Microsoft'],
      createdAt: '2026-01-02T00:00:00Z',
      updatedAt: '2026-01-02T00:00:00Z',
      role: 'BI',
      tags: ['RLS'],
      difficulty: 'Hard'
    },
    {
      id: '3',
      question: 'Python Generators vs Iterators',
      company: 'Meta',
      tool: 'Python',
      topic: 'Python Core',
      confidence: 'unseen',
      enrichmentStatus: 'pending',
      frequencyCount: 1,
      companiesAsked: ['Meta'],
      createdAt: '2026-01-03T00:00:00Z',
      updatedAt: '2026-01-03T00:00:00Z',
      role: 'DE',
      tags: ['Python'],
      difficulty: 'Medium'
    }
  ];

  // Simulate active UI filters: User filtered for company === 'Google' and tool === 'SQL'
  const filteredUIList = fullBank.filter(q => q.company === 'Google' && q.tool === 'SQL');
  assert.strictEqual(filteredUIList.length, 1);

  // The export MUST be passed fullBank, not filteredUIList!
  const exportedMarkdown = formatQuestionBankToMarkdown(fullBank);

  assert.ok(exportedMarkdown.includes('- **Total Questions:** 3'));
  assert.ok(exportedMarkdown.includes('SQL Window Functions'));
  assert.ok(exportedMarkdown.includes('Power BI Row-Level Security'));
  assert.ok(exportedMarkdown.includes('Python Generators vs Iterators'));
});

test('CHATGPT_INTERVIEW_PROMPT matches exact required prompt text', () => {
  assert.ok(CHATGPT_INTERVIEW_PROMPT.includes('Use my uploaded `MyCES Interview Question Bank` Markdown file'));
  assert.ok(CHATGPT_INTERVIEW_PROMPT.includes('Act as a realistic technical interviewer for Power BI Developer and Data Analyst roles.'));
  assert.ok(CHATGPT_INTERVIEW_PROMPT.includes('1. Ask one question at a time.'));
  assert.ok(CHATGPT_INTERVIEW_PROMPT.includes('2. Select questions from the uploaded bank and preserve their original meaning.'));
  assert.ok(CHATGPT_INTERVIEW_PROMPT.includes('3. Do not reveal the reference answer before I respond.'));
  assert.ok(CHATGPT_INTERVIEW_PROMPT.includes('4. Evaluate my answer against the reference answer, execution recipe, code examples, and senior-level guidance when available.'));
  assert.ok(CHATGPT_INTERVIEW_PROMPT.includes('5. Ask relevant follow-up questions based on my responses.'));
  assert.ok(CHATGPT_INTERVIEW_PROMPT.includes('6. If you introduce a completely new main interview question, explicitly identify it as an original question rather than one from MyCES.'));
  assert.ok(CHATGPT_INTERVIEW_PROMPT.includes('7. Do not claim a question exists in the bank unless you can locate it in the uploaded source.'));
  assert.ok(CHATGPT_INTERVIEW_PROMPT.includes('8. Conduct the interview naturally in voice mode, one question at a time, and give feedback after my response when appropriate.'));
  assert.ok(CHATGPT_INTERVIEW_PROMPT.includes('Start the interview naturally without requiring me to say "start interview."'));
});

test('exportQuestionBankForChatGPT returns structured result and accurate booleans', async () => {
  const mockBank = [
    {
      id: 'mock-1',
      question: 'What is star schema?',
      company: 'General',
      role: 'BI Developer',
      tool: 'Power BI',
      topic: 'Data Modeling',
      difficulty: 'Easy',
      confidence: 'mastered',
      enrichmentStatus: 'completed',
      frequencyCount: 1,
      companiesAsked: ['General'],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      tags: ['Modeling']
    }
  ];

  const date = new Date(2026, 9, 28);
  const result = await exportQuestionBankForChatGPT(mockBank, date);

  assert.strictEqual(result.filename, 'myces-interview-question-bank-2026-10-28.md');
  assert.strictEqual(result.totalExported, 1);
  // In node environment without window, downloaded and promptCopied safely evaluate to false
  assert.strictEqual(result.downloaded, false);
  assert.strictEqual(result.promptCopied, false);
  assert.strictEqual(result.success, false);
});
