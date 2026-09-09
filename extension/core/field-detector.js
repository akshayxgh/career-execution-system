function detectFormFields() {
  const elements = document.querySelectorAll('input, select, textarea');
  const fields = [];

  elements.forEach((el) => {
    // Skip hidden or unuseful inputs
    if (el.type === 'hidden' || el.type === 'submit' || el.type === 'button' || el.type === 'image') {
      return;
    }
    // Skip if disabled or readonly
    if (el.disabled || el.readOnly) {
      return;
    }

    const fieldData = {
      element: el,
      type: el.tagName.toLowerCase() === 'input' ? el.type : el.tagName.toLowerCase(),
      name: el.name || '',
      id: el.id || '',
      placeholder: el.placeholder || '',
      ariaLabel: el.getAttribute('aria-label') || '',
      autocomplete: el.getAttribute('autocomplete') || '',
      label: ''
    };

    // Try to find associated label
    if (el.id) {
      const labelEl = document.querySelector(`label[for="${el.id}"]`);
      if (labelEl) {
        fieldData.label = labelEl.innerText || labelEl.textContent;
      }
    }

    // If no explicit label, try wrapping label
    if (!fieldData.label && el.closest('label')) {
      fieldData.label = el.closest('label').innerText || el.closest('label').textContent;
    }

    fields.push(fieldData);
  });

  console.log(`[Job Autofill] Detected ${fields.length} fields`);
  return fields;
}

window.detectFormFields = detectFormFields;
