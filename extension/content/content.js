// content.js - Communicates with popup, detects site, and routes to appropriate adapter

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const detector = new window.SiteDetector();

  if (request.action === "GET_SITE_INFO") {
    const adapter = detector.getAdapter();
    sendResponse({ 
      adapterName: adapter.name,
      isDedicated: !(adapter instanceof window.GenericAdapter)
    });
    return false;
  }

  if (request.action === "FILL_FORM") {
    // 1. Get profile and questionnaire from storage
    chrome.storage.local.get(['normalizedProfile', 'questionnaire'], async (result) => {
      if (!result.normalizedProfile) {
        console.warn("[Job Autofill] No profile found in storage");
        sendResponse({ error: "No profile loaded" });
        return;
      }

      const profile = result.normalizedProfile;
      const questionnaire = result.questionnaire || [];
      console.log("[Job Autofill] Data loaded from storage for autofill");

      // 2. Select Adapter via SiteDetector
      const adapter = detector.getAdapter();
      console.log(`[Job Autofill] Routing fill request to: ${adapter.name}`);

      try {
        // 3. Execute adapter fill
        const summary = await adapter.fill(profile, questionnaire);
        
        // 4. Return summary to popup
        sendResponse({ summary });
      } catch (err) {
        console.error("[Job Autofill] Error executing adapter:", err);
        sendResponse({ error: err.message });
      }
    });

    return true; // Keep message channel open for async response
  }

  // --- MyCES Web Companion Bridge ---
  if (request.action === "MYCES_JOB_PROGRESS" || request.action === "MYCES_CHECK_COMPLETED") {
    window.postMessage({
      source: "myces-companion",
      type: request.action,
      ...request,
    }, "*");
    return false;
  }
});

// Listen for messages from MyCES Web App (localhost or deployed)
window.addEventListener("message", (event) => {
  // Only accept messages from current window
  if (event.source !== window || !event.data || event.data.source !== "myces-web") {
    return;
  }

  const { type, jobs } = event.data;

  if (type === "MYCES_PING") {
    window.postMessage({
      source: "myces-companion",
      type: "MYCES_PONG",
      version: "1.2",
    }, "*");
    return;
  }

  if (type === "MYCES_START_NAUKRI_CHECK") {
    chrome.runtime.sendMessage({
      action: "CHECK_NAUKRI_JOBS",
      jobs: jobs || [],
    }, (response) => {
      window.postMessage({
        source: "myces-companion",
        type: "MYCES_CHECK_STARTED",
        ...response,
      }, "*");
    });
    return;
  }

  if (type === "MYCES_CANCEL_NAUKRI_CHECK") {
    chrome.runtime.sendMessage({
      action: "CANCEL_NAUKRI_CHECK",
    });
    return;
  }
});

