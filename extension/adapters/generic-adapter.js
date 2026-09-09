/**
 * GenericAdapter - Fallback adapter for unknown/random career websites (the 10% case).
 * Uses DOM heuristics, keyword matching, and questionnaire memory.
 */
class GenericAdapter extends BaseAdapter {
  constructor() {
    super('Generic Form Adapter (Unknown Site)');
  }

  matches(url, doc) {
    // Always returns true as fallback
    return true;
  }

  async fill(profile, questionnaire) {
    console.log('[Job Autofill] Running Generic Adapter...');

    // 1. Detect fields using field-detector.js
    const fields = window.detectFormFields ? window.detectFormFields() : [];

    // 2. Classify fields using field-matcher.js
    const classifiedFields = fields.map(fieldData => {
      const classification = window.classifyField ? window.classifyField(fieldData) : { key: null, confidence: 'UNKNOWN' };
      if (classification.key) {
        console.log(`[Job Autofill] Candidate profile match: ${classification.key} (Confidence: ${classification.confidence})`);
      }
      return { fieldData, classification };
    });

    // 3. Fill fields using form-filler.js
    const summary = window.fillFields(classifiedFields, profile, questionnaire);

    // Apply visual highlight to filled elements
    classifiedFields.forEach(({ fieldData, classification }) => {
      if (classification.key && fieldData.element && fieldData.element.value) {
        this.highlightField(fieldData.element, 'success');
      }
    });

    return {
      adapterName: this.name,
      ...summary
    };
  }
}

window.GenericAdapter = GenericAdapter;
