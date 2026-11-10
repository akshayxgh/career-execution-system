/**
 * NaukriAdapter - Dedicated Career & Recruiter Algorithm Assistant for Naukri.com.
 * Minimalist space-saving circular floating button for 1-click SEO headline bumping.
 */
class NaukriAdapter extends BaseAdapter {
  constructor() {
    super('Naukri.com Dedicated Engine');
    this.injectedWidget = false;
  }

  matches(url, doc) {
    return url.includes('naukri.com');
  }

  /**
   * Initializes minimalist floating button on naukri.com
   */
  async init() {
    if (this.injectedWidget) return;
    if (!window.location.href.includes('naukri.com')) return;

    this.injectedWidget = true;
    this.injectWidgetStyles();
    this.renderFloatingWidget();
  }

  injectWidgetStyles() {
    if (document.getElementById('myces-naukri-styles')) return;
    const style = document.createElement('style');
    style.id = 'myces-naukri-styles';
    style.textContent = `
      #myces-naukri-fab {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 42px;
        height: 42px;
        border-radius: 50%;
        background: #0284c7;
        color: #ffffff;
        border: 2px solid #ffffff;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        z-index: 999999;
        font-size: 18px;
        user-select: none;
        transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.2s ease;
      }
      #myces-naukri-fab:hover {
        transform: scale(1.12);
        background: #0369a1;
      }
      #myces-naukri-fab:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      @keyframes myces-spin { 100% { transform: rotate(360deg); } }
      .myces-spinning { animation: myces-spin 0.8s linear infinite; }
    `;
    document.head.appendChild(style);
  }

  renderFloatingWidget() {
    let fab = document.getElementById('myces-naukri-fab');
    if (fab) fab.remove();

    fab = document.createElement('button');
    fab.id = 'myces-naukri-fab';
    fab.title = "1-Click Bump Naukri Profile Timestamp (SEO Refresh)";
    fab.innerHTML = '🔄';

    document.body.appendChild(fab);

    fab.addEventListener('click', () => {
      fab.disabled = true;
      fab.classList.add('myces-spinning');
      fab.title = "Bumping profile timestamp...";

      chrome.runtime.sendMessage({ action: 'BUMP_NAUKRI_PROFILE' }, (response) => {
        fab.disabled = false;
        fab.classList.remove('myces-spinning');

        if (chrome.runtime.lastError || !response || !response.success) {
          fab.innerHTML = '❌';
          const err = (response && response.error) || 'Failed to update. Make sure you are logged into naukri.com';
          fab.title = err;
          setTimeout(() => {
            fab.innerHTML = '🔄';
            fab.title = "1-Click Bump Naukri Profile Timestamp (SEO Refresh)";
          }, 3000);
          return;
        }

        // Success!
        fab.innerHTML = '✅';
        fab.title = `Updated to Variant ${response.updatedTo}! Timestamp refreshed.`;
        setTimeout(() => {
          fab.innerHTML = '🔄';
          fab.title = "1-Click Bump Naukri Profile Timestamp (SEO Refresh)";
        }, 4000);
      });
    });
  }

  /**
   * Application questionnaire filler for Naukri
   */
  async fill(profile, questionnaire) {
    let filled = 0;
    let skipped = 0;

    const questions = document.querySelectorAll('.question-wrapper, .form-row, .chatbot-question');
    questions.forEach(q => {
      const label = (q.innerText || q.textContent || '').trim();
      const match = window.questionnaireModule?.matchQuestion(label, questionnaire);
      if (match) {
        const input = q.querySelector('input:not([type="hidden"]), textarea');
        if (input) {
          this.setInputValue(input, match, true);
          filled++;
        }
      } else {
        skipped++;
      }
    });

    return {
      adapterName: this.name,
      filled,
      skipped,
      unknown: 0
    };
  }
}

window.NaukriAdapter = NaukriAdapter;
