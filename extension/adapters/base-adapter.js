/**
 * BaseAdapter - Foundation class for all site adapters (known and generic).
 */
class BaseAdapter {
  constructor(name) {
    this.name = name;
  }

  matches(url, doc) {
    return false;
  }

  /**
   * Safely sets value on input/textarea elements, including React synthetic event support.
   * Properly distinguishes between HTMLInputElement and HTMLTextAreaElement to avoid 'Illegal invocation'.
   */
  setInputValue(element, value, forceOverwrite = false) {
    if (!element || value === undefined || value === null) return false;

    // Blank check: only fill if blank unless forceOverwrite is true
    if (!forceOverwrite && element.value && element.value.trim() !== '') {
      console.log(`[Job Autofill] Skipping pre-filled field: ${element.name || element.id || 'input'}`);
      return false;
    }

    try {
      const isTextArea = element instanceof HTMLTextAreaElement || element.tagName.toLowerCase() === 'textarea';
      
      let nativeSetter = null;
      if (isTextArea) {
        nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
      } else {
        nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      }

      if (nativeSetter) {
        nativeSetter.call(element, value);
      } else {
        element.value = value;
      }

      this.triggerEvents(element);
      this.highlightField(element, 'success');
      return true;
    } catch (e) {
      console.error('[Job Autofill] Error setting input value on element:', element, e);
      try {
        element.value = value;
        this.triggerEvents(element);
        return true;
      } catch (e2) {
        return false;
      }
    }
  }

  /**
   * Matches and selects an option in a standard <select> element.
   */
  setSelectValue(element, targetValue, forceOverwrite = false) {
    if (!element || !targetValue) return false;

    if (!forceOverwrite && element.value && element.selectedIndex > 0) {
      const selectedOpt = element.options[element.selectedIndex];
      if (selectedOpt && selectedOpt.value && selectedOpt.value !== 'select' && selectedOpt.value !== '') {
        return false;
      }
    }

    const targetStr = targetValue.toString().trim().toLowerCase();
    const options = Array.from(element.options);

    // 1. Exact text or value match
    for (let opt of options) {
      const optText = opt.text.trim().toLowerCase();
      const optVal = opt.value.trim().toLowerCase();
      if (optText === targetStr || optVal === targetStr) {
        element.value = opt.value;
        this.triggerEvents(element);
        this.highlightField(element, 'success');
        return true;
      }
    }

    // 2. Contains match
    for (let opt of options) {
      const optText = opt.text.trim().toLowerCase();
      if (optText.includes(targetStr) || targetStr.includes(optText)) {
        element.value = opt.value;
        this.triggerEvents(element);
        this.highlightField(element, 'partial');
        return true;
      }
    }

    return false;
  }

  setChecked(element, checked = true) {
    if (!element) return false;
    if (element.checked === checked) return true;
    
    element.checked = checked;
    this.triggerEvents(element);
    this.highlightField(element, 'success');
    return true;
  }

  triggerEvents(element) {
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  highlightField(element, status = 'success') {
    const colors = {
      success: '#10b981',
      partial: '#f59e0b',
      review: '#ef4444'
    };

    const color = colors[status] || colors.success;
    element.style.transition = 'box-shadow 0.3s ease, border-color 0.3s ease';
    element.style.borderColor = color;
    element.style.boxShadow = `0 0 0 2px ${color}33`;
  }

  async fill(profile, questionnaire) {
    throw new Error(`fill() method not implemented on ${this.name}`);
  }
}

window.BaseAdapter = BaseAdapter;
