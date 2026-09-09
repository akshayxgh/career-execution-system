/**
 * LeverAdapter - Dedicated adapter for Lever job applications (jobs.lever.co)
 */
class LeverAdapter extends BaseAdapter {
  constructor() {
    super('Lever Dedicated Adapter');
  }

  matches(url, doc) {
    if (url.includes('jobs.lever.co')) return true;
    if (doc.querySelector('.lever-form') || doc.querySelector('.application-form')) return true;
    return false;
  }

  async fill(profile, questionnaire) {
    console.log('[Job Autofill] Running Lever Dedicated Adapter...');
    let filledProfile = 0;
    let filledQuestionnaire = 0;
    let skipped = 0;
    let unknown = 0;

    const mapping = [
      { key: 'full_name', selectors: ['input[name="name"]', '#name'] },
      { key: 'email', selectors: ['input[name="email"]', '#email'] },
      { key: 'phone', selectors: ['input[name="phone"]', '#phone'] },
      { key: 'current_company', selectors: ['input[name="org"]', '#org'] },
      { key: 'linkedin_url', selectors: ['input[name="urls[LinkedIn]"]', 'input[name*="LinkedIn"]'] },
      { key: 'github_url', selectors: ['input[name="urls[GitHub]"]', 'input[name*="GitHub"]'] }
    ];

    for (const item of mapping) {
      const val = profile[item.key];
      if (!val) continue;

      for (const sel of item.selectors) {
        const el = document.querySelector(sel);
        if (el && !el.disabled && !el.readOnly) {
          if (this.setInputValue(el, val)) filledProfile++;
          break;
        }
      }
    }

    // Lever Custom Questions
    const customQuestions = document.querySelectorAll('.application-question');
    customQuestions.forEach(q => {
      const label = q.querySelector('.text, label');
      if (!label) return;

      const labelText = label.innerText || label.textContent;
      const qAnswer = window.questionnaireModule.matchQuestion(labelText, questionnaire);
      if (qAnswer) {
        const input = q.querySelector('input, textarea, select');
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

window.LeverAdapter = LeverAdapter;
