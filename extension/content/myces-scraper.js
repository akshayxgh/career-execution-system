/**
 * myces-scraper.js - Injected into MyCES dashboard pages to harvest Shine job URLs
 * and listen for real-time status updates (Applied vs Saved).
 */

// Listen for messages from popup or background service worker
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "HARVEST_MYCES_SHINE_JOBS") {
    const shineJobs = harvestShineJobsFromPage();
    console.log(`[Job Autofill - MyCES] Harvested ${shineJobs.length} Shine jobs from page`);
    sendResponse({ jobs: shineJobs });
    return false;
  }

  if (request.action === "MYCES_JOB_PROGRESS") {
    // Optionally update table row in DOM if job element exists
    console.log(`[Job Autofill - MyCES] Progress: Job ${request.jobId || request.url} => ${request.status}`);
    updateJobRowInDom(request.jobId, request.url, request.status);
    return false;
  }
});

/**
 * Scans table rows, anchors, or dataset items for Shine job URLs
 */
function harvestShineJobsFromPage() {
  const jobs = [];
  const seenUrls = new Set();

  // 1. Find all anchor tags pointing to shine.com
  const links = document.querySelectorAll('a[href*="shine.com"]');
  links.forEach((link, idx) => {
    const url = link.href;
    if (url && !seenUrls.has(url)) {
      seenUrls.add(url);

      const row = link.closest('tr, div[class*="row"], div[class*="job"], [data-testid*="job"]');
      let title = link.innerText.trim();
      let company = '';
      let id = link.getAttribute('data-job-id') || `shine-job-${idx}`;

      if (row) {
        const titleEl = row.querySelector('[class*="title"], h3, h4, .job-title');
        if (titleEl) title = titleEl.innerText.trim();
        const compEl = row.querySelector('[class*="company"], .company-name');
        if (compEl) company = compEl.innerText.trim();
      }

      jobs.push({
        id,
        title: title || 'Shine Job Position',
        company_name: company || 'Company',
        url
      });
    }
  });

  return jobs;
}

function updateJobRowInDom(jobId, url, status) {
  try {
    const selector = jobId ? `[data-job-id="${jobId}"]` : `a[href="${url}"]`;
    const el = document.querySelector(selector);
    if (el) {
      const row = el.closest('tr, div[class*="row"], div[class*="job"]');
      if (row) {
        const statusBadge = row.querySelector('.badge, [class*="status"]');
        if (statusBadge) {
          statusBadge.textContent = status;
          statusBadge.style.backgroundColor = status === 'APPLIED' ? '#10b981' : '#f59e0b';
          statusBadge.style.color = '#ffffff';
        }
      }
    }
  } catch (e) {}
}
