# Extension Changelog: Job Autofill Pro

All notable changes and architectural updates to the **Job Autofill Pro** Chrome extension are documented in this file.

---

## [2.1.0] - 2026-11-18 (Current Release)

### 🚀 Highlights & Critical Fixes
- **Strict "Send Requests" Routing:** Fixed button behavior so clicking **Send Requests** (`#btn-send-requests`) exclusively opens the LinkedIn Grow page (`https://www.linkedin.com/mynetwork/grow/`) for the 1-Click routine. Completely removed any background trigger of `SYNC_SENT_REQUESTS`, ensuring the sent invitations manager tab (`/mynetwork/invitation-manager/sent/`) is never opened unexpectedly.
- **Dynamic Manifest Version Display:** Synchronized `popup.html` and `popup.js` with `chrome.runtime.getManifest().version`. The top-right version tag in the extension popup now automatically displays the exact live manifest version (`v2.1.0`), eliminating hardcoded version mismatches.
- **14-Day Sent Invitations Hygiene Guard:** Replaced the legacy 24-hour expiration check with a robust 14-day hygiene threshold in `background.js`. Active pending invitations sent within the last 14 days are guaranteed protection against being falsely marked as `NOT_CONNECTED`.
- **Safe Upsert for 1-Click Routine:** `handleTrackLinkedInConnection` now checks for existing profile slugs and performs a clean PATCH/upsert instead of a naive POST, guaranteeing `connection_status: 'INVITATION_SENT'` is preserved with appropriate alumni and routine tags.
- **Automated Recruiter Email Enrichment Agent:** Registered 12-hour background alarm `MYCES_RECRUITER_EMAIL_AGENT` to enrich verified corporate emails for 1st-degree connected recruiters using the Prospeo API.

---

## [2.0.1] - 2026-11-16

### 🔄 Refinements & Split Navigation
- **Unified 2-Button Interface:** Introduced `Send Requests` (Daily Growth Routine) and `Sync Network & Radar` (Accepted Invites, 1st-degree connections, Company Radar history).
- **Advanced Controls Drawer:** Grouped individual synchronization buttons (`Accepted`, `Sent`, `Connections`, `History`) into a collapsible panel for granular manual control.
- **Approved Message Dispatcher:** Added 1-Click message dispatcher for approved recruiter outreach notes directly inside the popup interface.

---

## [2.0.0] - 2026-11-11

### 🌟 Initial 2.0 Unified Career Engine
- **Cross-ATS Autofill Engine:** Form autofill support for Workday, Greenhouse, Lever, Google Careers, and IBM.
- **LinkedIn Voyager API Integration:** Zero-DOM direct JSON syncing for 1st-degree connections and accepted invites.
- **1-Click Naukri Profile Bumper:** Instant timestamp refresh for Naukri resume visibility.
- **Live Supabase Synchronization:** Direct REST persistence for candidates, applications, actions, and network contacts.
