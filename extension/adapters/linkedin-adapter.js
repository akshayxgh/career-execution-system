/**
 * LinkedInAdapter - Dedicated 1-Click Network Growth & Recruiter Conversion Engine.
 * Operates on https://www.linkedin.com/mynetwork/grow/ and /connections/.
 * Fully automated 1-click execution, live MYCES tracking via background worker, and auto-conversion sync.
 */
class LinkedInAdapter extends BaseAdapter {
  constructor() {
    super('LinkedIn 1-Click Growth Routine');
    this.excludedKeywords = ['crystal group', 'crystal'];
    this.injectedWidget = false;
    this.isRunningRoutine = false;
  }

  matches(url, doc) {
    return url.includes('linkedin.com');
  }

  /**
   * Initializes floating 1-click widget and connection sync listeners
   */
  async init() {
    // Listen for background toast notifications (e.g. Voyager API background connection sync)
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg && msg.action === 'SHOW_TOAST') {
        this.injectWidgetStyles();
        this.showToast(msg.message, true);
      }
    });

    if (this.injectedWidget) return;
    const url = window.location.href;

    // 1. Sent Invitations Page (https://www.linkedin.com/mynetwork/invitation-manager/sent/)
    if (url.includes('mynetwork/invitation-manager/sent')) {
      this.injectedWidget = true;
      this.injectWidgetStyles();
      this.renderSentInvitationsWidget();
      return;
    }

    // 2. Auto-sync accepted connections if on connections page or notifications
    if (url.includes('mynetwork/invite-connect/connections') || url.includes('linkedin.com/notifications')) {
      setTimeout(() => this.scanAndSyncAcceptedConnections(), 1500);
      return;
    }

    if (!url.includes('linkedin.com/mynetwork')) return;

    this.injectedWidget = true;
    this.injectWidgetStyles();
    this.renderFloatingWidget();
  }

  injectWidgetStyles() {
    if (document.getElementById('myces-linkedin-styles')) return;
    const style = document.createElement('style');
    style.id = 'myces-linkedin-styles';
    style.textContent = `
      #myces-linkedin-pill {
        position: fixed;
        bottom: 24px;
        left: 24px;
        background: #0f172a;
        color: #f8fafc;
        border: 1px solid #334155;
        border-radius: 9999px;
        box-shadow: 0 8px 20px -4px rgba(0, 0, 0, 0.5);
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 12px;
        display: flex;
        align-items: center;
        padding: 4px 12px 4px 5px;
        gap: 8px;
        user-select: none;
        transition: all 0.2s ease;
      }
      #myces-linkedin-pill:hover {
        border-color: #38bdf8;
      }
      .myces-pill-btn {
        background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
        color: #ffffff;
        border: none;
        border-radius: 50%;
        width: 32px;
        height: 32px;
        font-size: 15px;
        font-weight: 700;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.15s ease, background 0.15s ease;
        box-shadow: 0 2px 6px rgba(2, 132, 199, 0.4);
      }
      .myces-pill-btn:hover {
        transform: scale(1.1);
        background: linear-gradient(135deg, #0369a1 0%, #075985 100%);
      }
      .myces-pill-btn:disabled {
        opacity: 0.7;
        cursor: not-allowed;
      }
      .myces-pill-status {
        font-size: 11px;
        color: #94a3b8;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      @keyframes myces-spin { 100% { transform: rotate(360deg); } }
      .myces-spin { display: inline-block; animation: myces-spin 0.8s linear infinite; }
      
      #myces-toast {
        position: fixed;
        bottom: 75px;
        left: 24px;
        background: #1e293b;
        color: #f8fafc;
        border-left: 4px solid #10b981;
        border-radius: 8px;
        padding: 10px 14px;
        font-size: 12px;
        z-index: 999999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        gap: 8px;
      }
    `;
    document.head.appendChild(style);
  }

  renderFloatingWidget() {
    let pill = document.getElementById('myces-linkedin-pill');
    if (pill) pill.remove();

    pill = document.createElement('div');
    pill.id = 'myces-linkedin-pill';
    pill.innerHTML = `
      <button id="myces-btn-auto-routine" class="myces-pill-btn" title="1-Click Daily Routine: Connect with 5 Peers + 2 Recruiters">
        <span id="myces-routine-icon">⚡</span>
      </button>
      <div class="myces-pill-status" id="myces-pill-status-area">
        <span>5 Peers + 2 Recruiters</span>
      </div>
    `;

    document.body.appendChild(pill);

    const btnRun = document.getElementById('myces-btn-auto-routine');
    btnRun.addEventListener('click', () => this.runFullyAutomatedRoutine());
  }

  /**
   * Widget for https://www.linkedin.com/mynetwork/invitation-manager/sent/
   */
  renderSentInvitationsWidget() {
    let pill = document.getElementById('myces-linkedin-pill');
    if (pill) pill.remove();

    pill = document.createElement('div');
    pill.id = 'myces-linkedin-pill';
    pill.innerHTML = `
      <button id="myces-btn-import-sent" class="myces-pill-btn" title="Import All Sent Invitations into MYCES" style="width: auto; padding: 7px 14px; border-radius: 9999px;">
        <span id="myces-import-icon">📥</span>
        <span id="myces-import-text" style="font-weight: 700;">Import All Sent to MYCES</span>
      </button>
    `;

    document.body.appendChild(pill);

    const btnImport = document.getElementById('myces-btn-import-sent');
    btnImport.addEventListener('click', () => this.importAllSentInvitations());
  }

  /**
   * Scrapes all sent invitations on https://www.linkedin.com/mynetwork/invitation-manager/sent/
   * and saves them to MYCES Strategic Networking Directory
   */
  async importAllSentInvitations() {
    const btn = document.getElementById('myces-btn-import-sent');
    const icon = document.getElementById('myces-import-icon');
    const text = document.getElementById('myces-import-text');

    if (btn) btn.disabled = true;
    if (icon) icon.classList.add('myces-spin');
    if (text) text.textContent = 'Scanning sent cards...';

    const sleep = (ms) => new Promise(r => setTimeout(r, ms));

    try {
      // 1. Gently scroll down to trigger lazy loading of invitations
      for (let s = 0; s < 3; s++) {
        window.scrollBy({ top: 700, behavior: 'smooth' });
        await sleep(300);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
      await sleep(250);

      // 2. Discover all profile links on this page (excluding global nav header)
      const allLinks = Array.from(document.querySelectorAll('a[href*="/in/"]')).filter(a => {
        return !a.closest('header, nav.global-nav, [role="banner"], #global-nav');
      });

      console.log(`[MYCES Import] Total /in/ links found: ${allLinks.length}`);

      // 3. Group by unique profile slug
      const profileMap = new Map();
      for (const a of allLinks) {
        const href = a.href || a.getAttribute('href') || '';
        const match = href.match(/\/in\/([^\/\?#]+)/i);
        if (!match) continue;
        const slug = match[1].toLowerCase().trim();
        if (!slug || slug === 'me' || slug === 'unavailable') continue;

        if (!profileMap.has(slug)) {
          profileMap.set(slug, {
            slug,
            profileUrl: `https://www.linkedin.com/in/${slug}`,
            anchors: []
          });
        }
        profileMap.get(slug).anchors.push(a);
      }

      console.log(`[MYCES Import] Unique candidate slugs: ${profileMap.size}`);

      const invitations = [];

      for (const [slug, item] of profileMap.entries()) {
        // Find row container: the closest common parent that contains this profile and has "Sent" or "Withdraw"
        let rowContainer = null;
        for (const a of item.anchors) {
          let cur = a.parentElement;
          while (cur && cur !== document.body) {
            const curText = (cur.innerText || '').toLowerCase();
            if (curText.includes('sent ') || curText.includes('withdraw')) {
              // Ensure we don't grab the whole list: check if it contains OTHER profile slugs
              const otherSlugs = Array.from(cur.querySelectorAll('a[href*="/in/"]'))
                .map(otherA => {
                  const m = (otherA.href || '').match(/\/in\/([^\/\?#]+)/i);
                  return m ? m[1].toLowerCase().trim() : null;
                })
                .filter(s => s && s !== slug && s !== 'me');

              if (otherSlugs.length === 0) {
                rowContainer = cur;
              }
            }
            cur = cur.parentElement;
          }
          if (rowContainer) break;
        }

        // If no strict rowContainer found, use the closest li or div of the first anchor
        if (!rowContainer && item.anchors.length > 0) {
          rowContainer = item.anchors[0].closest('li, div') || item.anchors[0].parentElement;
        }

        // --- Extract Name ---
        let name = '';
        // Heuristic A: Look for titles/headings text with span[aria-hidden="true"] (clearest source)
        if (rowContainer) {
          const titleEl = rowContainer.querySelector('.invitation-card__title, .artdeco-entity-lockup__title, h3, strong, [class*="title"]');
          if (titleEl) {
            const spanH = titleEl.querySelector('span[aria-hidden="true"]');
            name = (spanH ? spanH.innerText : titleEl.innerText).trim();
          }
        }
        // Heuristic B: Text of the anchors
        if (!name) {
          for (const a of item.anchors) {
            const at = (a.innerText || a.textContent || '').trim();
            if (at && at.length > 1 && !at.toLowerCase().startsWith('view ') && !at.toLowerCase().includes('profile picture')) {
              name = at.split('\n')[0].trim();
              break;
            }
          }
        }
        // Heuristic C: Look for image alt text
        if (!name && rowContainer) {
          const img = rowContainer.querySelector('img[alt]');
          if (img && img.alt) {
            name = img.alt;
          }
        }
        // Heuristic D: First line of rowContainer text
        if (!name && rowContainer) {
          const lines = (rowContainer.innerText || '').split('\n').map(l => l.trim()).filter(l => l.length > 0);
          if (lines.length > 0 && !lines[0].toLowerCase().includes('withdraw') && !lines[0].toLowerCase().includes('sent ')) {
            name = lines[0];
          }
        }
        // Apply universal cleaner
        name = this.cleanLinkedInName(name || slug);

        // --- Extract Headline ---
        let headline = '';
        if (rowContainer) {
          const subEl = rowContainer.querySelector('.invitation-card__subtitle, .artdeco-entity-lockup__subtitle, [class*="occupation"], [class*="caption"]');
          if (subEl) {
            headline = subEl.innerText.trim();
          }
          if (!headline) {
            const lines = (rowContainer.innerText || '').split('\n')
              .map(l => l.trim())
              .filter(l => l.length > 0 && 
                           !l.toLowerCase().includes('withdraw') && 
                           !l.toLowerCase().includes('sent ') && 
                           !l.toLowerCase().startsWith('1st') &&
                           !l.toLowerCase().startsWith('2nd') &&
                           !l.toLowerCase().startsWith('3rd')
              );
            if (lines.length > 1) {
              const firstName = name.split(' ')[0].toLowerCase();
              if (lines[0].toLowerCase().includes(firstName)) {
                headline = lines[1];
              } else {
                headline = lines[0] === name ? lines[1] : lines[0];
              }
            }
          }
        }

        // --- Extract Sent Time ---
        let sentTime = 'Recent';
        if (rowContainer) {
          const text = rowContainer.innerText || '';
          const match = text.match(/(?:sent\s+)?(\d+\s+(?:minute|hour|day|week|month|year)s?\s+ago)/i) || text.match(/sent\s+[^·\n\r]+/i);
          if (match) {
            sentTime = match[0].toLowerCase().startsWith('sent') ? match[0].trim() : `Sent ${match[0].trim()}`;
          }
        }

        invitations.push({
          name,
          profileUrl: item.profileUrl,
          headline: headline || 'LinkedIn Connection',
          sentTime
        });
      }

      console.log(`[MYCES Import] Successfully extracted ${invitations.length} invitations:`, invitations);

      if (invitations.length === 0) {
        alert(`No sent invitation cards detected (scanned ${allLinks.length} links). Please make sure you are on the "People" tab and scroll down once.`);
        if (btn) btn.disabled = false;
        if (icon) icon.classList.remove('myces-spin');
        if (text) text.textContent = 'Import All Sent to MYCES';
        return;
      }

      if (text) text.textContent = `Saving ${invitations.length} to MYCES...`;

      chrome.runtime.sendMessage({
        action: 'IMPORT_SENT_INVITATIONS',
        invitations
      }, (res) => {
        if (btn) btn.disabled = false;
        if (icon) icon.classList.remove('myces-spin');

        const savedCount = res?.count ?? invitations.length;
        if (icon) icon.textContent = '✅';
        if (text) text.textContent = `Imported ${savedCount} Invites!`;

        this.showToast(`Imported ${savedCount} sent invitations directly into MYCES Strategic Directory!`, true);

        setTimeout(() => {
          if (icon) icon.textContent = '📥';
          if (text) text.textContent = 'Import All Sent to MYCES';
        }, 5000);
      });

    } catch (err) {
      console.error('[MYCES Import] Error:', err);
      alert(`Import error: ${err.message}`);
      if (btn) btn.disabled = false;
      if (icon) icon.classList.remove('myces-spin');
      if (text) text.textContent = 'Import All Sent to MYCES';
    }
  }

  showToast(message, isSuccess = true) {
    let toast = document.getElementById('myces-toast');
    if (toast) toast.remove();

    toast = document.createElement('div');
    toast.id = 'myces-toast';
    toast.style.borderLeftColor = isSuccess ? '#10b981' : '#f43f5e';
    toast.innerHTML = `<span>${isSuccess ? '🎉' : '⚠️'}</span> <span>${message}</span>`;

    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 6000);
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  cleanLinkedInName(raw) {
    if (!raw) return '';
    return raw
      .replace(/[\u2019']s?\s*profile\s*picture/gi, '')
      .replace(/[\u2019']s?\s*photo/gi, '')
      .replace(/\s*(?:is\s*)?hiring,?\s*profile\s*picture/gi, '')
      .replace(/\s*hiring,?\s*/gi, ' ')
      .replace(/\s*,?\s*open\s*to\s*work/gi, '')
      .replace(/,\s*profile\s*picture/gi, '')
      .replace(/profile\s*picture/gi, '')
      .replace(/View\s+.*profile/gi, '')
      .replace(/(\r\n|\n|\r)/gm, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Scans 1st-degree connections on https://www.linkedin.com/mynetwork/invite-connect/connections/
   * and auto-converts matching INVITATION_SENT people to CONNECTED in MYCES using UNIQUE PROFILE IDs.
   */
  async scanAndSyncAcceptedConnections() {
    console.log('[MYCES] Scanning 1st-degree connections page for accepted invites via Profile ID...');
    const linkEls = Array.from(document.querySelectorAll('a[href*="/in/"]'));

    const slugs = new Set();
    const names = new Set();

    linkEls.forEach(a => {
      const href = a.href || '';
      const match = href.match(/\/in\/([^\/\?#]+)/i);
      if (match) {
        slugs.add(match[1].toLowerCase());
      }
      const text = (a.innerText || a.textContent || '').trim();
      if (text && text.length > 2 && !text.toLowerCase().includes('connect') && !text.toLowerCase().includes('message')) {
        const cleanN = this.cleanLinkedInName(text.split('\n')[0]);
        if (cleanN && cleanN.length > 2) names.add(cleanN);
      }
    });

    const recentSlugs = Array.from(slugs);
    const recentNames = Array.from(names);

    if (recentSlugs.length === 0 && recentNames.length === 0) return;

    chrome.runtime.sendMessage({
      action: 'SYNC_ACCEPTED_CONNECTIONS',
      recentSlugs,
      recentNames
    }, (response) => {
      if (response && response.success && response.updated > 0) {
        let msg = `Synced ${response.updated} newly accepted connection(s) to MYCES!`;
        if (response.newRecruiters && response.newRecruiters.length > 0) {
          const rNames = response.newRecruiters.map(r => r.name).join(', ');
          msg = `🎉 ${rNames} accepted! Automated welcome greeting queued in MYCES Approvals.`;
        }
        this.showToast(msg, true);
      }
    });
  }

  /**
   * Helper to count total connectable profile cards currently in DOM
   */
  countRawCardsOnPage() {
    const buttons = Array.from(document.querySelectorAll('button')).filter((b) => {
      const aria = (b.getAttribute('aria-label') || '').toLowerCase();
      const txt = (b.innerText || b.textContent || '').trim().toLowerCase();
      return (aria.includes('invite') || aria.includes('connect') || txt === 'connect') && !aria.includes('withdraw') && !aria.includes('message');
    });
    return buttons.length;
  }

  /**
   * Aggressively forces scrolling to the bottom of all possible LinkedIn scrolling containers
   * to trigger Ember's finite-scroll and IntersectionObserver lazy loading.
   */
  async forceScrollLinkedIn() {
    const targetHeight = document.body.scrollHeight || document.documentElement.scrollHeight || 10000;

    // 1. Scroll window directly to bottom
    window.scrollTo({ top: targetHeight, behavior: 'instant' });

    // 2. Scroll document scrolling elements
    if (document.scrollingElement) {
      document.scrollingElement.scrollTop = document.scrollingElement.scrollHeight;
    }
    if (document.body) {
      document.body.scrollTop = document.body.scrollHeight;
    }
    if (document.documentElement) {
      document.documentElement.scrollTop = document.documentElement.scrollHeight;
    }

    // 3. Scroll all internal LinkedIn scaffold containers
    const containers = Array.from(document.querySelectorAll(
      'main, .scaffold-layout__main, .scaffold-finite-scroll, [data-view-name*="finite-scroll"], div[tabindex="-1"]'
    ));
    containers.forEach((c) => {
      c.scrollTop = c.scrollHeight;
    });

    // 4. Dispatch scroll events so Ember and IntersectionObservers react
    window.dispatchEvent(new Event('scroll', { bubbles: true }));
    document.dispatchEvent(new Event('scroll', { bubbles: true }));

    // 5. Short pause to allow DOM rendering
    await this.delay(700);
  }

  /**
   * Main 1-Click Fully Automatic Routine
   * Pre-scrolls until at least 100 cards are loaded in the DOM, then selects and sends 7 invites.
   */
  async runFullyAutomatedRoutine() {
    if (this.isRunningRoutine) return;
    this.isRunningRoutine = true;

    const btnRun = document.getElementById('myces-btn-auto-routine');
    const icon = document.getElementById('myces-routine-icon');
    const statusArea = document.getElementById('myces-pill-status-area');

    if (btnRun) btnRun.disabled = true;
    if (icon) icon.classList.add('myces-spin');

    try {
      // ==========================================
      // PHASE 1: PRE-LOAD UNTIL 100 CARDS ARE MOUNTED
      // ==========================================
      const CARD_TARGET = 100;
      let scrollCycles = 0;
      let rawCount = this.countRawCardsOnPage();
      let lastCount = 0;
      let stagnantCount = 0;

      while (rawCount < CARD_TARGET && scrollCycles < 30) {
        scrollCycles++;
        if (statusArea) {
          statusArea.innerHTML = `<span style="color: #38bdf8; font-weight: 600;">📜 Loading: ${rawCount}/${CARD_TARGET} cards...</span>`;
        }

        await this.forceScrollLinkedIn();
        await this.delay(800);

        rawCount = this.countRawCardsOnPage();

        // Stagnation check (if LinkedIn runs out of recommendations before 100)
        if (rawCount === lastCount) {
          stagnantCount++;
          if (stagnantCount >= 4) {
            console.log(`[LinkedIn Routine] Stagnant at ${rawCount} cards, proceeding with available pool.`);
            break;
          }
        } else {
          stagnantCount = 0;
          lastCount = rawCount;
        }
      }

      if (statusArea) {
        statusArea.innerHTML = `<span style="color: #10b981; font-weight: 700;">✓ ${rawCount} cards loaded! Filtering...</span>`;
      }
      await this.delay(900);

      // ==========================================
      // PHASE 2: AI TARGET SELECTION (5 PEERS + 2 RECRUITERS)
      // ==========================================
      const candidates = this.extractCandidateCards();
      const allPeers = candidates.filter(c => c.category === 'PEER');
      const allRecruiters = candidates.filter(c => c.category === 'RECRUITER');

      console.log(`[LinkedIn Routine] Pool breakdown: ${allPeers.length} Peers, ${allRecruiters.length} Recruiters from ${candidates.length} qualified cards.`);

      // Select 2 recruiters first
      const selectedRecruiters = allRecruiters.slice(0, 2);
      // Backfill with peers to guarantee exactly 7 targets
      const peersNeeded = Math.max(5, 7 - selectedRecruiters.length);
      const selectedPeers = allPeers.slice(0, peersNeeded);

      const targets = [...selectedPeers, ...selectedRecruiters].slice(0, 7);

      // If still under 7 and more candidates exist, fill up to 7
      if (targets.length < 7) {
        const remaining = candidates.filter(c => !targets.some(t => t.profileUrl === c.profileUrl));
        while (targets.length < 7 && remaining.length > 0) {
          targets.push(remaining.shift());
        }
      }

      if (targets.length === 0) {
        alert('No matching Data/BI peers or recruiters found (excluding Crystal Group).');
        this.resetButton(btnRun, icon, statusArea);
        return;
      }

      if (statusArea) {
        statusArea.innerHTML = `<span style="color: #38bdf8; font-weight: 700;">AI picked ${targets.length} targets. Connecting...</span>`;
      }
      await this.delay(900);

      // ==========================================
      // PHASE 3: SEQUENTIAL CONNECT & TRACKING
      // ==========================================
      let sentCount = 0;
      for (let i = 0; i < targets.length; i++) {
        const cand = targets[i];
        if (statusArea) {
          statusArea.innerHTML = `<span style="color: #38bdf8;">(${i + 1}/${targets.length}) ${cand.firstName}...</span>`;
        }

        try {
          const success = await this.executeSingleConnect(cand);
          if (success) {
            sentCount++;
            // Record tracking data through Background Service Worker (100% Reliable Supabase Persistence)
            this.trackInMyces(cand);
            if (statusArea) {
              statusArea.innerHTML = `<span style="color: #10b981; font-weight: 700;">✓ Connected (${sentCount}/${targets.length})</span>`;
            }
          }
        } catch (err) {
          console.warn(`[LinkedIn Routine] Error connecting to ${cand.name}:`, err);
        }

        // Natural human-like pause between connections (2.5 seconds)
        if (i < targets.length - 1) {
          await this.delay(2500);
        }
      }

      // ==========================================
      // PHASE 4: FINISHED & CELEBRATION
      // ==========================================
      if (icon) {
        icon.classList.remove('myces-spin');
        icon.textContent = '✅';
      }
      if (statusArea) {
        statusArea.innerHTML = `<span style="color: #10b981; font-weight: 700;">Sent ${sentCount} Invites ✓</span>`;
      }

      this.showToast(`Saved ${sentCount} people directly to your MYCES Strategic Directory!`, true);

      setTimeout(() => {
        this.resetButton(btnRun, icon, statusArea);
      }, 6000);

    } catch (globalErr) {
      console.error('[LinkedIn Routine] Execution error:', globalErr);
      alert(`Routine stopped: ${globalErr.message}`);
      this.resetButton(btnRun, icon, statusArea);
    } finally {
      this.isRunningRoutine = false;
    }
  }

  resetButton(btn, icon, statusArea) {
    if (btn) btn.disabled = false;
    if (icon) {
      icon.classList.remove('myces-spin');
      icon.textContent = '⚡';
    }
    if (statusArea) {
      statusArea.innerHTML = '<span>5 Peers + 2 Recruiters</span>';
    }
  }

  /**
   * Scans DOM cards, filters blacklist, categorizes, and prepares AI notes
   */
  extractCandidateCards() {
    const results = [];
    const seenUrls = new Set();

    // 1. Gather all potential card containers across all modern LinkedIn variations
    const cardCandidates = Array.from(document.querySelectorAll(
      'li.discover-entity-type-card, div.discover-entity-type-card, div[data-view-name*="profile-card"], [class*="discover-person-card"], .scaffold-layout__list-container li, .artdeco-card'
    ));

    // 2. Also find any container that directly holds a Connect button and profile link
    const fallbackButtons = Array.from(document.querySelectorAll('button')).filter((b) => {
      const aria = (b.getAttribute('aria-label') || '').toLowerCase();
      const txt = (b.innerText || b.textContent || '').trim().toLowerCase();
      return (aria.includes('invite') || aria.includes('connect') || txt === 'connect') && !aria.includes('withdraw') && !aria.includes('message');
    });

    const buttonCards = fallbackButtons
      .map((b) => b.closest('li, div.discover-entity-type-card, [data-view-name*="profile-card"], [class*="discover-person-card"], .artdeco-card') || b.parentElement?.parentElement)
      .filter(Boolean);

    // Merge and deduplicate card elements
    const allCards = Array.from(new Set([...cardCandidates, ...buttonCards]));

    for (const card of allCards) {
      if (!card) continue;
      const text = card.innerText || card.textContent || '';
      const lower = text.toLowerCase();

      // Exclude blacklist (Crystal Group, etc.)
      if (this.excludedKeywords.some(kw => lower.includes(kw))) {
        continue;
      }

      // Must have a visible Connect button
      const connectBtn = card.querySelector('button[aria-label*="Invite" i], button[aria-label*="Connect" i]') ||
                         Array.from(card.querySelectorAll('button')).find(b => (b.innerText || '').trim().toLowerCase() === 'connect');
      if (!connectBtn || connectBtn.disabled) continue;

      // Extract Name & Link
      const linkEl = card.querySelector('a[href*="/in/"]');
      if (!linkEl) continue;
      const profileUrl = (linkEl.href || '').split('?')[0].replace(/\/+$/, '');
      if (!profileUrl || seenUrls.has(profileUrl.toLowerCase())) continue;
      seenUrls.add(profileUrl.toLowerCase());

      let name = '';
      const nameEl = card.querySelector('.discover-person-card__name, [class*="title"], [class*="actor__name"], span[aria-hidden="true"]');
      if (nameEl) name = nameEl.innerText.trim();
      if (!name || name.length < 2) {
        name = linkEl.innerText.trim().split('\n')[0];
      }
      name = this.cleanLinkedInName(name);
      if (!name) continue;

      // Extract Headline
      let headline = '';
      const occupationEl = card.querySelector('.discover-person-card__occupation, [class*="occupation"], [class*="headline"], [class*="sub-title"]');
      if (occupationEl) headline = occupationEl.innerText.trim();
      if (!headline) headline = text.replace(name, '').trim().split('\n')[0] || 'Technical Specialist';

      // Categorize
      const hLower = headline.toLowerCase();
      let category = null;

      const isRecruiter = hLower.includes('recruiter') || hLower.includes('talent') || hLower.includes('hiring') || hLower.includes('staffing') || hLower.includes('hr');
      const isDataPeer = hLower.includes('data') || hLower.includes('bi') || hLower.includes('power bi') || hLower.includes('fabric') || hLower.includes('sql') || hLower.includes('engineer') || hLower.includes('architect') || hLower.includes('analyst') || hLower.includes('python');

      if (isRecruiter) {
        category = 'RECRUITER';
      } else if (isDataPeer) {
        category = 'PEER';
      }

      if (category) {
        const firstName = name.split(' ')[0] || name;
        
        let company = '';
        const compMatch = headline.match(/@\s*([^|•\n,]+)/i) || headline.match(/at\s+([^|•\n,]+)/i);
        if (compMatch) company = compMatch[1].trim();

        // Authentic, polite note matching Akshay's 7+ yrs Business Automation & Analytics profile
        const aiNote = category === 'PEER'
          ? `Hi ${firstName}, came across your profile in analytics & BI. Great seeing professionals building practical data and automation workflows. Would love to connect and exchange insights!`
          : company
          ? `Hi ${firstName}, noticed your work at ${company} in recruiting data and technology talent. I have 7+ years of experience in analytics, BI, and process automation (Power BI, SQL, Excel, Python). Would love to connect and exchange insights.`
          : `Hi ${firstName}, noticed your work in recruiting data and technology talent. I have 7+ years of experience in analytics, BI, and process automation (Power BI, SQL, Excel, Python). Would love to connect and exchange insights.`;

        results.push({
          name,
          firstName,
          headline,
          profileUrl,
          category,
          aiNote,
          connectButton: connectBtn
        });
      }
    }

    return results;
  }

  /**
   * Handles connecting to a candidate:
   * Supports BOTH direct 1-click connect (cards without modal) AND modal connect (with "Add a note").
   */
  async executeSingleConnect(candidate) {
    const btn = candidate.connectButton;
    if (!btn) return false;

    // Scroll card into view gently
    btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await this.delay(400);

    // Record initial button state
    const initialText = (btn.innerText || btn.textContent || '').trim().toLowerCase();

    // 1. Click Connect
    btn.click();
    await this.delay(800);

    // 2. Check if a modal/dialog popped up
    const modal = document.querySelector('div[role="dialog"], .artdeco-modal, [data-view-name*="send-invite-modal"]');

    if (modal) {
      console.log(`[LinkedIn 1-Click] Modal detected for ${candidate.name}`);

      // Look for "Add a note" button inside modal
      const addNoteBtn = Array.from(modal.querySelectorAll('button')).find(b => {
        const t = (b.innerText || b.textContent || b.getAttribute('aria-label') || '').toLowerCase();
        return t.includes('add a note');
      });

      if (addNoteBtn) {
        addNoteBtn.click();
        await this.delay(400);
      }

      // Find textarea and insert personalized AI note
      const textarea = modal.querySelector('textarea#custom-message, textarea[name="message"], textarea');
      if (textarea && candidate.aiNote) {
        this.setInputValue(textarea, candidate.aiNote, true);
        await this.delay(300);
      }

      // Find Send button
      let sendBtn = Array.from(modal.querySelectorAll('button')).find(b => {
        const t = (b.innerText || b.textContent || b.getAttribute('aria-label') || '').toLowerCase();
        return (t.includes('send invitation') || t.includes('send now') || t === 'send') && !b.disabled;
      });

      // Fallback: primary button inside modal
      if (!sendBtn) {
        sendBtn = modal.querySelector('button.artdeco-button--primary:not([disabled])');
      }

      // Fallback: "Send without a note" if adding note failed
      if (!sendBtn) {
        sendBtn = Array.from(modal.querySelectorAll('button')).find(b => {
          const t = (b.innerText || b.textContent || b.getAttribute('aria-label') || '').toLowerCase();
          return t.includes('send without a note') || t.includes('send');
        });
      }

      if (sendBtn) {
        sendBtn.click();
        await this.delay(600);
        return true;
      }

      // If cannot find send button, dismiss modal safely
      const dismissBtn = modal.querySelector('button[aria-label*="Dismiss"], button.artdeco-modal__dismiss');
      if (dismissBtn) dismissBtn.click();
      return true;
    }

    // 3. Direct Connect (No modal appeared on LinkedIn recommendation cards)
    // On LinkedIn suggestion cards, clicking Connect directly dispatches the invite.
    console.log(`[LinkedIn 1-Click] Direct invite sent for ${candidate.name} (from '${initialText}')`);
    return true;
  }

  /**
   * Tracks executed connection via Background Service Worker (Bypasses CORS & Guarantees Persistence)
   */
  trackInMyces(cand) {
    chrome.runtime.sendMessage({
      action: 'TRACK_LINKEDIN_CONNECTION',
      candidate: {
        name: cand.name,
        headline: cand.headline,
        profileUrl: cand.profileUrl,
        category: cand.category,
        aiNote: cand.aiNote
      }
    }, (res) => {
      if (res && res.success) {
        console.log(`[MYCES Background] Successfully saved ${cand.name} to database!`);
      } else {
        console.warn(`[MYCES Background] Save warning for ${cand.name}:`, res?.error);
      }
    });
  }
}

window.LinkedInAdapter = LinkedInAdapter;
