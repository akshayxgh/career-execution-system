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

        // Wait an additional 1.5s for dynamic client hydration
        await delay(1500);

        if (shouldCancelCheck) break;

        // Inspect the DOM of the job page
        const results = await chrome.scripting.executeScript({
          target: { tabId: backgroundTabId },
          func: inspectNaukriJobPage,
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

// Function injected into Naukri page to inspect application status
function inspectNaukriJobPage() {
  try {
    // 0. Check if Job is Expired (e.g. redirect to ?expJD=true or banner text)
    const currentHref = (window.location.href || "").toLowerCase();
    const isExpiredRedirect = currentHref.includes("expjd=true");
    const bodyText = document.body ? document.body.innerText.toLowerCase() : "";
    const isExpiredText = (
      bodyText.includes("job you are looking for is expired") ||
      bodyText.includes("job is expired") ||
      !!document.querySelector(".expired-msg")
    );

    if (isExpiredRedirect || isExpiredText) {
      return { isExpired: true, isApplied: false, isCareerPage: false, status: "EXPIRED" };
    }

    // 1. Check for standard already applied elements
    const alreadyAppliedEl = (
      document.querySelector("section#job_header #already-applied") ||
      document.querySelector("#already-applied") ||
      document.querySelector(".already-applied")
    );

    // 2. Check text in header or body
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

    // 3. Check for external company site button
    const companySiteEl = (
      document.querySelector("section#job_header #company-site-button") ||
      document.querySelector("#company-site-button")
    );
    if (companySiteEl || headerText.includes("company site") || headerText.includes("apply on company site")) {
      return { isApplied: false, isCareerPage: true, isExpired: false, status: "CAREER_PAGE" };
    }

    // 4. Check for standard apply button
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
