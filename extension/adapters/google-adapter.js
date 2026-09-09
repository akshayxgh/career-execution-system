/**
 * GoogleAdapter - Dedicated adapter for Google Careers (careers.google.com)
 */
class GoogleAdapter extends BaseAdapter {
  constructor() {
    super('Google Careers Dedicated Adapter');
  }

  matches(url, doc) {
    if (url.includes('careers.google.com') || url.includes('google.com/about/careers')) {
      return true;
    }
    return false;
  }

  async fill(profile, questionnaire) {
    console.log('[Job Autofill] Running Google Careers Dedicated Adapter...');
    let filledProfile = 0;
    let filledQuestionnaire = 0;
    let skipped = 0;
    let unknown = 0;

    const mapping = [
      { key: 'full_name', selectors: ['input[aria-label*="Legal name"]', 'input[name*="name"]'] },
      { key: 'email', selectors: ['input[aria-label*="Email"]', 'input[type="email"]'] },
      { key: 'phone', selectors: ['input[aria-label*="Phone"]', 'input[type="tel"]'] },
      { key: 'city', selectors: ['input[aria-label*="City"]', 'input[aria-label*="Location"]'] },
      { key: 'country', selectors: ['input[aria-label*="Country"]'] }
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

window.GoogleAdapter = GoogleAdapter;
