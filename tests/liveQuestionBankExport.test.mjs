import test from 'node:test';
import assert from 'node:assert';
import { createClient } from '@supabase/supabase-js';
import {
  formatQuestionBankToMarkdown,
  getExportFilename
} from '../src/services/questionBankExport.ts';

test('Verify authoritative Supabase question bank exports 100% of all 254 questions without truncation', async () => {
  const supabaseUrl = 'https://nnicnxwzuvinaqvxuvsh.supabase.co';
  const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uaWNueHd6dXZpbmFxdnh1dnNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1MzgxNTYsImV4cCI6MjA5ODExNDE1Nn0.c_s_9DZ4qEX47xzNluAPG9HXHsiAnFGTZ8EeXz38yqU';

  const client = createClient(supabaseUrl, supabaseAnonKey);
  const { data, error } = await client.from('app_state').select('data').eq('user_id', 'Akshay').single();

  assert.ok(!error, `Failed to load app_state from Supabase: ${error?.message}`);
  const questions = data?.data?.questionBank || [];

  assert.ok(questions.length >= 254, `Expected at least 254 questions, found ${questions.length}`);
  console.log(`[Test] Successfully loaded ${questions.length} authoritative questions from Supabase.`);

  const markdown = formatQuestionBankToMarkdown(questions);

  // Assert header has exact count
  assert.ok(markdown.includes(`- **Total Questions:** ${questions.length}`));

  // Assert every single question ID is present in the markdown
  for (const q of questions) {
    assert.ok(
      markdown.includes(q.id),
      `Question with ID ${q.id} was missing from the exported Markdown!`
    );
  }

  // Assert all question sections are numbered up to questions.length
  assert.ok(markdown.includes(`## Question 1`));
  assert.ok(markdown.includes(`## Question ${questions.length}`));

  // Verify filename
  const filename = getExportFilename();
  assert.match(filename, /^myces-interview-question-bank-\d{4}-\d{2}-\d{2}\.md$/);

  console.log(`[Test] Verified all ${questions.length} questions exist in exported markdown. Total length: ${markdown.length} characters.`);
});
