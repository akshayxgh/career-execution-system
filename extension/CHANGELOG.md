# Extension Changelog: Job Autofill Pro

All notable changes and architectural updates to the **Job Autofill Pro** Chrome extension are documented in this file.

---

## [2.1.8] - 2026-11-28 (Current Release)

### 🏷️ Tag & Manual Category Precedence in Recruiter Classification
- **User Override & Explicit Tag Priority:** Updated `isRecruiterProfile()` to prioritize manual tags (`PEER` vs `RECRUITER`) and role overrides (`Senior Engineering Peer` vs `Tech Talent Recruiter`) before evaluating headline regexes.
- **Persistent Manual Classification:** Ensured contacts manually marked or edited as `PEER` never revert or display as `RECRUITER`, even if their headline contains HR keywords (e.g., HR Analytics, People Operations, Total Rewards).

---

## [2.1.7] - 2026-11-24

### 🎯 Strict Word-Boundary Recruiter & Peer Classification
- **Bug Fix for False Recruiter Identification:** Fixed substring match flaw where words like "through", "thru", "Synchrony", "Philanthropist", and "threat" were erroneously triggering the `hr` keyword check and classifying senior Data/BI peers (such as Senior Data Analysts and Data Governance Leaders) as tech recruiters.
- **Whole-Word & Role Boundary Checks:** Updated `extractCandidateCards()` in `linkedin-adapter.js` and `isRecruiterProfile()` in `background.js` to strictly enforce `\b` regex word boundaries for HR/recruitment titles.
- **Practitioner Protection & Conflict Resolution:** If a profile headline contains practitioner roles (e.g., Data Analyst, Data Engineer, BI Specialist, Data Governance Leader), it is strictly classified as a `PEER` even if terms like "hiring" appear in secondary text, ensuring authentic peer notes and preventing recruiter welcome messages.

---

## [2.1.6] - 2026-11-23

### ⚡ 4 Peers + 3 HR Routine & Streamlined Popup UI
- **Routine Target Realignment:** Updated daily LinkedIn connection routine target to **4 Data/BI Peers + 3 HR / Recruiters** (was 5 Peers + 2 Recruiters) across the extension widget, background runner, and MYCES dashboard.
- **Hidden Job Cards Section in Popup:** Removed the bulky job feed display list (`#recruiter-jobs-container`) from the popup interface. Posts are now cleanly viewed and filtered in the dedicated tabular dashboard at `http://127.0.0.1:4567/api/save-jobs`.
- **Status Indicator:** Scan button now cleanly indicates status (`✓ N Saved`) without cluttering the extension popup view.

---

## [2.1.5] - 2026-11-20

### 🔗 Direct Post URL & Activity URN Resolution
- **Direct Activity Link Extraction:** Implemented `extractPostUrl()` to parse `item.entityUrn`, `item.updateMetadata.urn`, and `item.resharedUpdate` for `activity:(\d+)` patterns.
- **Deep Linking:** The **Open ↗** button now links directly to the specific LinkedIn post (`https://www.linkedin.com/feed/update/urn:li:activity:<id>`) instead of falling back to the recruiter profile.
- **Persistent Post URN:** Stored `postUrn` across all captured records.

---

## [2.1.4] - 2026-11-20

### 🔑 Profile URN Resolution & Canonical Feed Routing
- **Vanity Slug to URN ID Resolution:** Before querying member feeds, the extension now resolves the member's profile URN via `identity/profiles/${slug}` to obtain their unique internal `profileId` (`ACoAA...`).
- **Canonical Voyager `/feed/updates` Routing:** Fixes HTTP 400 Bad Request by querying `/voyager/api/feed/updates?moduleKey=member-share&profileId=${targetId}&q=memberShareFeed`.
- **Enhanced Telemetry:** Emits URN resolution status and server response bodies to local listener for real-time verification.

---

## [2.1.3] - 2026-11-20

### 🛰️ Multi-Endpoint Feed Resolution & Live Telemetry
- **Fallback Feed Routing:** Automatically cascades across 3 LinkedIn Voyager endpoints (`moduleKey=member-shares`, `moduleKey=creator_activity`, and `feed/updatesV2`) to guarantee non-creator and standard member profiles are captured.
- **Deep Schema Text Parser:** `extractAnyTextFromVoyagerItem()` searches all normalized text containers (`commentary`, `text`, `specificContent`, `header`, `title`, `summary`).
- **Live Remote Diagnostics:** Emits HTTP response telemetry to `http://127.0.0.1:4567/api/log` for real-time visibility into each recruiter's feed retrieval status.

---

## [2.1.2] - 2026-11-20

### 🔓 Unfiltered Recruiter Feed Extraction Test
- **Removed Job & Date Filtering:** Disabled keyword filtering and date boundaries in `fetchNetworkRecruiterJobs` so all raw posts/updates across connected 1st-degree recruiters are collected directly to verify Voyager API payload ingestion.
- **Multi-Path Text Resolver:** Added support for various LinkedIn Voyager schemas (`commentary.text.text`, `text.text`, `specificContent...shareCommentary.text`).
- **Live Logging:** Added per-recruiter console logging in background service worker to monitor Voyager API HTTP responses and item counts.

---

## [2.1.1] - 2026-11-20

### 🎯 Network Recruiter Opportunity Radar (<14 Days)
- **Recruiter Share Feed Scanning:** Added `FETCH_RECRUITER_JOBS_RADAR` in `background.js` to scan share feeds (`memberShareFeed`) via LinkedIn Voyager API across connected 1st-degree recruiters.
- **Strict 14-Day Recency Filter:** Implemented `isPostWithin14Days()` to verify relative time markers (`Xd`, `1w`, `2w`) and exact epoch timestamps, strictly rejecting posts older than 14 days (e.g. `3w+`, `1mo+`, `1y`).
- **Hiring Intent & Skill Extraction:** `detectJobDetailsFromPost()` identifies hiring signals (e.g. *we are hiring*, *immediate joiner*, *opening for*, *share cv*) and maps relevant core skills (*Power BI, Microsoft Fabric, DAX, SQL, Python, Azure, Databricks, ETL*).
- **Direct UI & Local Sync:** Added **`🎯 Fetch Recruiter Jobs (<14d)`** button in `popup.html` and `popup.js` with instant result rendering, copy-to-clipboard button, and HTTP dispatcher to local listener (`http://127.0.0.1:4567/api/save-jobs`) without altering the MYCES remote database.

---

## [2.1.0] - 2026-11-18

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
