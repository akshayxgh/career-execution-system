/**
 * WorkdayAdapter - Dedicated adapter for Workday career portals (PwC, IBM, Genpact, etc.)
 */
class WorkdayAdapter extends BaseAdapter {
  constructor() {
    super('Workday Dedicated Adapter (PwC / Enterprise)');
  }

  matches(url, doc) {
    if (url.includes('myworkdayjobs.com') || url.includes('myworkday.com')) {
      return true;
    }
    if (doc.querySelector('[data-automation-id="applyFlowPage"]') ||
        doc.querySelector('[data-automation-id="applyFlowPrimaryQuestionsPage"]') ||
        doc.querySelector('[data-automation-id*="formField-"]') ||
        doc.querySelector('[data-automation-id="workdayApplication"]')) {
      return true;
    }
    return false;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Computes the next available workday (skipping Saturday and Sunday)
   */
  getNextWorkday() {
    const d = new Date();
    d.setDate(d.getDate() + 1); // Start with tomorrow
    while (d.getDay() === 0 || d.getDay() === 6) { // 0 = Sunday, 6 = Saturday
      d.setDate(d.getDate() + 1);
    }
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const year = String(d.getFullYear());
    return { month, day, year, formatted: `${month}/${day}/${year}` };
  }

  /**
   * Handles Workday Multi-Select Search Prompts / Pills (e.g. Citizenship Status, Source)
   */
  async setWorkdaySearchPrompt(container, targetText) {
    if (!container || !targetText) return false;
    const searchStr = targetText.toString().trim().toLowerCase();

    // If pill already selected in container, skip
    const existingPills = container.querySelectorAll('[data-automation-id*="selectedItem"], [data-automation-id*="pill"], span[id*="selected"]');
    for (const pill of existingPills) {
      if ((pill.innerText || pill.textContent || '').trim().toLowerCase().includes(searchStr)) {
        return true;
      }
    }

    const promptBtn = container.querySelector('button[aria-haspopup="listbox"], button[data-automation-id*="prompt"], [role="combobox"], [data-automation-id*="multiSelect"]');
    const promptInput = container.querySelector('input[type="text"]');

    const triggerElement = promptBtn || promptInput;
    if (triggerElement) {
      console.log(`[Job Autofill] Triggering search prompt for: "${targetText}"`);
      triggerElement.focus();
      triggerElement.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      triggerElement.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      triggerElement.click();

      await this.delay(250);

      // Search input inside open popup
      const popupSearchInput = document.querySelector('input[data-automation-id*="search"], input[type="search"], [role="searchbox"], input[placeholder*="Search"]');
      if (popupSearchInput) {
        this.setInputValue(popupSearchInput, targetText, true);
        await this.delay(350);
      }

      // Find matching item / checkbox in search results list
      const items = document.querySelectorAll(
        '[role="option"], [data-automation-id*="select-item"], [data-automation-id*="menu-item"], li, div[data-uxi-select-item]'
      );

      let selected = false;
      for (const item of items) {
        const itemText = (item.innerText || item.textContent || '').trim().toLowerCase();
        if (itemText === searchStr || itemText.includes(searchStr)) {
          const checkbox = item.querySelector('input[type="checkbox"]');
          if (checkbox) {
            this.setChecked(checkbox, true);
          } else {
            item.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
            item.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
            item.click();
          }
          selected = true;
          this.highlightField(container, 'success');
          break;
        }
      }

      await this.delay(200);
      // Close popup if still open
      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await this.delay(100);
      return selected;
    }

    return false;
  }

  /**
   * Clicks and selects an option from Workday's custom popup listbox
   */
  async setWorkdayCustomSelect(button, targetText) {
    if (!button || !targetText) return false;
    const searchStr = targetText.toString().trim().toLowerCase();

    const currentText = (button.innerText || button.textContent || '').trim().toLowerCase();
    if (currentText && currentText.includes(searchStr) && !currentText.includes('select one') && !currentText.includes('select...')) {
      return true;
    }

    console.log(`[Job Autofill] Opening Workday dropdown for: "${targetText}"`);
    button.focus();
    button.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    button.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    button.click();

    await this.delay(250);

    const listItems = document.querySelectorAll(
      '[role="option"], [data-automation-id*="select-item"], [data-automation-id*="menu-item"], li[role="option"], div[role="option"], [data-uxi-select-item]'
    );

    let matchedEl = null;

    // 1. Exact match pass
    for (const item of listItems) {
      const itemText = (item.innerText || item.textContent || '').trim().toLowerCase();
      if (itemText === searchStr) {
        matchedEl = item;
        break;
      }
    }

    // 2. Contains match pass
    if (!matchedEl) {
      for (const item of listItems) {
        const itemText = (item.innerText || item.textContent || '').trim().toLowerCase();
        if (itemText.includes(searchStr) || searchStr.includes(itemText)) {
          matchedEl = item;
          break;
        }
      }
    }

    if (matchedEl) {
      console.log(`[Job Autofill] Selecting option: "${matchedEl.innerText.trim()}"`);
      matchedEl.focus();
      matchedEl.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      matchedEl.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      matchedEl.click();

      this.highlightField(button, 'success');
      this.triggerEvents(button);
      await this.delay(150);
      return true;
    } else {
      console.warn(`[Job Autofill] No option matching "${targetText}" found in dropdown`);
      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await this.delay(100);
      return false;
    }
  }

  /**
   * Fills Workday multi-part Date Input (Month, Day, Year) with next available workday or specific date
   */
  setDateInput(dateWrapper, dateString) {
    if (!dateWrapper) return false;

    let month, day, year;

    if (!dateString || dateString === 'next_workday' || dateString.toLowerCase().includes('immediate') || dateString.toLowerCase().includes('start date')) {
      const nextWd = this.getNextWorkday();
      month = nextWd.month;
      day = nextWd.day;
      year = nextWd.year;
    } else {
      const parts = dateString.split(/[\/\-\.]/);
      if (parts.length >= 3) {
        if (parts[0].length === 4) {
          year = parts[0]; month = parts[1]; day = parts[2];
        } else if (parseInt(parts[0]) > 12) {
          day = parts[0]; month = parts[1]; year = parts[2];
        } else {
          // Check if DD/MM/YYYY vs MM/DD/YYYY
          month = parts[0]; day = parts[1]; year = parts[2];
        }
      } else {
        const nextWd = this.getNextWorkday();
        month = nextWd.month; day = nextWd.day; year = nextWd.year;
      }
    }

    console.log(`[Job Autofill] Populating Date Input: ${month}/${day}/${year}`);

    const setSection = (type, val) => {
      const input = dateWrapper.querySelector(`[data-automation-id="dateSection${type}-input"]`);
      const display = dateWrapper.querySelector(`[data-automation-id="dateSection${type}-display"]`);
      if (input) {
        input.focus();
        this.setInputValue(input, val, true);
        input.setAttribute('aria-valuenow', parseInt(val));
        input.setAttribute('aria-valuetext', val);
        if (display) display.textContent = val;
        this.triggerEvents(input);
      }
    };

    setSection('Month', month.padStart(2, '0'));
    setSection('Day', day.padStart(2, '0'));
    setSection('Year', year);

    this.highlightField(dateWrapper, 'success');
    this.triggerEvents(dateWrapper);
    return true;
  }

  async fill(profile, questionnaire) {
    console.log('[Job Autofill] Running Workday / PwC Dedicated Adapter...');
    let filledProfile = 0;
    let filledQuestionnaire = 0;
    let skipped = 0;
    let unknown = 0;

    // -------------------------------------------------------------
    // 1. STANDARD PROFILE MAPPING (Page 1: My Information)
    // -------------------------------------------------------------
    const hasMiddleName = document.querySelector('[data-automation-id="legalNameSection_middleName"]') !== null;
    const dynamicProfile = { ...profile };
    if (!hasMiddleName && dynamicProfile.fallback_last_name) {
      dynamicProfile.last_name = dynamicProfile.fallback_last_name;
    }

    const standardFields = [
      { key: 'first_name', selectors: ['[data-automation-id="legalNameSection_firstName"]', 'input[id*="firstName"]'] },
      { key: 'middle_name', selectors: ['[data-automation-id="legalNameSection_middleName"]', 'input[id*="middleName"]'] },
      { key: 'last_name', selectors: ['[data-automation-id="legalNameSection_lastName"]', 'input[id*="lastName"]'] },
      { key: 'email', selectors: ['[data-automation-id="email"]', '[data-automation-id="contactInfoEmail"]', 'input[type="email"]'] },
      { key: 'phone', selectors: ['[data-automation-id="phone-number"]', '[data-automation-id="phoneNumber"]', 'input[id*="phone"]'] },
      { key: 'address_line_1', selectors: ['[data-automation-id="addressSection_addressLine1"]', 'input[id*="addressLine1"]'] },
      { key: 'address_line_2', selectors: ['[data-automation-id="addressSection_addressLine2"]', 'input[id*="addressLine2"]'] },
      { key: 'city', selectors: ['[data-automation-id="addressSection_city"]', 'input[id*="city"]'] },
      { key: 'postal_code', selectors: ['[data-automation-id="addressSection_postalCode"]', 'input[id*="postalCode"]', 'input[id*="zip"]'] },
      { key: 'linkedin_url', selectors: ['[data-automation-id="linkedinQuestion"]', 'input[id*="linkedin"]', 'input[aria-label*="LinkedIn"]'] }
    ];

    for (const item of standardFields) {
      try {
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
      } catch (e) {
        console.warn(`[Job Autofill] Error filling standard field ${item.key}:`, e);
      }
    }

    // -------------------------------------------------------------
    // 2. QUESTIONNAIRE & WORKDAY FORM FIELD SCANNING (All Pages)
    // -------------------------------------------------------------
    const formFields = document.querySelectorAll(
      '[data-automation-id^="formField-"], [data-fkit-id^="primaryQuestionnaire--"], fieldset, [data-automation-id="formField"], .form-group, div[data-uxi-form-item]'
    );
    
    console.log(`[Job Autofill] Found ${formFields.length} field containers`);

    for (const fieldContainer of formFields) {
      try {
        const richText = fieldContainer.querySelector('[data-automation-id="richText"], legend, label, [data-automation-id="formLabel"], h3, h4, span.css-');
        if (!richText) continue;

        const questionText = (richText.innerText || richText.textContent || '').trim();
        if (!questionText) continue;

        // Check if Date picker (Earliest Start Date or Date of Birth)
        const dateWrapper = fieldContainer.querySelector('[data-automation-id="dateInputWrapper"]');
        if (dateWrapper) {
          if (questionText.toLowerCase().includes('start date') || questionText.toLowerCase().includes('earliest')) {
            if (this.setDateInput(dateWrapper, 'next_workday')) {
              filledQuestionnaire++;
              continue;
            }
          } else if (questionText.toLowerCase().includes('birth') || questionText.toLowerCase().includes('dob')) {
            if (this.setDateInput(dateWrapper, '05/09/1997')) {
              filledQuestionnaire++;
              continue;
            }
          }
        }

        const qAnswer = window.questionnaireModule.matchQuestion(questionText, questionnaire);
        if (qAnswer === null || qAnswer === undefined || qAnswer === '') {
          continue;
        }

        console.log(`[Job Autofill] Matched: "${questionText.substring(0, 35)}..." => "${qAnswer}"`);

        const promptContainer = fieldContainer.querySelector('[data-automation-id*="prompt"], [data-automation-id*="multiSelect"], div.css-12zup1l');
        const listboxButton = fieldContainer.querySelector('button[aria-haspopup="listbox"], button[id^="primaryQuestionnaire--"], button[data-automation-id*="dropdown"]');
        const textarea = fieldContainer.querySelector('textarea');
        const standardInput = fieldContainer.querySelector('input[type="text"]:not(.css-77hcv), input[type="tel"]');
        const radioEls = fieldContainer.querySelectorAll('input[type="radio"]');
        const checkboxEl = fieldContainer.querySelector('input[type="checkbox"]');

        // A. Search Prompt / Pill Container (e.g. Citizenship Status)
        if (promptContainer && (questionText.toLowerCase().includes('citizenship') || questionText.toLowerCase().includes('hear about us'))) {
          const success = await this.setWorkdaySearchPrompt(promptContainer, qAnswer);
          if (success) {
            filledQuestionnaire++;
            continue;
          }
        }

        // B. Workday Listbox Button (Select One / Dropdown)
        if (listboxButton) {
          const success = await this.setWorkdayCustomSelect(listboxButton, qAnswer);
          if (success) filledQuestionnaire++;
        }
        // C. Textarea
        else if (textarea) {
          if (!textarea.value || textarea.value.trim() === '') {
            if (this.setInputValue(textarea, qAnswer)) filledQuestionnaire++;
          }
        }
        // D. Date Input
        else if (dateWrapper) {
          if (this.setDateInput(dateWrapper, qAnswer)) filledQuestionnaire++;
        }
        // E. Radio Buttons
        else if (radioEls && radioEls.length > 0) {
          const targetStr = qAnswer.toString().trim().toLowerCase();
          for (const radio of radioEls) {
            const radioLabel = radio.closest('label')?.innerText || radio.getAttribute('aria-label') || radio.value || '';
            if (radioLabel.trim().toLowerCase().includes(targetStr)) {
              this.setChecked(radio, true);
              filledQuestionnaire++;
              break;
            }
          }
        }
        // F. Checkbox (e.g. Terms and Conditions)
        else if (checkboxEl) {
          const shouldCheck = (qAnswer.toString().toLowerCase() === 'true' || qAnswer.toString().toLowerCase() === 'yes');
          if (this.setChecked(checkboxEl, shouldCheck)) filledQuestionnaire++;
        }
        // G. Standard Input (City of birth, etc.)
        else if (standardInput) {
          if (!standardInput.value || standardInput.value.trim() === '') {
            if (this.setInputValue(standardInput, qAnswer)) filledQuestionnaire++;
          }
        }
      } catch (err) {
        console.error('[Job Autofill] Error processing field container:', err);
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

window.WorkdayAdapter = WorkdayAdapter;
