/**
 * GreenhouseAdapter - Dedicated adapter for Greenhouse job boards (boards.greenhouse.io, embedded forms)
 */
class GreenhouseAdapter extends BaseAdapter {
  constructor() {
    super('Greenhouse Dedicated Adapter');
  }

  matches(url, doc) {
    if (url.includes('greenhouse.io') || url.includes('boards.eu.greenhouse.io')) {
      return true;
    }
    if (doc.querySelector('#application_form') || doc.querySelector('#greenhouse-app')) {
      return true;
    }
    return false;
  }

  async fill(profile, questionnaire) {
    console.log('[Job Autofill] Running Greenhouse Dedicated Adapter...');
    let filledProfile = 0;
    let filledQuestionnaire = 0;
    let skipped = 0;
    let unknown = 0;

    const mapping = [
      { key: 'first_name', selectors: ['#first_name', 'input[name*="first_name"]'] },
      { key: 'last_name', selectors: ['#last_name', 'input[name*="last_name"]'] },
      { key: 'email', selectors: ['#email', 'input[name*="email"]'] },
      { key: 'phone', selectors: ['#phone', 'input[name*="phone"]'] },
      { key: 'linkedin_url', selectors: ['input[autocomplete="custom-question-linkedin-profile"]', 'input[id*="linkedin"]', 'input[name*="linkedin"]'] },
      { key: 'city', selectors: ['input[id*="city"]', 'input[name*="city"]'] }
    ];

    for (const item of mapping) {
      const val = profile[item.key];
      if (!val) continue;

      for (const sel of item.selectors) {
        const el = document.querySelector(sel);
        if (el && !el.disabled && !el.readOnly) {
          if (el.tagName.toLowerCase() === 'select') {
            if (this.setSelectValue(el, val)) filledProfile++;
          } else {
            if (this.setInputValue(el, val)) filledProfile++;
          }
          break;
        }
      }
    }

    // Greenhouse custom questions (often inside .field classes with label)
    const fields = document.querySelectorAll('.field, .custom-question');
    fields.forEach(field => {
      const label = field.querySelector('label');
      if (!label) return;

      const labelText = label.innerText || label.textContent;
      const qAnswer = window.questionnaireModule.matchQuestion(labelText, questionnaire);
      if (qAnswer) {
        const input = field.querySelector('input:not([type="hidden"]), select, textarea');
        if (input && !input.value) {
          if (input.tagName.toLowerCase() === 'select') {
            if (this.setSelectValue(input, qAnswer)) filledQuestionnaire++;
          } else {
            if (this.setInputValue(input, qAnswer)) filledQuestionnaire++;
          }
        }
      }
    });

    return {
      adapterName: this.name,
      filled: filledProfile + filledQuestionnaire,
      filledProfile,
      filledQuestionnaire,
      skipped,
      unknown
    };
  }
}

window.GreenhouseAdapter = GreenhouseAdapter;
