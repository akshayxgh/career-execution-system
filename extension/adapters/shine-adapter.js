/**
 * ShineAdapter - Dedicated Auto-Apply adapter for Shine.com
 */
class ShineAdapter extends BaseAdapter {
  constructor() {
    super('Shine.com Dedicated Adapter');
  }

  matches(url, doc) {
    if (url.includes('shine.com')) {
      return true;
    }
    if (doc.querySelector('#shineJobs') || 
        doc.querySelector('.shine-job') || 
        doc.querySelector('img[alt*="Shine"]') ||
        doc.title.toLowerCase().includes('shine.com')) {
      return true;
    }
    return false;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Scans and fills any screening modal questions if Shine pops one up after clicking apply
   */
  async handleScreeningModal(modal, profile, questionnaire) {
    console.log('[Job Autofill - Shine] Handling screening modal...');
    let modalFilled = 0;
    let unhandledQuestions = 0;

    const fields = modal.querySelectorAll('.form-group, .input-wrapper, div[class*="field"], label, p');
    for (const field of fields) {
      const labelText = (field.innerText || field.textContent || '').trim();
      if (!labelText) continue;

      const qAnswer = window.questionnaireModule.matchQuestion(labelText, questionnaire);
      const select = field.querySelector('select') || field.closest('div')?.querySelector('select');
      const input = field.querySelector('input:not([type="hidden"]), textarea') || field.closest('div')?.querySelector('input:not([type="hidden"]), textarea');
      const radios = field.querySelectorAll('input[type="radio"]') || field.closest('div')?.querySelectorAll('input[type="radio"]');

      if (qAnswer) {
        if (radios && radios.length > 0) {
          const targetStr = qAnswer.toString().trim().toLowerCase();
          for (const r of radios) {
            const rText = (r.closest('label')?.innerText || r.value || '').toLowerCase();
            if (rText.includes(targetStr)) {
              this.setChecked(r, true);
              modalFilled++;
              break;
            }
          }
        } else if (select) {
          if (this.setSelectValue(select, qAnswer)) modalFilled++;
        } else if (input && (!input.value || input.value.trim() === '')) {
          if (this.setInputValue(input, qAnswer)) modalFilled++;
        }
      } else {
        // Unhandled screening question
        if (select || input || (radios && radios.length > 0)) {
          unhandledQuestions++;
        }
      }
    }

    await this.delay(300);

    // If there are unhandled open questions, don't blindly click submit - flag for review
    if (unhandledQuestions > 0) {
      console.warn(`[Job Autofill - Shine] Found ${unhandledQuestions} open questions requiring human review`);
      return { filled: modalFilled, hasOpenQuestions: true };
    }

    // Click modal submit button
    const submitBtn = modal.querySelector(
      'button[type="submit"], button.btn-apply, button.btn-primary, button:not([disabled])'
    );
    if (submitBtn && (submitBtn.innerText || '').toLowerCase().match(/apply|submit|continue|save/i)) {
      console.log('[Job Autofill - Shine] Submitting screening modal...');
      submitBtn.click();
      await this.delay(400);
    }

    return { filled: modalFilled, hasOpenQuestions: false };
  }

  async fill(profile, questionnaire) {
    console.log('[Job Autofill - Shine] Starting auto-apply on Shine.com...');
    let filled = 0;
    let filledQuestionnaire = 0;

    // 1. Check if already applied
    const appliedBadges = document.querySelectorAll(
      '.applied, .already-applied, [data-testid*="applied"], button:disabled'
    );
    for (const badge of appliedBadges) {
      const badgeText = (badge.innerText || badge.textContent || '').toLowerCase();
      if (badgeText.includes('applied') || badgeText.includes('already applied')) {
        console.log('[Job Autofill - Shine] Already applied to this job.');
        return {
          adapterName: this.name,
          status: 'APPLIED',
          filled: 1,
          filledProfile: 0,
          filledQuestionnaire: 0,
          skipped: 0,
          unknown: 0,
          message: 'Already Applied'
        };
      }
    }

    if (document.body.innerText.includes('You have already applied to this job')) {
      console.log('[Job Autofill - Shine] Detected "You have already applied" notice.');
      return {
        adapterName: this.name,
        status: 'APPLIED',
        filled: 1,
        filledProfile: 0,
        filledQuestionnaire: 0,
        skipped: 0,
        unknown: 0,
        message: 'Already Applied'
      };
    }

    // 2. Check for "Apply on Company Site"
    const companySiteBtn = Array.from(document.querySelectorAll('button, a')).find(el => {
      const t = (el.innerText || el.textContent || '').toLowerCase();
      return t.includes('company site') || t.includes('apply on company website');
    });

    if (companySiteBtn) {
      console.log('[Job Autofill - Shine] Job requires external apply. Marking as SAVED.');
      return {
        adapterName: this.name,
        status: 'SAVED',
        filled: 0,
        filledProfile: 0,
        filledQuestionnaire: 0,
        skipped: 1,
        unknown: 0,
        message: 'External Company Site (Marked Saved)'
      };
    }

    // 3. Find and click primary Apply Button
    const applySelectors = [
      'button#applyJob',
      'button.btn-apply',
      'button.applyBtn',
      'button[data-testid*="apply"]',
      'button.jobDetail_applyBtn__',
      'a.apply-now',
      'button.btn-primary',
      'button'
    ];

    let applyBtn = null;

    for (const sel of applySelectors) {
      const candidates = document.querySelectorAll(sel);
      for (const btn of candidates) {
        const text = (btn.innerText || btn.textContent || '').trim().toLowerCase();
        if (text.includes('apply') && !text.includes('applied') && !text.includes('apply filter')) {
          applyBtn = btn;
          break;
        }
      }
      if (applyBtn) break;
    }

    if (!applyBtn) {
      console.warn('[Job Autofill - Shine] Could not locate Apply button on this page');
      return {
        adapterName: this.name,
        status: 'SAVED',
        filled: 0,
        filledProfile: 0,
        filledQuestionnaire: 0,
        skipped: 0,
        unknown: 1,
        message: 'Apply button not found (Saved for review)'
      };
    }

    console.log(`[Job Autofill - Shine] Clicking Apply button: "${applyBtn.innerText.trim()}"`);
    this.highlightField(applyBtn, 'success');
    applyBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
    applyBtn.focus();
    applyBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    applyBtn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    applyBtn.click();
    filled++;

    await this.delay(600);

    // 4. Check if a Screening Questions Modal opened
    const modal = document.querySelector(
      '.modal, .popup, [role="dialog"], div[class*="modal"], div[class*="dialog"], .screeningModal'
    );

    if (modal && modal.offsetParent !== null) {
      const modalRes = await this.handleScreeningModal(modal, profile, questionnaire);
      filledQuestionnaire += modalRes.filled;
      
      if (modalRes.hasOpenQuestions) {
        return {
          adapterName: this.name,
          status: 'SAVED',
          filled: filled + filledQuestionnaire,
          filledProfile: filled,
          filledQuestionnaire,
          skipped: 0,
          unknown: 1,
          message: 'Open Questions Present (Marked Saved)'
        };
      }
    }

    return {
      adapterName: this.name,
      status: 'APPLIED',
      filled: filled + filledQuestionnaire,
      filledProfile: filled,
      filledQuestionnaire,
      skipped: 0,
      unknown: 0,
      message: 'Applied Successfully'
    };
  }
}

window.ShineAdapter = ShineAdapter;
