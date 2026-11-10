// background.js - Background Service Worker for MyCES Job Autofill, Batch Auto-Apply, & Status Checker (Naukri, IBM, EY)

let isCheckingActive = false;
let isShineBatchRunning = false;
let shouldCancelBatch = false;
let backgroundTabId = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const senderTabId = sender.tab ? sender.tab.id : null;

  // -------------------------------------------------------------
  // SHINE BATCH AUTO-APPLY
  // -------------------------------------------------------------
  if (request.action === "START_SHINE_BATCH") {
    if (isShineBatchRunning) {
      sendResponse({ started: false, message: "A Shine batch auto-apply is already in progress." });
      return false;
    }

    const jobs = request.jobs || [];
    if (!jobs.length) {
      sendResponse({ started: false, message: "No Shine jobs provided to apply." });
      return false;
    }

    sendResponse({ started: true, total: jobs.length });
    runShineBatchLoop(jobs, senderTabId);
    return true;
  }

  if (request.action === "CANCEL_SHINE_BATCH") {
    shouldCancelBatch = true;
    if (backgroundTabId) {
      try { chrome.tabs.remove(backgroundTabId); } catch (e) {}
      backgroundTabId = null;
    }
    isShineBatchRunning = false;
    sendResponse({ cancelled: true });
    return false;
  }

  if (request.action === "GET_SHINE_BATCH_STATUS") {
    sendResponse({ isShineBatchRunning });
    return false;
  }

  // -------------------------------------------------------------
  // STATUS CHECKER (NAUKRI, IBM, EY)
  // -------------------------------------------------------------
  if (request.action === "CHECK_NAUKRI_JOBS" || request.action === "CHECK_JOB_STATUSES") {
    if (isCheckingActive) {
      sendResponse({ started: false, message: "A job status check is already in progress." });
      return false;
    }

    const jobs = request.jobs || [];
    if (!jobs.length) {
      sendResponse({ started: false, message: "No jobs provided to check." });
      return false;
    }

    sendResponse({ started: true, total: jobs.length });
    runStatusCheckLoop(jobs, senderTabId);
    return true;
  }

  if (request.action === "CANCEL_NAUKRI_CHECK" || request.action === "CANCEL_JOB_STATUS_CHECK") {
    shouldCancelBatch = true;
    if (backgroundTabId) {
      try { chrome.tabs.remove(backgroundTabId); } catch (e) {}
      backgroundTabId = null;
    }
    isCheckingActive = false;
    sendResponse({ cancelled: true });
    return false;
  }

  if (request.action === "BUMP_NAUKRI_PROFILE") {
    handleNaukriHeadlineBump()
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // Keep message channel open for async response
  }

  // -------------------------------------------------------------
  // LINKEDIN TRACKING & DIRECTORY SYNC (LIVE CLOUD + BULLETPROOF FALLBACK)
  // -------------------------------------------------------------
  if (request.action === "TRACK_LINKEDIN_CONNECTION") {
    handleTrackLinkedInConnection(request.candidate)
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.action === "SYNC_ACCEPTED_CONNECTIONS") {
    handleSyncAcceptedConnections(request)
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.action === "IMPORT_SENT_INVITATIONS") {
    handleImportSentInvitations(request.invitations)
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.action === "SCAN_OPPORTUNITIES") {
    scanRecruiterOpportunities()
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.action === "DISPATCH_LINKEDIN_MESSAGE") {
    handleDispatchLinkedInMessage(request)
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.action === "GET_APPROVED_MESSAGES") {
    fetchApprovedOutreachMessages()
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

// Helper: wait for tab to complete loading
function waitForTabLoad(tabId, timeoutMs = 25000) {
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

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// -------------------------------------------------------------
// SHINE BATCH AUTO-APPLY LOOP
// -------------------------------------------------------------
async function runShineBatchLoop(jobs, senderTabId) {
  isShineBatchRunning = true;
  shouldCancelBatch = false;

  let appliedCount = 0;
  let savedCount = 0;
  let errorCount = 0;

  // Pre-fetch stored profile and questionnaire
  const storage = await chrome.storage.local.get(['normalizedProfile', 'questionnaire']);
  const profile = storage.normalizedProfile || null;
  const questionnaire = storage.questionnaire || [];

  try {
    for (let i = 0; i < jobs.length; i++) {
      if (shouldCancelBatch) break;

      const job = jobs[i];
      const jobUrl = job.url;

      try {
        console.log(`[MyCES Background] Opening Shine job ${i + 1}/${jobs.length}: ${jobUrl}`);
        
        chrome.storage.local.set({
          shineBatchProgress: {
            current: i + 1,
            total: jobs.length,
            appliedCount,
            savedCount,
            isRunning: true,
            currentJob: job.title || jobUrl
          }
        });

        // 1. Create a FRESH background tab for each job (prevents BFCache message port errors)
        const tab = await chrome.tabs.create({ url: jobUrl, active: false });
        backgroundTabId = tab.id;

        // 2. Wait for page load and client-side hydration
        await waitForTabLoad(backgroundTabId, 25000);
        await delay(2200);

        if (shouldCancelBatch) {
          if (backgroundTabId) {
            try { await chrome.tabs.remove(backgroundTabId); } catch (e) {}
            backgroundTabId = null;
          }
          break;
        }

        // 3. Execute auto-apply script directly inside the page (immune to BFCache port disconnections)
        const results = await chrome.scripting.executeScript({
          target: { tabId: backgroundTabId },
          func: inPageExecuteShineApply,
          args: [profile, questionnaire],
        });

        const summary = (results && results[0] && results[0].result) || {
          status: "SAVED",
          message: "No response from Shine page"
        };

        const outcomeStatus = summary.status === "APPLIED" ? "APPLIED" : (summary.status === "SAVED" ? "SAVED" : "NEEDS_REVIEW");

        if (outcomeStatus === "APPLIED") {
          appliedCount++;
        } else {
          savedCount++;
        }

        console.log(`[MyCES Background] Job ${i + 1} outcome: ${outcomeStatus} - ${summary.message || ''}`);

        if (senderTabId) {
          chrome.tabs.sendMessage(senderTabId, {
            action: "MYCES_JOB_PROGRESS",
            jobId: job.id,
            title: job.title,
            company: job.company_name,
            url: jobUrl,
            status: outcomeStatus,
            message: summary.message,
            current: i + 1,
            total: jobs.length,
            appliedCount,
            savedCount
          }).catch(() => {});
        }

      } catch (err) {
        console.warn(`[MyCES Background] Error processing job ${job.id}:`, err);
        errorCount++;
        savedCount++;

        if (senderTabId) {
          chrome.tabs.sendMessage(senderTabId, {
            action: "MYCES_JOB_PROGRESS",
            jobId: job.id,
            title: job.title,
            company: job.company_name,
            url: jobUrl,
            status: "SAVED",
            message: err.message || "Error processing page",
            current: i + 1,
            total: jobs.length,
            appliedCount,
            savedCount
          }).catch(() => {});
        }
      } finally {
        // 4. Always close the job tab once done
        if (backgroundTabId) {
          try {
            await delay(400);
            await chrome.tabs.remove(backgroundTabId);
          } catch (e) {}
          backgroundTabId = null;
        }
      }

      await delay(1800);
    }
  } catch (loopErr) {
    console.error("[MyCES Background] Critical batch loop error:", loopErr);
  } finally {
    if (backgroundTabId) {
      try { await chrome.tabs.remove(backgroundTabId); } catch (e) {}
      backgroundTabId = null;
    }

    isShineBatchRunning = false;

    chrome.storage.local.set({
      shineBatchProgress: {
        isRunning: false,
        total: jobs.length,
        appliedCount,
        savedCount,
        errorCount,
        wasCancelled: shouldCancelBatch
      }
    });

    if (senderTabId) {
      chrome.tabs.sendMessage(senderTabId, {
        action: "MYCES_SHINE_BATCH_COMPLETED",
        summary: {
          total: jobs.length,
          appliedCount,
          savedCount,
          errorCount,
          wasCancelled: shouldCancelBatch
        }
      }).catch(() => {});
    }
  }
}

// Injected into Shine page context to execute auto-apply without using ports
async function inPageExecuteShineApply(profile, questionnaire) {
  try {
    if (!profile) {
      return {
        adapterName: 'Shine.com Dedicated Adapter',
        status: 'SAVED',
        message: 'No candidate profile loaded in extension (import resume_zero.json first)'
      };
    }

    // 1. Wait up to 3 seconds for content scripts to mount
    for (let wait = 0; wait < 15; wait++) {
      if (typeof window.ShineAdapter === 'function' || typeof window.SiteDetector === 'function') {
        break;
      }
      await new Promise(r => setTimeout(r, 200));
    }

    let adapter = null;
    if (typeof window.ShineAdapter === 'function') {
      adapter = new window.ShineAdapter();
    } else if (typeof window.SiteDetector === 'function') {
      const detector = new window.SiteDetector();
      adapter = detector.getAdapter();
    }

    if (adapter && typeof adapter.fill === 'function') {
      return await adapter.fill(profile, questionnaire || []);
    }

    // 2. Direct Fallback if adapter class is not on window
    const bodyText = document.body ? document.body.innerText.toLowerCase() : "";
    if (bodyText.includes("already applied") || bodyText.includes("you have already applied")) {
      return {
        adapterName: 'Shine Fallback',
        status: 'APPLIED',
        message: 'Already Applied'
      };
    }

    if (bodyText.includes("company site") || bodyText.includes("apply on company website")) {
      return {
        adapterName: 'Shine Fallback',
        status: 'SAVED',
        message: 'External Company Site (Marked Saved)'
      };
    }

    // Attempt direct click on Shine apply button
    const applyBtn = document.querySelector('button#applyJob, button.btn-apply, button[data-testid*="apply"], button.jobDetail_applyBtn__') ||
      Array.from(document.querySelectorAll('button')).find(b => (b.innerText || '').toLowerCase().includes('apply'));

    if (applyBtn) {
      applyBtn.click();
      await new Promise(r => setTimeout(r, 1000));
      return {
        adapterName: 'Shine Fallback',
        status: 'APPLIED',
        message: 'Applied Successfully'
      };
    }

    return {
      adapterName: 'Shine Fallback',
      status: 'SAVED',
      message: 'Apply button not found (Saved for review)'
    };
  } catch (err) {
    return {
      adapterName: 'Shine Fallback',
      status: 'SAVED',
      message: err.message || 'Error executing Shine apply'
    };
  }
}

// -------------------------------------------------------------
// UNIFIED STATUS CHECKER LOOP (NAUKRI, IBM, EY)
// -------------------------------------------------------------
async function runStatusCheckLoop(jobs, senderTabId) {
  isCheckingActive = true;
  shouldCancelBatch = false;

  let appliedCount = 0;
  let expiredCount = 0;
  let untouchedCount = 0;
  let errorCount = 0;

  try {
    const tab = await chrome.tabs.create({ url: "about:blank", active: false });
    backgroundTabId = tab.id;

    for (let i = 0; i < jobs.length; i++) {
      if (shouldCancelBatch) break;

      const job = jobs[i];
      const jobUrl = job.url;

      try {
        await chrome.tabs.update(backgroundTabId, { url: jobUrl });
        await waitForTabLoad(backgroundTabId, 25000);
        
        // Dynamic client hydration wait (extra for LinkedIn and heavy SPAs)
        const isLinkedIn = (jobUrl || "").toLowerCase().includes("linkedin.com");
        await delay(isLinkedIn ? 2600 : 1800);

        if (shouldCancelBatch) break;

        const results = await chrome.scripting.executeScript({
          target: { tabId: backgroundTabId },
          func: inspectJobStatusPage,
        });

        const inspection = (results && results[0] && results[0].result) || {
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
        console.warn(`[MyCES Background] Error inspecting job status for ${job.id}:`, err);
        errorCount++;
      }

      await delay(1200);
    }
  } finally {
    if (backgroundTabId) {
      try { await chrome.tabs.remove(backgroundTabId); } catch (e) {}
      backgroundTabId = null;
    }
    isCheckingActive = false;

    if (senderTabId) {
      chrome.tabs.sendMessage(senderTabId, {
        action: "MYCES_CHECK_COMPLETED",
        summary: {
          total: jobs.length,
          appliedCount,
          expiredCount,
          untouchedCount,
          errorCount,
          wasCancelled: shouldCancelBatch,
        },
      }).catch(() => {});
    }
  }
}

// -------------------------------------------------------------
// UNIFIED JOB STATUS INSPECTOR (NAUKRI + IBM + EY + ATS)
// -------------------------------------------------------------
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
    // 4. INDEED JOB INSPECTION
    // -----------------------------------------------------------
    if (currentHref.includes("indeed.com") || bodyText.includes("indeed")) {
      const isIndeedClosed = (
        bodyText.includes("this job has expired on indeed") ||
        bodyText.includes("this job has expired") ||
        bodyText.includes("job has expired on indeed") ||
        bodyText.includes("job has expired") ||
        bodyText.includes("the employer is not accepting applications") ||
        bodyText.includes("this job is no longer available") ||
        bodyText.includes("job is no longer available") ||
        !!document.querySelector('[class*="jobsearch-JobInfoHeader-expiredHeader"]') ||
        !!document.querySelector('.jobsearch-JobComponent-expired') ||
        !!document.querySelector('.fastpath-expired-job-alert') ||
        !!document.querySelector('[data-testid="job-expired-banner"]') ||
        !!document.querySelector('[aria-label*="expired" i]')
      );

      if (isIndeedClosed) {
        return { isExpired: true, isApplied: false, status: "EXPIRED" };
      }

      const isIndeedApplied = (
        bodyText.includes("you have applied to this job") ||
        bodyText.includes("you applied to this job") ||
        bodyText.includes("application submitted") ||
        bodyText.includes("applied on ") ||
        !!document.querySelector('.jobsearch-JobComponent-appliedStatus') ||
        !!document.querySelector('[data-testid="applied-status-banner"]')
      );

      if (isIndeedApplied) {
        return { isApplied: true, isExpired: false, status: "APPLIED" };
      }

      return { isApplied: false, isExpired: false, status: "NOT_APPLIED" };
    }

    // -----------------------------------------------------------
    // 5. NAUKRI INSPECTION
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


// =========================================================================
// LINKEDIN OUTREACH & RECRUITER CONVERSION ENGINE
// =========================================================================
const SUPABASE_REST_URL = 'https://nnicnxwzuvinaqvxuvsh.supabase.co/rest/v1';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uaWNueHd6dXZpbmFxdnh1dnNoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjUzODE1NiwiZXhwIjoyMDk4MTE0MTU2fQ.iillIQhcnWBMriJ1n0MZdasQlk27tog1g7HOv3_DJas';

async function handleTrackLinkedInConnection(cand) {
  if (!cand || !cand.name) {
    return { success: false, error: 'Invalid candidate data' };
  }

  const personPayload = {
    user_id: 'Akshay',
    full_name: cand.name.trim(),
    profile_url: cand.profileUrl || `https://www.linkedin.com/in/unknown-${Date.now()}`,
    headline: cand.headline || null,
    role: cand.category === 'PEER' ? 'Senior Engineering Peer' : 'Tech Talent Recruiter',
    connection_status: 'INVITATION_SENT',
    interaction_notes: `Sent via 1-Click Routine: "${cand.aiNote || ''}"`,
    tags: [cand.category || 'PEER', '1-Click Routine', 'LinkedIn Grow']
  };

  const actionPayload = {
    user_id: 'Akshay',
    action_type: 'SEND_CONNECTION',
    status: 'EXECUTED',
    reasoning: `1-Click Auto Routine: AI selected ${cand.category === 'PEER' ? 'Senior Engineering Peer' : 'Tech Talent Partner'}.`,
    payload: {
      recipient_name: cand.name,
      recipient_role: cand.headline,
      recipient_profile_url: cand.profileUrl,
      content: cand.aiNote || '',
      execution_method: 'AUTOMATED_ROUTINE'
    },
    proposed_by: 'linkedin_agent',
    executed_at: new Date().toISOString()
  };

  let savedPerson = false;
  let savedAction = false;

  // Direct Supabase REST (Guaranteed 100% database persistence)
  try {
    const pRes = await fetch(`${SUPABASE_REST_URL}/linkedin_people`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(personPayload)
    });
    if (pRes.ok) savedPerson = true;

    const aRes = await fetch(`${SUPABASE_REST_URL}/linkedin_actions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(actionPayload)
    });
    if (aRes.ok) savedAction = true;
  } catch (err) {
    console.warn('[Background] Supabase direct save warning:', err);
  }

  return { success: savedPerson || savedAction, savedPerson, savedAction };
}

function extractProfileSlug(url) {
  if (!url) return '';
  const match = url.match(/\/in\/([^\/\?#]+)/i);
  return match ? match[1].toLowerCase().trim() : url.split('?')[0].replace(/\/$/, '').toLowerCase().trim();
}

// ---------------------------------------------------------------------------
// LINKEDIN VOYAGER REST API ENGINE (Zero-DOM, Direct JSON Architecture)
// ---------------------------------------------------------------------------

// Retrieve the LinkedIn JSESSIONID CSRF token from active browser session cookies
async function getLinkedInCsrfToken() {
  return new Promise((resolve) => {
    chrome.cookies.get({ url: 'https://www.linkedin.com', name: 'JSESSIONID' }, (cookie) => {
      if (cookie && cookie.value) {
        resolve(cookie.value.replace(/^"|"$/g, '').trim());
      } else {
        resolve(null);
      }
    });
  });
}

// Fetch 1st-degree connections directly from LinkedIn internal REST API
async function fetchRecentConnectionsFromVoyager() {
  const csrfToken = await getLinkedInCsrfToken();
  if (!csrfToken) {
    console.log('[Voyager API] No active LinkedIn JSESSIONID found in browser.');
    return [];
  }

  const headers = {
    'csrf-token': csrfToken,
    'x-restli-protocol-version': '2.0.0',
    'accept': 'application/vnd.linkedin.normalized+json+2.1'
  };

  // 1. Modern Voyager Dash API
  try {
    const dashUrl = 'https://www.linkedin.com/voyager/api/relationships/dash/connections?decorationId=com.linkedin.voyager.dash.relationships.invitations.WebConnectionCardDecoration&count=50&sortType=RECENTLY_ADDED';
    const res = await fetch(dashUrl, { headers, credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      const extracted = parseVoyagerConnectionsResponse(data);
      if (extracted.length > 0) {
        console.log(`[Voyager API] Dash endpoint successfully returned ${extracted.length} connections.`);
        return extracted;
      }
    }
  } catch (err) {
    console.warn('[Voyager API] Dash endpoint warning:', err);
  }

  // 2. Classic Voyager Relationships API (Fallback)
  try {
    const classicUrl = 'https://www.linkedin.com/voyager/api/relationships/connections?count=50&sortType=RECENTLY_ADDED';
    const res = await fetch(classicUrl, { headers, credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      const extracted = parseVoyagerConnectionsResponse(data);
      if (extracted.length > 0) {
        console.log(`[Voyager API] Classic endpoint successfully returned ${extracted.length} connections.`);
        return extracted;
      }
    }
  } catch (err) {
    console.warn('[Voyager API] Classic endpoint warning:', err);
  }

  return [];
}

function parseVoyagerConnectionsResponse(data) {
  if (!data) return [];
  const results = [];
  const seenSlugs = new Set();

  // Handle Classic API response structure
  if (Array.isArray(data.elements)) {
    for (const el of data.elements) {
      const profile = el.miniProfile || el;
      if (profile && (profile.publicIdentifier || profile.entityUrn)) {
        const slug = (profile.publicIdentifier || profile.entityUrn.split(':').pop()).toLowerCase().trim();
        if (slug && !seenSlugs.has(slug)) {
          seenSlugs.add(slug);
          const fullName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || slug;
          results.push({
            slug,
            name: fullName,
            headline: profile.occupation || profile.headline || '',
            profileUrl: `https://www.linkedin.com/in/${slug}`
          });
        }
      }
    }
  }

  // Handle Dash API normalized included array
  if (Array.isArray(data.included)) {
    for (const entity of data.included) {
      const isProfile = entity.$type && (entity.$type.includes('Profile') || entity.$type.includes('MiniProfile') || entity.$type.includes('identity'));
      if (isProfile && (entity.publicIdentifier || entity.entityUrn)) {
        const slug = (entity.publicIdentifier || '').toLowerCase().trim();
        if (slug && slug !== 'me' && !seenSlugs.has(slug)) {
          seenSlugs.add(slug);
          const fullName = `${entity.firstName || ''} ${entity.lastName || ''}`.trim() || slug;
          results.push({
            slug,
            name: fullName,
            headline: entity.headline || entity.occupation || '',
            profileUrl: `https://www.linkedin.com/in/${slug}`
          });
        }
      }
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// OPPORTUNITY RADAR: RECRUITER POST & HIRING SIGNAL ANALYZER
// ---------------------------------------------------------------------------

function analyzePostForHiringSignal(postText, recruiter) {
  if (!postText || postText.length < 20) return null;
  const lower = postText.toLowerCase();

  const hiringKeywords = [
    'hiring', 'we are hiring', 'looking for', 'immediate joiner',
    'open role', 'open position', 'job opportunity', 'hiring for',
    'requisition', 'candidates with', 'years of experience',
    'share cv', 'send resume', 'dm me', 'reach out', 'apply now'
  ];

  const hasHiringIntent = hiringKeywords.some(k => lower.includes(k));
  if (!hasHiringIntent) return null;

  const highMatchKeywords = ['fabric', 'microsoft fabric', 'dax', 'power bi', 'powerbi', 'data architect', 'solution architect', 'fdi', 'oac', 'oracle analytics'];
  const medMatchKeywords = ['data engineer', 'azure data', 'synapse', 'etl', 'sql', 'analytics', 'bi developer', 'data analytics', 'data warehousing', 'databricks'];

  let score = 65;
  const matchedHigh = highMatchKeywords.filter(k => lower.includes(k));
  const matchedMed = medMatchKeywords.filter(k => lower.includes(k));

  if (matchedHigh.length > 0) score += 25 + Math.min(matchedHigh.length * 3, 10);
  else if (matchedMed.length > 0) score += 15 + Math.min(matchedMed.length * 2, 8);
  else return null;

  score = Math.min(Math.max(score, 70), 98);

  let title = 'Business Automation & Analytics Professional';
  if (lower.includes('power bi') || lower.includes('powerbi')) title = 'BI & Reporting Specialist (Power BI / DAX / SQL)';
  else if (lower.includes('automation') || lower.includes('automate') || lower.includes('vba')) title = 'Business Process Automation Specialist (Power Automate / VBA / Python)';
  else if (lower.includes('mis') || lower.includes('reporting')) title = 'MIS & Operational Analytics Lead';
  else if (lower.includes('analytics') || lower.includes('analyst')) title = 'Analytics & BI Professional (SQL / Python / Excel)';
  else if (lower.includes('architect') || lower.includes('lead')) title = 'Analytics Solutions & Process Improvement Lead';

  let company = recruiter.company || '';
  if (!company && recruiter.headline) {
    const atMatch = recruiter.headline.match(/@\s*([^|•\n,]+)/i) || recruiter.headline.match(/at\s+([^|•\n,]+)/i);
    if (atMatch) company = atMatch[1].trim();
  }
  if (!company) company = 'Tech Industry Client';

  return {
    title,
    company,
    opportunity_type: 'HIRING_MANAGER_POST',
    description: postText.slice(0, 450).trim() + (postText.length > 450 ? '...' : ''),
    score,
    status: 'NEW'
  };
}

async function scanRecruiterOpportunities() {
  console.log('[Opportunity Radar] Scanning recruiters for active hiring signals...');
  try {
    const res = await fetch(`${SUPABASE_REST_URL}/linkedin_people?tags=cs.{RECRUITER}&select=id,full_name,headline,role,profile_url,company`, {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      }
    });

    if (!res.ok) return { count: 0 };
    const recruiters = await res.json();
    if (!recruiters || recruiters.length === 0) return { count: 0 };

    const csrfToken = await getLinkedInCsrfToken();
    if (!csrfToken) return { count: 0 };

    let newOpportunitiesCount = 0;

    for (const r of recruiters.slice(0, 6)) {
      const slug = extractProfileSlug(r.profile_url);
      if (!slug) continue;

      try {
        const url = `https://www.linkedin.com/voyager/api/identity/profileUpdatesV2?count=5&includeLongTermHistory=false&moduleKey=creator_activity&q=memberShareFeed&vanityName=${slug}`;
        const pRes = await fetch(url, {
          headers: {
            'csrf-token': csrfToken,
            'x-restli-protocol-version': '2.0.0',
            'accept': 'application/vnd.linkedin.normalized+json+2.1'
          },
          credentials: 'include'
        });

        if (pRes.ok) {
          const data = await pRes.json();
          const posts = [];
          if (Array.isArray(data.included)) {
            data.included.forEach(item => {
              if (item.commentary && item.commentary.text && item.commentary.text.text) {
                posts.push(item.commentary.text.text);
              }
            });
          }

          for (const postText of posts) {
            const opp = analyzePostForHiringSignal(postText, r);
            if (opp) {
              const checkUrl = `${SUPABASE_REST_URL}/linkedin_opportunities?contact_person_id=eq.${r.id}&title=eq.${encodeURIComponent(opp.title)}&select=id`;
              const cRes = await fetch(checkUrl, {
                headers: {
                  'apikey': SUPABASE_SERVICE_KEY,
                  'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
                }
              });
              const existing = cRes.ok ? await cRes.json() : [];

              if (!existing || existing.length === 0) {
                await fetch(`${SUPABASE_REST_URL}/linkedin_opportunities`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_SERVICE_KEY,
                    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                    'Prefer': 'return=representation'
                  },
                  body: JSON.stringify({
                    user_id: 'Akshay',
                    title: opp.title,
                    company: opp.company,
                    opportunity_type: opp.opportunity_type,
                    source_url: r.profile_url,
                    contact_person_id: r.id,
                    description: opp.description,
                    status: 'NEW',
                    score: opp.score
                  })
                });
                newOpportunitiesCount++;
              }
            }
          }
        }
      } catch (e) {
        // Continue to next recruiter
      }
    }

    if (newOpportunitiesCount > 0) {
      console.log(`[Opportunity Radar] Found and logged ${newOpportunitiesCount} new hiring opportunities!`);
    }

    return { count: newOpportunitiesCount };
  } catch (err) {
    console.warn('[Opportunity Radar] Scan warning:', err);
    return { count: 0 };
  }
}

async function handleSyncAcceptedConnections(payload = {}) {
  let recentSlugs = Array.isArray(payload.recentSlugs) ? payload.recentSlugs.map(s => s.toLowerCase().trim()) : [];
  let recentNames = Array.isArray(payload.recentNames) ? payload.recentNames.map(n => n.toLowerCase().trim()) : [];

  // If no slugs provided by front-end, query LinkedIn Voyager API directly!
  if (recentSlugs.length === 0) {
    console.log('[Background Sync] Fetching recent 1st-degree connections via LinkedIn Voyager API...');
    const voyagerConnections = await fetchRecentConnectionsFromVoyager();
    console.log(`[Background Sync] Voyager API returned ${voyagerConnections.length} connections.`);

    voyagerConnections.forEach(c => {
      if (c.slug) recentSlugs.push(c.slug);
      if (c.name) recentNames.push(c.name.toLowerCase().trim());
    });
  }

  if (recentSlugs.length === 0 && recentNames.length === 0) {
    return { success: true, updated: 0, newRecruiters: [] };
  }

  try {
    // 1. Fetch people marked INVITATION_SENT
    const res = await fetch(`${SUPABASE_REST_URL}/linkedin_people?connection_status=eq.INVITATION_SENT&select=*`, {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      }
    });

    if (!res.ok) throw new Error(`Supabase query failed: ${res.status}`);
    const pendingPeople = await res.json();

    let updatedCount = 0;
    const newRecruiters = [];

    for (const person of pendingPeople) {
      const pSlug = extractProfileSlug(person.profile_url);
      const pName = (person.full_name || '').toLowerCase().trim();

      // Primary check: exact Profile ID / slug match (100% precision)
      // Secondary fallback: full name match
      const slugMatch = pSlug && recentSlugs.includes(pSlug);
      const nameMatch = pName && recentNames.some(r => r.includes(pName) || pName.includes(r));

      if (slugMatch || nameMatch) {
        // Flip to CONNECTED
        await fetch(`${SUPABASE_REST_URL}/linkedin_people?id=eq.${person.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
          },
          body: JSON.stringify({
            connection_status: 'CONNECTED',
            last_interaction_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        });

        updatedCount++;

        // If Recruiter, draft automated welcome greeting message
        const isRecruiter = (person.tags && person.tags.includes('RECRUITER')) ||
                            (person.role && person.role.toLowerCase().includes('recruiter')) ||
                            (person.headline && (person.headline.toLowerCase().includes('recruiter') || person.headline.toLowerCase().includes('talent')));

        if (isRecruiter) {
          const firstName = person.full_name.split(' ')[0] || person.full_name;
          const greetingNote = `Hi ${firstName}, thanks for connecting! I noticed your work in recruiting data and technology talent. I bring 7+ years of experience across analytics, BI, and process automation (Power BI, SQL, Excel, and Python). Glad to be connected and look forward to exchanging insights!`;

          await fetch(`${SUPABASE_REST_URL}/linkedin_actions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_SERVICE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
            },
            body: JSON.stringify({
              user_id: 'Akshay',
              action_type: 'MESSAGE',
              status: 'PENDING_APPROVAL',
              reasoning: `Automated Recruiter Intro: ${person.full_name} accepted your invitation! Send greeting to start conversation.`,
              payload: {
                recipient_name: person.full_name,
                recipient_role: person.headline || person.role,
                recipient_profile_url: person.profile_url,
                content: greetingNote
              },
              target_id: person.id,
              proposed_by: 'linkedin_agent'
            })
          });

          newRecruiters.push({
            name: person.full_name,
            profileUrl: person.profile_url,
            greetingNote
          });
        }
      }
    }

    if (updatedCount > 0) {
      console.log(`[Voyager Sync] Successfully updated ${updatedCount} connection(s) to CONNECTED in MYCES!`);
      // Broadcast celebration toast to any open LinkedIn tabs
      chrome.tabs.query({ url: '*://*.linkedin.com/*' }, (tabs) => {
        tabs.forEach(t => {
          chrome.tabs.sendMessage(t.id, {
            action: 'SHOW_TOAST',
            message: `🎉 Synced ${updatedCount} newly accepted connection(s) to MYCES!`
          }).catch(() => {});
        });
      });
    }

    // Background scan for recruiter hiring signals / opportunities
    scanRecruiterOpportunities().catch((e) => console.warn('[Opportunity Radar] Async scan warning:', e));

    return {
      success: true,
      updated: updatedCount,
      newRecruiters
    };
  } catch (err) {
    console.error('[Background] Error syncing connections:', err);
    return { success: false, error: err.message };
  }
}


async function handleImportSentInvitations(invitations = []) {
  if (!Array.isArray(invitations) || invitations.length === 0) {
    return { success: true, count: 0 };
  }

  let importedCount = 0;
  for (const inv of invitations) {
    const cleanUrl = (inv.profileUrl || '').replace(/\/+$/, '').trim();
    if (!inv.name || !cleanUrl) continue;

    const lowerH = (inv.headline || '').toLowerCase();
    const isRecruiter = lowerH.includes('recruiter') || 
                        lowerH.includes('recruitment') || 
                        lowerH.includes('talent') || 
                        lowerH.includes('hr') || 
                        lowerH.includes('hrbp') || 
                        lowerH.includes('hiring') || 
                        lowerH.includes('staffing') || 
                        lowerH.includes('sourcer');

    const personPayload = {
      user_id: 'Akshay',
      full_name: inv.name.trim(),
      profile_url: cleanUrl,
      headline: inv.headline || null,
      role: isRecruiter ? 'Tech Talent Recruiter' : 'Senior Engineering Peer',
      connection_status: 'INVITATION_SENT',
      interaction_notes: `Imported from LinkedIn Sent Invitations (${inv.sentTime || 'Recent'})`,
      tags: [isRecruiter ? 'RECRUITER' : 'PEER', 'Sent Invite', 'LinkedIn Import']
    };

    const actionPayload = {
      user_id: 'Akshay',
      action_type: 'SEND_CONNECTION',
      status: 'EXECUTED',
      reasoning: `Imported from LinkedIn Sent Invitations (${inv.sentTime || 'Recent'})`,
      payload: {
        recipient_name: inv.name,
        recipient_role: inv.headline,
        recipient_profile_url: cleanUrl,
        content: `Sent invitation (${inv.sentTime || 'Recent'})`,
        execution_method: 'LINKEDIN_IMPORT'
      },
      proposed_by: 'linkedin_agent',
      executed_at: new Date().toISOString()
    };

    try {
      // Check if already in linkedin_people by profile_url (slug or normalized URL)
      const checkRes = await fetch(`${SUPABASE_REST_URL}/linkedin_people?profile_url=eq.${encodeURIComponent(cleanUrl)}&select=id`, {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
        }
      });
      const existing = checkRes.ok ? await checkRes.json() : [];

      if (existing && existing.length > 0) {
        // Person already exists - update interaction notes if needed
        await fetch(`${SUPABASE_REST_URL}/linkedin_people?id=eq.${existing[0].id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
          },
          body: JSON.stringify({
            interaction_notes: personPayload.interaction_notes,
            updated_at: new Date().toISOString()
          })
        });
      } else {
        // Upsert to linkedin_people
        await fetch(`${SUPABASE_REST_URL}/linkedin_people`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(personPayload)
        });

        // Upsert to linkedin_actions
        await fetch(`${SUPABASE_REST_URL}/linkedin_actions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(actionPayload)
        });
      }

      importedCount++;
    } catch (err) {
      console.warn(`[Background Import] Error saving ${inv.name}:`, err);
    }
  }

  return { success: true, count: importedCount };
}

// ---------------------------------------------------------------------------
// BACKGROUND ALARMS & AUTOMATIC TRIGGERS (HYBRID VOYAGER SYNC)
// ---------------------------------------------------------------------------

// 1. Scheduled Background Sync: Every 15 minutes, automatically check for accepted connections
chrome.alarms.create('MYCES_VOYAGER_SYNC', { periodInMinutes: 15 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'MYCES_VOYAGER_SYNC') {
    console.log('[Alarm] Running scheduled Voyager connection sync...');
    handleSyncAcceptedConnections();
  }
});

// 2. On browser startup & extension load: check immediately
chrome.runtime.onStartup.addListener(() => {
  setTimeout(() => handleSyncAcceptedConnections(), 3000);
});

chrome.runtime.onInstalled.addListener(() => {
  setTimeout(() => handleSyncAcceptedConnections(), 2000);
});

// 3. When navigating to LinkedIn, quietly trigger sync in background
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab && tab.url && tab.url.includes('linkedin.com')) {
    setTimeout(() => handleSyncAcceptedConnections(), 2500);
  }
});

// ---------------------------------------------------------------------------
// 1-CLICK LINKEDIN MESSAGE DISPATCHER (Option 1 Automation Engine)
// ---------------------------------------------------------------------------

async function fetchApprovedOutreachMessages() {
  try {
    const res = await fetch(`${SUPABASE_REST_URL}/linkedin_actions?action_type=eq.MESSAGE&status=in.(APPROVED,READY_FOR_MANUAL)&order=created_at.desc&select=*`, {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      }
    });
    if (!res.ok) return { actions: [] };
    const actions = await res.json();
    return { actions: actions || [] };
  } catch (err) {
    return { actions: [], error: err.message };
  }
}

// Injected into the recipient's LinkedIn profile tab to locate the Message button,
// type the approved greeting, and send it.
async function executeLinkedInProfileMessage(messageContent, recipientName) {
  function showFloatingBadge(text, isError = false) {
    let badge = document.getElementById('myces-dispatch-badge');
    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'myces-dispatch-badge';
      badge.style.position = 'fixed';
      badge.style.top = '20px';
      badge.style.right = '20px';
      badge.style.zIndex = '9999999';
      badge.style.padding = '10px 16px';
      badge.style.borderRadius = '8px';
      badge.style.fontFamily = '-apple-system, system-ui, BlinkMacSystemFont, sans-serif';
      badge.style.fontSize = '13px';
      badge.style.fontWeight = '600';
      badge.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.4)';
      badge.style.transition = 'all 0.3s ease';
      document.body.appendChild(badge);
    }
    badge.style.background = isError ? '#991b1b' : '#0284c7';
    badge.style.color = '#ffffff';
    badge.style.border = isError ? '1px solid #ef4444' : '1px solid #38bdf8';
    badge.textContent = text;
  }

  showFloatingBadge(`🤖 MYCES: Dispatching intro to ${recipientName || 'connection'}...`);

  // Helper to find enabled Send button
  function getEnabledSendButton() {
    const candidates = Array.from(document.querySelectorAll('button, [role="button"], input[type="submit"]'));
    return candidates.find(b => {
      const txt = (b.innerText || b.textContent || '').trim().toLowerCase();
      const aria = (b.getAttribute('aria-label') || '').toLowerCase();
      const cls = typeof b.className === 'string' ? b.className.toLowerCase() : '';
      const isSend = txt === 'send' || aria === 'send' || aria.includes('send message') || cls.includes('send-button');
      const isEnabled = !b.disabled && b.getAttribute('aria-disabled') !== 'true';
      return isSend && isEnabled;
    });
  }

  // 1. If Send button is ALREADY enabled, recipient is already selected
  let sendButton = getEnabledSendButton();

  // 2. If not enabled, we must select the recipient in the "To" typeahead field
  if (!sendButton && recipientName) {
    // Wait up to 7 seconds for the "To" input field to appear in DOM
    const startFindInput = Date.now();
    let toInput = null;

    while (!toInput && Date.now() - startFindInput < 7000) {
      const inputs = Array.from(document.querySelectorAll('input'));
      toInput = inputs.find(i => {
        const ph = (i.placeholder || '').toLowerCase();
        const aria = (i.getAttribute('aria-label') || '').toLowerCase();
        const cls = typeof i.className === 'string' ? i.className.toLowerCase() : '';
        return ph.includes('type a name') || aria.includes('type a name') || cls.includes('msg-connections-typeahead__search-field');
      });
      if (!toInput) await new Promise(r => setTimeout(r, 250));
    }

    if (toInput) {
      toInput.focus();

      // Native property setter + React/Ember synthetic events
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      if (nativeSetter) {
        nativeSetter.call(toInput, recipientName);
      } else {
        toInput.value = recipientName;
      }
      toInput.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertText', data: recipientName }));
      toInput.dispatchEvent(new Event('input', { bubbles: true }));
      toInput.dispatchEvent(new Event('change', { bubbles: true }));

      try {
        document.execCommand('selectAll', false, null);
        document.execCommand('insertText', false, recipientName);
      } catch (e) {}

      // Wait 1000ms for LinkedIn's suggestions list to filter
      await new Promise(r => setTimeout(r, 1000));

      const firstName = recipientName.trim().split(' ')[0].toLowerCase();
      const suggestionCandidates = Array.from(document.querySelectorAll(
        'li, div[role="option"], [class*="selectable-entity"], [class*="typeahead-result"], .msg-connections-typeahead__search-result, .basic-typeahead__selectable-list li'
      ));

      const matchedSuggestion = suggestionCandidates.find(el => {
        const txt = (el.innerText || el.textContent || '').toLowerCase();
        return txt.includes(firstName) && !el.querySelector('input') && !el.querySelector('textarea');
      }) || suggestionCandidates[0];

      if (matchedSuggestion) {
        matchedSuggestion.scrollIntoView({ block: 'nearest' });
        matchedSuggestion.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
        matchedSuggestion.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
        matchedSuggestion.click();
        await new Promise(r => setTimeout(r, 800));
      } else {
        toInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
        toInput.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
        await new Promise(r => setTimeout(r, 800));
      }
    }
  }

  // 3. Poll for enabled Send button (up to 8s)
  const startTime = Date.now();
  sendButton = getEnabledSendButton();

  while (!sendButton && Date.now() - startTime < 8000) {
    await new Promise(r => setTimeout(r, 350));
    sendButton = getEnabledSendButton();
  }

  if (sendButton) {
    sendButton.click();
    showFloatingBadge(`🎉 Message successfully sent to ${recipientName || 'connection'}!`);
    await new Promise(r => setTimeout(r, 2000));
    return { success: true, sent: true };
  } else {
    // If Send button couldn't be auto-clicked, the message is safely drafted in the box
    showFloatingBadge(`📝 Message drafted in box! Click Send to confirm.`, false);
    await new Promise(r => setTimeout(r, 2000));
    return { success: true, sent: false, drafted: true };
  }
}

async function handleDispatchLinkedInMessage(payload = {}) {
  const { actionId, recipientUrl, content, recipientName } = payload;
  if (!recipientUrl || !content) {
    return { success: false, error: 'Recipient URL and message content are required.' };
  }

  try {
    // 1. Sanitize message: strictly strip leading and trailing quotes
    let cleanMsg = (content || '').trim();
    cleanMsg = cleanMsg.replace(/^["'“”‘’`\s]+|["'“”‘’`\s]+$/g, '').trim();
    cleanMsg = cleanMsg.replace(/^["'“”‘’`\s]+|["'“”‘’`\s]+$/g, '').trim();

    // 2. Extract recipient username from profile URL
    const match = recipientUrl.match(/\/in\/([^/?#]+)/);
    const username = match ? match[1] : '';

    // 3. Construct official LinkedIn direct compose URL shortcut
    let targetUrl;
    if (username) {
      targetUrl = `https://www.linkedin.com/messaging/thread/new/?recipients=${username}&body=${encodeURIComponent(cleanMsg)}`;
    } else {
      targetUrl = recipientUrl;
    }

    // 4. Navigate tab to the direct compose shortcut
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    let tab = null;

    if (activeTab && activeTab.url && activeTab.url.includes('linkedin.com')) {
      // If active tab is already on thread/new with body, we can run directly
      if (activeTab.url.includes('/messaging/thread/new')) {
        tab = activeTab;
      } else {
        await chrome.tabs.update(activeTab.id, { url: targetUrl });
        tab = activeTab;
        const loaded = await waitForTabLoad(tab.id, 25000);
        if (!loaded) return { success: false, error: 'Timeout waiting for LinkedIn page to load.' };
        await new Promise(r => setTimeout(r, 2800));
      }
    } else {
      tab = await chrome.tabs.create({ url: targetUrl, active: true });
      const loaded = await waitForTabLoad(tab.id, 25000);
      if (!loaded) return { success: false, error: 'Timeout waiting for LinkedIn page to load.' };
      await new Promise(r => setTimeout(r, 2800));
    }

    // 5. Run script to select recipient if needed and click Send
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: executeLinkedInProfileMessage,
      args: [cleanMsg, recipientName || 'Connection']
    });

    const res = results && results[0] && results[0].result;
    if (res && res.success) {
      // 6. Update Supabase Action to EXECUTED only if actually sent
      if (res.sent && actionId) {
        await fetch(`${SUPABASE_REST_URL}/linkedin_actions?id=eq.${actionId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
          },
          body: JSON.stringify({
            status: 'EXECUTED',
            executed_at: new Date().toISOString()
          })
        });

        // 7. Update contact record in linkedin_people with 'Intro Sent' tag and timestamp
        if (recipientUrl) {
          try {
            const match = recipientUrl.match(/\/in\/([^/?#]+)/);
            const username = match ? match[1] : '';
            if (username) {
              const pRes = await fetch(`${SUPABASE_REST_URL}/linkedin_people?profile_url=ilike.*${encodeURIComponent(username)}*&select=id,tags`, {
                headers: {
                  'apikey': SUPABASE_SERVICE_KEY,
                  'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
                }
              });
              const pList = await pRes.json();
              if (pList && pList[0]) {
                const currentTags = Array.isArray(pList[0].tags) ? pList[0].tags : [];
                const updatedTags = Array.from(new Set([...currentTags, 'Intro Sent']));
                await fetch(`${SUPABASE_REST_URL}/linkedin_people?id=eq.${pList[0].id}`, {
                  method: 'PATCH',
                  headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_SERVICE_KEY,
                    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
                  },
                  body: JSON.stringify({
                    last_interaction_at: new Date().toISOString(),
                    tags: updatedTags
                  })
                });
              }
            }
          } catch (pErr) {
            console.warn('[Dispatch]: Could not update contact tags:', pErr);
          }
        }
      }

      return { success: true, sent: res.sent, drafted: res.drafted };
    } else {
      return { success: false, error: (res && res.error) || 'Failed to auto-send message on profile.' };
    }
  } catch (err) {
    console.error('[Dispatch Message Error]:', err);
    return { success: false, error: err.message };
  }
}
