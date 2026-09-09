/**
 * SuccessFactorsAdapter - Dedicated adapter for SAP SuccessFactors portals (Accenture, EY, etc.)
 */
class SuccessFactorsAdapter extends BaseAdapter {
  constructor() {
    super('SAP SuccessFactors Dedicated Adapter');
  }

  matches(url, doc) {
    if (url.includes('successfactors') || url.includes('jobs.accenture.com') || url.includes('ey.com')) {
      return true;
    }
    // Check for SuccessFactors specific markers in DOM
    if (doc.querySelector('[id*="fbclc_"]') || 
        doc.querySelector('.sf-form') || 
        doc.querySelector('[id*="career_portal"]')) {
      return true;
    }
    return false;
  }

  async fill(profile, questionnaire) {
    console.log('[Job Autofill] Running SuccessFactors Dedicated Adapter...');
    let filledProfile = 0;
    let filledQuestionnaire = 0;
    let skipped = 0;
    let unknown = 0;

    const mapping = [
      { key: 'first_name', selectors: ['input[id*="firstName"]', 'input[name*="firstName"]', 'input[id*="fbclc_fname"]'] },
      { key: 'middle_name', selectors: ['input[id*="middleName"]', 'input[name*="middleName"]', 'input[id*="fbclc_mname"]'] },
      { key: 'last_name', selectors: ['input[id*="lastName"]', 'input[name*="lastName"]', 'input[id*="fbclc_lname"]'] },
      { key: 'email', selectors: ['input[id*="email"]', 'input[name*="email"]', 'input[type="email"]'] },
      { key: 'phone', selectors: ['input[id*="phone"]', 'input[id*="cellPhone"]', 'input[name*="phone"]'] },
      { key: 'address_line_1', selectors: ['input[id*="address1"]', 'input[id*="addressLine1"]', 'input[name*="address1"]'] },
      { key: 'address_line_2', selectors: ['input[id*="address2"]', 'input[id*="addressLine2"]', 'input[name*="address2"]'] },
      { key: 'city', selectors: ['input[id*="city"]', 'input[name*="city"]'] },
      { key: 'state', selectors: ['select[id*="state"]', 'input[id*="state"]'] },
      { key: 'country', selectors: ['select[id*="country"]', 'input[id*="country"]'] },
      { key: 'postal_code', selectors: ['input[id*="zip"]', 'input[id*="postalCode"]', 'input[id*="zipCode"]'] }
    ];

    const hasMiddleName = document.querySelector('input[id*="middleName"], input[name*="middleName"]') !== null;
    const dynamicProfile = { ...profile };
    if (!hasMiddleName && dynamicProfile.fallback_last_name) {
      dynamicProfile.last_name = dynamicProfile.fallback_last_name;
    }

    for (const item of mapping) {
      const val = dynamicProfile[item.key];
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

    // SuccessFactors Table & Field Questionnaire Matching
    const rows = document.querySelectorAll('tr, .form-group, .question-row, div.field');
    rows.forEach(row => {
      const labelEl = row.querySelector('label, td.label, span.title, th');
      if (!labelEl) return;

      const labelText = labelEl.innerText || labelEl.textContent;
      const qAnswer = window.questionnaireModule.matchQuestion(labelText, questionnaire);
      if (qAnswer) {
        const inputEl = row.querySelector('input:not([type="hidden"]), select, textarea');
        if (inputEl && !inputEl.value) {
          if (inputEl.tagName.toLowerCase() === 'select') {
            if (this.setSelectValue(inputEl, qAnswer)) filledQuestionnaire++;
          } else {
            if (this.setInputValue(inputEl, qAnswer)) filledQuestionnaire++;
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

window.SuccessFactorsAdapter = SuccessFactorsAdapter;
