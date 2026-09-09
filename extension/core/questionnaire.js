function normalizeQuestionText(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[\n\r\t]+/g, ' ')       // collapse newlines/tabs
    .replace(/[^\w\s]/g, '')          // remove punctuation
    .replace(/\s+/g, ' ')             // collapse spaces
    .trim();
}

function matchQuestion(fieldLabel, questionnaire) {
  if (!fieldLabel || !questionnaire || !Array.isArray(questionnaire)) {
    return null;
  }

  const normalizedLabel = normalizeQuestionText(fieldLabel);
  if (!normalizedLabel) return null;

  // 1. Exact match pass
  for (const entry of questionnaire) {
    if (!entry.question) continue;
    
    const normalizedQ = normalizeQuestionText(entry.question);
    if (normalizedQ === normalizedLabel) {
      return entry.answer;
    }

    if (entry.aliases && Array.isArray(entry.aliases)) {
      for (const alias of entry.aliases) {
        if (normalizeQuestionText(alias) === normalizedLabel) {
          return entry.answer;
        }
      }
    }
  }

  // 2. Substring / contains match pass (for Workday labels with extra wrapper text)
  for (const entry of questionnaire) {
    if (!entry.question) continue;
    
    const normalizedQ = normalizeQuestionText(entry.question);
    if (normalizedQ.length > 10 && (normalizedLabel.includes(normalizedQ) || normalizedQ.includes(normalizedLabel))) {
      return entry.answer;
    }

    if (entry.aliases && Array.isArray(entry.aliases)) {
      for (const alias of entry.aliases) {
        const normAlias = normalizeQuestionText(alias);
        if (normAlias.length > 5 && (normalizedLabel.includes(normAlias) || normAlias.includes(normalizedLabel))) {
          return entry.answer;
        }
      }
    }
  }

  return null;
}

window.questionnaireModule = {
  normalizeQuestionText,
  matchQuestion
};
