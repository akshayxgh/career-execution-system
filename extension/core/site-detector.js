/**
 * SiteDetector - Detects the active portal and returns the matching adapter (or Generic fallback).
 */
class SiteDetector {
  constructor() {
    // Priority order: Specific ATS / Custom portals first, then Generic fallback
    this.adapters = [
      new window.IBMAdapter(),
      new window.WorkdayAdapter(),
      new window.SuccessFactorsAdapter(),
      new window.GreenhouseAdapter(),
      new window.LeverAdapter(),
      new window.GoogleAdapter(),
      new window.GenericAdapter() // Fallback
    ];
  }

  /**
   * Detects the best adapter for current window/document
   * @returns {BaseAdapter}
   */
  getAdapter() {
    const currentUrl = window.location.href;
    const doc = document;

    for (const adapter of this.adapters) {
      try {
        if (adapter.matches(currentUrl, doc)) {
          console.log(`[Job Autofill] Matched Adapter: ${adapter.name}`);
          return adapter;
        }
      } catch (err) {
        console.error(`[Job Autofill] Error checking match for ${adapter.name}:`, err);
      }
    }

    // Default fallback to GenericAdapter
    return new window.GenericAdapter();
  }
}

window.SiteDetector = SiteDetector;
