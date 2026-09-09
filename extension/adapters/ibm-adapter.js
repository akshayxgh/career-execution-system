/**
 * IBMAdapter - Dedicated adapter for IBM Careers (careers.ibm.com / IBM BrassRing / Carbon Design)
 */
class IBMAdapter extends BaseAdapter {
  constructor() {
    super('IBM Dedicated Adapter');
  }

  matches(url, doc) {
    if (url.includes('careers.ibm.com') || url.includes('ibm.com/careers') || url.includes('brassring.com')) {
      return true;
    }
    if (doc.querySelector('[data-automation-id="ibm-application"]') || 
        doc.querySelector('.ibm-careers') || 
        doc.querySelector('img[alt*="IBM"]') ||
        doc.title.toLowerCase().includes('ibm careers')) {
      return true;
    }
    return false;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Helper to set Carbon Design / IBM custom dropdowns
   */
  async setCarbonSelect(containerOrButton, targetText) {
    if (!containerOrButton || !targetText) return false;
    const searchStr = targetText.toString().trim().toLowerCase();

    // 1. Standard HTML Select
    if (containerOrButton.tagName.toLowerCase() === 'select') {
      return this.setSelectValue(containerOrButton, targetText);
    }

    // 2. Custom button or combobox
    const button = containerOrButton.tagName.toLowerCase() === 'button' || containerOrButton.getAttribute('role') === 'combobox'
      ? containerOrButton
      : containerOrButton.querySelector('button, [role="combobox"], [data-testid*="dropdown"], .bx--dropdown, .cds--dropdown');

    if (button) {
      const currentText = (button.innerText || button.textContent || '').trim().toLowerCase();
      if (currentText && currentText.includes(searchStr) && !currentText.includes('select an option') && !currentText.includes('select one')) {
        return true;
      }

      console.log(`[Job Autofill - IBM] Opening dropdown for: "${targetText}"`);
      button.focus();
      button.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      button.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      button.click();

      await this.delay(200);

      // Search for options in open menu
      const listItems = document.querySelectorAll(
        '[role="option"], [data-testid*="option"], .bx--list-box__menu-item, .cds--list-box__menu-item, li[role="option"], div[role="option"]'
      );

      let matchedEl = null;
      for (const item of listItems) {
        const itemText = (item.innerText || item.textContent || '').trim().toLowerCase();
        if (itemText === searchStr) {
          matchedEl = item;
          break;
        }
      }

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
        console.log(`[Job Autofill - IBM] Selecting option: "${matchedEl.innerText.trim()}"`);
        matchedEl.focus();
        matchedEl.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        matchedEl.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        matchedEl.click();

        this.highlightField(button, 'success');
        this.triggerEvents(button);
        await this.delay(150);
        return true;
      } else {
        // Click document to dismiss dropdown if no match
        document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await this.delay(100);
      }
    }

    return false;
  }

  async fill(profile, questionnaire) {
    console.log('[Job Autofill] Running IBM Dedicated Adapter...');
    let filledProfile = 0;
    let filledQuestionnaire = 0;
    let skipped = 0;
    let unknown = 0;

    // -------------------------------------------------------------
    // 1. PRIVACY NOTICE CHECKBOX ("I agree" / IBM Talent Acquisition Privacy Notice)
    // -------------------------------------------------------------
    const allCheckboxes = document.querySelectorAll('input[type="checkbox"]');
    for (const cb of allCheckboxes) {
      const containerText = (cb.closest('div, fieldset, label, p')?.innerText || '').toLowerCase();
      if (containerText.includes('i agree') || containerText.includes('privacy notice') || containerText.includes('ibm talent acquisition')) {
        if (!cb.checked) {
          if (this.setChecked(cb, true)) {
            filledQuestionnaire++;
            console.log('[Job Autofill - IBM] Checked Privacy Notice consent checkbox');
          }
        }
      }
    }

    // -------------------------------------------------------------
    // 2. CHINA / SOUTH KOREA RESIDENCY QUESTION -> "No"
    // -------------------------------------------------------------
    const allLabels = document.querySelectorAll('label, legend, span, p, div');
    for (const lbl of allLabels) {
      const text = (lbl.innerText || lbl.textContent || '').trim();
      if (text.toLowerCase().includes('resident of china or south korea')) {
        const container = lbl.closest('div.form-group, fieldset, div') || lbl.parentElement;
        if (container) {
          const select = container.querySelector('select, button, [role="combobox"], div[class*="dropdown"]');
          if (select) {
            if (select.tagName.toLowerCase() === 'select') {
              if (this.setSelectValue(select, 'No')) filledQuestionnaire++;
            } else {
              const success = await this.setCarbonSelect(select, 'No');
              if (success) filledQuestionnaire++;
            }
          }
        }
        break;
      }
    }

    // -------------------------------------------------------------
    // 3. WORK HISTORY: "Is current position? *" -> "No" (or "Yes" if currently working)
    // -------------------------------------------------------------
    const allCurrentPosLabels = document.querySelectorAll('label, legend, span, p');
    for (const lbl of allCurrentPosLabels) {
      const text = (lbl.innerText || lbl.textContent || '').trim();
      if (text.toLowerCase().includes('is current position')) {
        const container = lbl.closest('div.form-group, fieldset, div') || lbl.parentElement;
        if (container) {
          const select = container.querySelector('select, button, [role="combobox"], div[class*="dropdown"]');
          if (select) {
            if (select.tagName.toLowerCase() === 'select') {
              if (this.setSelectValue(select, 'No')) filledQuestionnaire++;
            } else {
              const success = await this.setCarbonSelect(select, 'No');
              if (success) filledQuestionnaire++;
            }
          }
        }
      }
    }

    // -------------------------------------------------------------
    // 4. GENERAL QUESTIONNAIRE & PROFILE FIELD FILLING (Fallback)
    // -------------------------------------------------------------
    const formContainers = document.querySelectorAll('.form-group, fieldset, [data-testid*="form"], div.bx--form-item, div.cds--form-item');
    for (const container of formContainers) {
      try {
        const labelEl = container.querySelector('label, legend, .bx--label, .cds--label');
        if (!labelEl) continue;

        const labelText = (labelEl.innerText || labelEl.textContent || '').trim();
        if (!labelText) continue;

        const qAnswer = window.questionnaireModule.matchQuestion(labelText, questionnaire);
        if (qAnswer === null || qAnswer === undefined || qAnswer === '') continue;

        const selectEl = container.querySelector('select, button[aria-haspopup="listbox"], [role="combobox"]');
        const textInput = container.querySelector('input[type="text"], textarea');
        const radioEls = container.querySelectorAll('input[type="radio"]');
        const checkboxEl = container.querySelector('input[type="checkbox"]');

        if (selectEl) {
          if (selectEl.tagName.toLowerCase() === 'select') {
            if (this.setSelectValue(selectEl, qAnswer)) filledQuestionnaire++;
          } else {
            const success = await this.setCarbonSelect(selectEl, qAnswer);
            if (success) filledQuestionnaire++;
          }
        } else if (textInput && (!textInput.value || textInput.value.trim() === '')) {
          if (this.setInputValue(textInput, qAnswer)) filledQuestionnaire++;
        } else if (radioEls && radioEls.length > 0) {
          const targetStr = qAnswer.toString().trim().toLowerCase();
          for (const radio of radioEls) {
            const radioLabel = radio.closest('label')?.innerText || radio.value || '';
            if (radioLabel.trim().toLowerCase().includes(targetStr)) {
              this.setChecked(radio, true);
              filledQuestionnaire++;
              break;
            }
          }
        } else if (checkboxEl) {
          const shouldCheck = (qAnswer.toString().toLowerCase() === 'true' || qAnswer.toString().toLowerCase() === 'yes');
          if (this.setChecked(checkboxEl, shouldCheck)) filledQuestionnaire++;
        }
      } catch (err) {
        console.error('[Job Autofill - IBM] Error filling field:', err);
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

window.IBMAdapter = IBMAdapter;
