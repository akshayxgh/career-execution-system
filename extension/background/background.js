// background.js - Background Service Worker for MyCES Job Autofill & Naukri Checker

let isCheckingActive = false;
let shouldCancelCheck = false;
let backgroundTabId = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "CHECK_NAUKRI_JOBS") {
    if (isCheckingActive) {
      sendResponse({ started: false, message: "A check is already in progress." });
      return false;
    }

    const senderTabId = sender.tab ? sender.tab.id : null;
    const jobs = request.jobs || [];

    if (!jobs.length) {
      sendResponse({ started: false, message: "No jobs provided to check." });
      return false;
    }

    sendResponse({ started: true, total: jobs.length });

    // Run async checking loop
    runNaukriCheckLoop(jobs, senderTabId);
    return true;
  }

  if (request.action === "CANCEL_NAUKRI_CHECK") {
    shouldCancelCheck = true;
    if (backgroundTabId) {
      try {
        chrome.tabs.remove(backgroundTabId);
      } catch (e) {}
      backgroundTabId = null;
    }
    isCheckingActive = false;
    sendResponse({ cancelled: true });
    return false;
  }

  if (request.action === "GET_NAUKRI_CHECK_STATUS") {
    sendResponse({ isCheckingActive });
    return false;
  }

  if (request.action === "BUMP_NAUKRI_PROFILE") {
    handleNaukriHeadlineBump()
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // Keep message channel open for async response
  }
});

// Helper: wait for tab to complete loading
function waitForTabLoad(tabId, timeoutMs = 20000) {
  return new Promise((resolve) => {
    let resolved = false;
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        chrome.tabs.onUpdated.removeListener(listener);
        resolve(false);
      }
    }, timeoutMs);

    function listener(updatedTabId, changeInfo) {
      if (updatedTabId === tabId && changeInfo.status === "complete") {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          chrome.tabs.onUpdated.removeListener(listener);
          resolve(true);
        }
      }
    }

    chrome.tabs.onUpdated.addListener(listener);
  });
}

// Helper: sleep
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Main checking loop
async function runNaukriCheckLoop(jobs, senderTabId) {
  isCheckingActive = true;
  shouldCancelCheck = false;

  let appliedCount = 0;
  let expiredCount = 0;
  let untouchedCount = 0;
  let errorCount = 0;

  try {
    // 1. Create one background tab
    const tab = await chrome.tabs.create({ url: "about:blank", active: false });
    backgroundTabId = tab.id;

    for (let i = 0; i < jobs.length; i++) {
      if (shouldCancelCheck) {
        break;
      }

      const job = jobs[i];
      const jobUrl = job.url;

      try {
        // Navigate tab to job URL
        await chrome.tabs.update(backgroundTabId, { url: jobUrl });

        // Wait for page load
        await waitForTabLoad(backgroundTabId, 25000);

        // Dynamic client hydration wait (extra for LinkedIn and heavy SPAs)
        const isLinkedIn = (jobUrl || "").toLowerCase().includes("linkedin.com");
        await delay(isLinkedIn ? 2600 : 1800);

        if (shouldCancelCheck) break;

        // Inspect the DOM of the job page
        const results = await chrome.scripting.executeScript({
          target: { tabId: backgroundTabId },
          func: inspectJobStatusPage,
        });

        const inspection = (results && results[0] && results[0].result) || {
          isApplied: false,
          isCareerPage: false,
          isExpired: false,
          status: "NOT_APPLIED",
        };

        const status = inspection.status;
        if (status === "APPLIED") {
          appliedCount++;
        } else if (status === "EXPIRED") {
          expiredCount++;
        } else {
          untouchedCount++;
        }

        // Send progress message back to the active MyCES web page
        if (senderTabId) {
          chrome.tabs.sendMessage(senderTabId, {
            action: "MYCES_JOB_PROGRESS",
            jobId: job.id,
            title: job.title,
            company: job.company_name,
            url: jobUrl,
            status: status,
            current: i + 1,
            total: jobs.length,
            appliedCount,
            expiredCount,
            untouchedCount,
          }).catch(() => {});
        }

      } catch (err) {
        console.warn(`[MyCES Background] Error inspecting job ${job.id}:`, err);
        errorCount++;

        if (senderTabId) {
          chrome.tabs.sendMessage(senderTabId, {
            action: "MYCES_JOB_PROGRESS",
            jobId: job.id,
            title: job.title,
            company: job.company_name,
            url: jobUrl,
            status: "ERROR",
            current: i + 1,
            total: jobs.length,
            appliedCount,
            expiredCount,
            untouchedCount,
          }).catch(() => {});
        }
      }

      // Small polite delay between requests
      await delay(1200);
    }
  } catch (loopErr) {
    console.error("[MyCES Background] Critical loop error:", loopErr);
  } finally {
    // Clean up background tab
    if (backgroundTabId) {
      try {
        await chrome.tabs.remove(backgroundTabId);
      } catch (e) {}
      backgroundTabId = null;
    }

    isCheckingActive = false;

    // Send completed notification
    if (senderTabId) {
      chrome.tabs.sendMessage(senderTabId, {
        action: "MYCES_CHECK_COMPLETED",
        summary: {
          total: jobs.length,
          appliedCount,
          expiredCount,
          untouchedCount,
          errorCount,
          wasCancelled: shouldCancelCheck,
        },
      }).catch(() => {});
    }
  }
}

// Function injected into job page to inspect application status (LinkedIn, Naukri, IBM, EY)
function inspectJobStatusPage() {
  try {
    const currentHref = (window.location.href || "").toLowerCase();
    const bodyText = document.body ? document.body.innerText.toLowerCase() : "";

    // -----------------------------------------------------------
    // 1. IBM CAREERS / BRASSRING INSPECTION
    // -----------------------------------------------------------
    if (currentHref.includes("ibm.com") || currentHref.includes("brassring.com") || bodyText.includes("ibm careers")) {
      const isIbmClosed = (
        bodyText.includes("sorry, this job is closed and we are no longer accepting applications") ||
        bodyText.includes("this job is closed and we are no longer accepting applications") ||
        bodyText.includes("no longer accepting applications") ||
        bodyText.includes("job is closed") ||
        bodyText.includes("sorry, this job is no longer available") ||
        bodyText.includes("stay connected by joining our talent network") ||
        bodyText.includes("job has been filled or closed")
      );

      if (isIbmClosed) {
        return { isExpired: true, isApplied: false, status: "EXPIRED" };
      }

      const isIbmApplied = (
        bodyText.includes("you have already submitted an application") ||
        bodyText.includes("application status: submitted") ||
        bodyText.includes("already applied to this job") ||
        bodyText.includes("you have already applied")
      );

      if (isIbmApplied) {
        return { isApplied: true, isExpired: false, status: "APPLIED" };
      }

      return { isApplied: false, isExpired: false, status: "NOT_APPLIED" };
    }

    // -----------------------------------------------------------
    // 2. EY CAREERS / SUCCESSFACTORS INSPECTION
    // -----------------------------------------------------------
    if (currentHref.includes("careers.ey.com") || currentHref.includes("ey.com") || bodyText.includes("careers at ey")) {
      const isEyClosed = (
        bodyText.includes("the job is no longer available.") ||
        bodyText.includes("the job is no longer available") ||
        bodyText.includes("this job is no longer available") ||
        bodyText.includes("this requisition is no longer available") ||
        bodyText.includes("job is no longer available") ||
        bodyText.includes("sorry, this job is no longer available")
      );

      if (isEyClosed) {
        return { isExpired: true, isApplied: false, status: "EXPIRED" };
      }

      const isEyApplied = (
        bodyText.includes("you have already applied for this job") ||
        bodyText.includes("already applied to this job") ||
        bodyText.includes("already applied") ||
        bodyText.includes("application status:")
      );

      if (isEyApplied) {
        return { isApplied: true, isExpired: false, status: "APPLIED" };
      }

      return { isApplied: false, isExpired: false, status: "NOT_APPLIED" };
    }

    // -----------------------------------------------------------
    // 3. LINKEDIN JOB INSPECTION
    // -----------------------------------------------------------
    if (currentHref.includes("linkedin.com") || bodyText.includes("linkedin")) {
      const topCard = (
        document.querySelector(".jobs-details__top-card") ||
        document.querySelector(".job-details-jobs-unified-top-card__container--two-pane") ||
        document.querySelector(".jobs-box__html-content") ||
        document.querySelector(".job-view-layout") ||
        document.body
      );
      const topCardText = topCard ? topCard.innerText.toLowerCase() : "";

      // Check for closed / expired job banner or text
      const isLinkedInClosed = (
        bodyText.includes("no longer accepting applications") ||
        topCardText.includes("no longer accepting applications") ||
        bodyText.includes("this job is no longer accepting applications") ||
        topCardText.includes("this job is no longer accepting applications") ||
        bodyText.includes("applications are no longer being accepted") ||
        bodyText.includes("this job is closed") ||
        topCardText.includes("this job is closed") ||
        bodyText.includes("job is closed") ||
        bodyText.includes("sorry, this job is no longer available") ||
        bodyText.includes("this position has been closed") ||
        bodyText.includes("this job has expired") ||
        !!document.querySelector(".artdeco-inline-feedback--error") ||
        !!document.querySelector(".jobs-details__closed-badge") ||
        !!document.querySelector(".job-details-jobs-unified-top-card__closed-badge")
      );

      if (isLinkedInClosed) {
        return { isExpired: true, isApplied: false, status: "EXPIRED" };
      }

      // Check if user already applied on LinkedIn
      const isLinkedInApplied = (
        topCardText.includes("you applied on") ||
        topCardText.includes("applied on") ||
        topCardText.includes("you have already applied") ||
        bodyText.includes("you have already applied for this job") ||
        !!document.querySelector(".jobs-s-apply__applied-date") ||
        Array.from(document.querySelectorAll("button, span.artdeco-inline-feedback")).some((el) => {
          const t = (el.textContent || "").trim().toLowerCase();
          return t === "applied" || t.startsWith("applied ");
        })
      );

      if (isLinkedInApplied) {
        return { isApplied: true, isExpired: false, status: "APPLIED" };
      }

      return { isApplied: false, isExpired: false, status: "NOT_APPLIED" };
    }

    // -----------------------------------------------------------
    // 4. NAUKRI INSPECTION
    // -----------------------------------------------------------
    const isNaukriExpiredRedirect = currentHref.includes("expjd=true");
    const isNaukriExpiredText = (
      bodyText.includes("job you are looking for is expired") ||
      bodyText.includes("job is expired") ||
      !!document.querySelector(".expired-msg")
    );

    if (isNaukriExpiredRedirect || isNaukriExpiredText) {
      return { isExpired: true, isApplied: false, isCareerPage: false, status: "EXPIRED" };
    }

    const alreadyAppliedEl = (
      document.querySelector("section#job_header #already-applied") ||
      document.querySelector("#already-applied") ||
      document.querySelector(".already-applied")
    );

    const headerEl = document.querySelector("section#job_header");
    const headerText = headerEl ? headerEl.innerText.toLowerCase() : "";

    const hasAppliedText = (
      headerText.includes("already applied") ||
      headerText.includes("applied on") ||
      headerText.includes("you have already applied") ||
      bodyText.includes("already applied") ||
      bodyText.includes("you have already applied for this job")
    );

    if (alreadyAppliedEl || hasAppliedText) {
      return { isApplied: true, isCareerPage: false, isExpired: false, status: "APPLIED" };
    }

    const companySiteEl = (
      document.querySelector("section#job_header #company-site-button") ||
      document.querySelector("#company-site-button")
    );
    if (companySiteEl || headerText.includes("company site") || headerText.includes("apply on company site")) {
      return { isApplied: false, isCareerPage: true, isExpired: false, status: "CAREER_PAGE" };
    }

    const applyButton = (
      document.querySelector("section#job_header #apply-button") ||
      document.querySelector("#apply-button") ||
      document.querySelector("section#job_header #walkin-button")
    );

    return {
      isApplied: false,
      isCareerPage: false,
      status: applyButton ? "NOT_APPLIED" : "NOT_APPLIED",
    };
  } catch (e) {
    return { isApplied: false, isCareerPage: false, status: "ERROR" };
  }
}

// ==========================================
// NAUKRI PROFILE ACTIVITY BUMPER (PING-PONG)
// ==========================================

async function handleNaukriHeadlineBump() {
  const DEFAULT_TITLE_A = "Power BI Developer | DAX | SQL | Power Query | MIS & Analytics";
  const DEFAULT_TITLE_B = "Power BI Developer | SQL | DAX | Power Query | Business Intelligence";

  // 1. Get stored custom titles or defaults
  const storage = await chrome.storage.local.get([
    'naukriHeadlineA',
    'naukriHeadlineB',
    'naukriLastVariant'
  ]);

  const variantA = (storage.naukriHeadlineA && storage.naukriHeadlineA.trim()) || DEFAULT_TITLE_A;
  const variantB = (storage.naukriHeadlineB && storage.naukriHeadlineB.trim()) || DEFAULT_TITLE_B;

  // 2. Check if a Naukri profile tab is already open
  const tabs = await chrome.tabs.query({ url: "*://*.naukri.com/mnjuser/profile*" });
  let tabId = null;
  let createdBackgroundTab = false;

  if (tabs && tabs.length > 0) {
    tabId = tabs[0].id;
  } else {
    // Open profile in background without stealing active focus
    const newTab = await chrome.tabs.create({
      url: "https://www.naukri.com/mnjuser/profile",
      active: false
    });
    tabId = newTab.id;
    createdBackgroundTab = true;

    const loaded = await waitForTabLoad(tabId, 25000);
    if (!loaded) {
      if (createdBackgroundTab) {
        try { await chrome.tabs.remove(tabId); } catch (e) {}
      }
      throw new Error("Timed out while loading Naukri profile page.");
    }

    // Wait 2.5s for client-side hydration
    await delay(2500);
  }

  try {
    // 3. Inject and run the bumper script inside the page
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: inPageBumpNaukriHeadline,
      args: [variantA, variantB]
    });

    const res = results && results[0] && results[0].result;
    if (!res) {
      throw new Error("No response from Naukri page automation script.");
    }

    if (!res.success) {
      throw new Error(res.error || "Failed to update Naukri headline.");
    }

    // 4. Update storage with bump record
    await chrome.storage.local.set({
      naukriLastUpdated: new Date().toISOString(),
      naukriLastVariant: res.updatedTo,
      naukriCurrentHeadline: res.newHeadline
    });

    return res;
  } finally {
    // Clean up created background tab after a brief pause
    if (createdBackgroundTab && tabId) {
      try {
        await delay(1200);
        await chrome.tabs.remove(tabId);
      } catch (e) {}
    }
  }
}

// Injected into Naukri profile DOM
async function inPageBumpNaukriHeadline(variantA, variantB) {
  try {
    const currentUrl = (window.location.href || "").toLowerCase();
    if (currentUrl.includes("/nlogin/login") || currentUrl.includes("/login")) {
      return { success: false, error: "Not logged in to Naukri. Please log in on naukri.com first." };
    }

    // 1. Find the Resume Headline section container
    let container = document.querySelector(".resumeHeadline") ||
                    document.querySelector("#lazyResumeHead") ||
                    document.querySelector('[data-section="resumeHeadline"]');

    if (!container) {
      const headings = Array.from(document.querySelectorAll("h1, h2, h3, h4, .widgetHead, .heading, div.title, span.title"));
      for (const h of headings) {
        if (h.textContent && h.textContent.trim().toLowerCase().includes("resume headline")) {
          container = h.closest(".card, .widget, section, div.row") || h.parentElement;
          break;
        }
      }
    }

    // 2. Read current headline text if present
    let currentHeadline = "";
    if (container) {
      const msgEl = container.querySelector(".msgWrapper") ||
                    container.querySelector(".content") ||
                    container.querySelector(".text") ||
                    container.querySelector("p");
      if (msgEl) {
        currentHeadline = (msgEl.textContent || "").trim();
      }
    }

    // 3. Determine target variant
    let targetVariant = "A";
    let targetHeadline = variantA;

    const normCurrent = currentHeadline.toLowerCase().replace(/\s+/g, " ");
    const normA = variantA.toLowerCase().replace(/\s+/g, " ");
    const normB = variantB.toLowerCase().replace(/\s+/g, " ");

    if (normCurrent.includes("mis & analytics") || normCurrent.includes("dax | sql") || normCurrent === normA) {
      targetVariant = "B";
      targetHeadline = variantB;
    } else if (normCurrent.includes("business intelligence") || normCurrent.includes("sql | dax") || normCurrent === normB) {
      targetVariant = "A";
      targetHeadline = variantA;
    } else {
      // Default to variant A
      targetVariant = "A";
      targetHeadline = variantA;
    }

    // 4. Locate and click the Edit button for Resume Headline
    let editBtn = null;
    if (container) {
      editBtn = container.querySelector(".edit") ||
                container.querySelector("span.edit") ||
                container.querySelector('[data-qa="resume-headline-edit"]') ||
                container.querySelector(".icon-edit") ||
                Array.from(container.querySelectorAll("span, a, button, i")).find(el => {
                  const t = (el.textContent || "").trim().toLowerCase();
                  return t === "edit" || t.includes("edit");
                });
    }

    if (!editBtn) {
      editBtn = document.querySelector(".resumeHeadline .edit, #lazyResumeHead .edit, [data-qa='resume-headline-edit']");
    }

    if (!editBtn) {
      return { success: false, error: "Could not find 'Edit' button in Naukri's Resume Headline section." };
    }

    editBtn.click();

    // 5. Wait for the textarea to appear (modal or inline)
    const startWait = Date.now();
    let textarea = null;
    while (Date.now() - startWait < 4000) {
      textarea = document.querySelector("#resumeHeadlineTxt") ||
                 document.querySelector("textarea.resumeHeadlineTxt") ||
                 document.querySelector(".resumeHeadline textarea") ||
                 document.querySelector("textarea[name='resumeHeadline']") ||
                 document.querySelector(".lightbox textarea, .drawer textarea, .modal textarea") ||
                 document.querySelector("textarea");

      if (textarea && textarea.offsetParent !== null) {
        break;
      }
      await new Promise(r => setTimeout(r, 120));
    }

    if (!textarea) {
      return { success: false, error: "Resume headline textarea did not appear after clicking Edit." };
    }

    // 6. Set new value with React / native event dispatch
    textarea.focus();
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
    if (nativeSetter) {
      nativeSetter.call(textarea, targetHeadline);
    } else {
      textarea.value = targetHeadline;
    }

    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.dispatchEvent(new Event('change', { bubbles: true }));
    textarea.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: ' ' }));

    await new Promise(r => setTimeout(r, 200));

    // 7. Locate Save button
    const searchScope = textarea.closest("form, .lightbox, .drawer, .modal, .action, .widget, .resumeHeadline") || document;
    const buttons = Array.from(searchScope.querySelectorAll("button, input[type='submit'], .saveBtn, .btn-dark-ot"));
    
    let saveBtn = buttons.find(b => {
      const t = (b.textContent || b.value || "").trim().toLowerCase();
      return t === "save" || t.includes("save");
    }) || searchScope.querySelector("button[type='submit']") || searchScope.querySelector(".btn-dark-ot");

    if (!saveBtn) {
      // Global fallback search for visible save button
      const allButtons = Array.from(document.querySelectorAll("button, .btn-dark-ot"));
      saveBtn = allButtons.find(b => {
        const t = (b.textContent || "").trim().toLowerCase();
        return (t === "save" || t.includes("save")) && b.offsetParent !== null;
      });
    }

    if (!saveBtn) {
      return { success: false, error: "Headline was typed, but the 'Save' button could not be found." };
    }

    saveBtn.click();

    // 8. Wait for save request to register
    await new Promise(r => setTimeout(r, 2200));

    return {
      success: true,
      updatedTo: targetVariant,
      newHeadline: targetHeadline,
      oldHeadline: currentHeadline
    };
  } catch (err) {
    return { success: false, error: err.message || "An unexpected error occurred in the page script." };
  }
}
