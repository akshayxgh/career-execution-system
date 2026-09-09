# Job Autofill Chrome Extension MVP - Conversation History

This document serves as a complete record of our development process for the Job Autofill Chrome Extension MVP.

---

## 1. Initial Request: Build Job Autofill MVP
**Goal:** Build a Chrome extension MVP to help automatically fill job application forms using an existing candidate profile (`resume_zero.json`). 
**Constraints:**
- Do not modify or overwrite `resume_zero.json`.
- Do not automatically submit forms.
- Do not bypass CAPTCHAs or security.
- Keep the scope strictly to local MVP (no AI, no backend yet).

**Actions Taken:**
- Created the Chrome Extension structure (Manifest V3).
- Built `popup.html`, `popup.css`, and `popup.js` with manual JSON import functionality.
- Implemented `profile-mapper.js` to parse `resume_zero.json` into a normalized format.
- Implemented `field-detector.js` to scan the active page for form fields.
- Implemented `field-matcher.js` with deterministic, keyword-based rules to classify fields (e.g., matching "email address" to "email").
- Implemented `form-filler.js` to safely populate high-confidence fields and dispatch browser events (`input`, `change`, `blur`).
- Built a local `test-form.html` to verify the logic.
- Created the initial `README.md`.

---

## 2. Request: Add Questionnaire Memory
**Goal:** Add a second source of truth for answering custom questions based on an existing `question_dictionary.json` file.
**Constraints:**
- Questionnaire acts as a Priority 2 fallback (Priority 1 is the Resume Profile).
- Use strict deterministic matching (no fuzzy matching, no AI).
- Unknown questions remain untouched for manual review.

**Actions Taken:**
- Created `questionnaire.js` to handle strict text normalization (removing punctuation, casing, and spacing for exact matches).
- Updated the Popup UI to support importing `question_dictionary.json` alongside the resume.
- Updated `form-filler.js` to cascade: Profile -> Questionnaire -> Unknown.
- Added Questionnaire-specific test cases to `test-form.html`.

---

## 3. Request: Extract Questions from First Screenshot
**Goal:** Extract application questions from an uploaded job portal screenshot (Accenture/SuccessFactors format).
**Actions Taken:**
- Analyzed the image and extracted critical boolean/text questions (e.g., "Are you legally authorized to work in India?", "Notice period - duration in days").
- Extracted standard profile information (Address, Phone, etc.) from the same screenshot.
- Provided the extracted questions as a formatted JSON block for manual addition to the master `question_dictionary.json`.
- Discovered an edge case regarding Middle Names and updated `profile-mapper.js` to handle `fallback_last_name` (e.g., mapping "Kumar Sarkar" if no middle name field exists).

---

## 4. Request: Extract Questions from Second Screenshot
**Goal:** Extract job-specific data from an EY (SuccessFactors) application form screenshot.
**Actions Taken:**
- Updated `profile-mapper.js` and `field-matcher.js` to support deep address mapping (`address_line_1`, `address_line_2`, `postal_code`).
- Extracted unique questions for the questionnaire (e.g., "Are you an EY Alumni?", "Fixed Comp & Variable Comp").
- Discussed the architectural limitations of matching repeating array blocks (like Work History) using a flat deterministic dictionary, establishing that this will be solved in a future AI/Adapter phase.

---

## 5. Request: Debugging Injection Error
**Goal:** Resolve the error `"Make sure you are on a webpage where the content script is injected"` shown in the extension popup.
**Actions Taken:**
- Identified that reloading an unpacked extension in Chrome instantly orphans the content script on existing tabs.
- Instructed a simple page refresh (F5) to re-inject the newly loaded scripts.
- Proactively added `"all_frames": true` to `manifest.json` to ensure the extension can penetrate `<iframe>` boundaries, which are heavily used by enterprise portals like SuccessFactors and Workday.

---

## 6. Request: Multi-Tier Site Adapter & Fallback Architecture
**Goal:** Evolve the extension from a single generic script into a multi-tier system with Site Detection, Dedicated Adapters (for known ATS platforms covering 90% of jobs), and a Generic Heuristic Engine (for 10% unknown/one-off sites).
**Actions Taken:**
- Created `BaseAdapter` with React synthetic event triggers (`nativeSetter`), select option matching, and field highlighting.
- Built dedicated adapters:
  - `workday-adapter.js` (targets `data-automation-id` used by IBM, Genpact, etc.)
  - `successfactors-adapter.js` (targets SAP SuccessFactors used by Accenture, EY, etc.)
  - `greenhouse-adapter.js` (targets `boards.greenhouse.io` and embedded forms)
  - `lever-adapter.js` (targets `jobs.lever.co`)
  - `google-adapter.js` (targets Google Careers portal)
- Created `generic-adapter.js` wrapping the existing detector and matcher as the universal fallback.
- Implemented `site-detector.js` router to automatically select the highest-priority matching adapter.
- Updated `popup.html`, `popup.css`, and `popup.js` with active engine detection badges and modern UI.
- Upgraded `test-form.html` into a multi-portal simulator suite (Workday, Greenhouse, Lever, Generic tabs).
- Updated `manifest.json` with all adapter scripts in dependency order.

---

## 7. Request: PwC Workday Dedicated Adaptation & Extraction
**Goal:** Build dedicated support for PwC's Workday application (`https://pwc.wd3.myworkdayjobs.com`), extract all questions from the 4-step wizard, preserve prefilled profile data, and ensure `blur` events are fired.
**Key Requirements:**
- Only fill blank fields; never overwrite values already populated by the candidate's account.
- Fire full event cycle (`input` -> `change` -> `blur`) on every populated field.
- Support Workday custom button dropdowns, listbox popups, search pills, date fields, radios, and consent checkboxes.

**Actions Taken:**
- Extracted all questions and user answers across:
  - Step 1 (My Information): "How Did You Hear About Us?", Prior PwC employment radio.
  - Step 2 (My Experience): Pre-filled, safely skipped.
  - Step 3 (Application Questions): Legal work authorization, sponsorship, certifications, travel, notice period, non-compete, break reasons, data processing consent, India work location consent.
  - Step 4 (Voluntary Disclosures): Gender, Date of birth, Country/Region/City of birth, Marital status, Citizenship status, Primary nationality, Terms & Conditions checkbox.
- Updated `BaseAdapter` with `forceOverwrite` guard and strict `blur` event dispatch.
- Upgraded `WorkdayAdapter` to handle multi-step field containers (`[data-automation-id="formField"]`), radio buttons, listboxes, and checkboxes.
- Added a dedicated PwC Workday simulator tab to `test-form.html`.

---

## 8. Request: IBM Careers Dedicated Adaptation & Extraction
**Goal:** Build dedicated support for IBM Careers (`https://careers.ibm.com/` / IBM BrassRing / Carbon Design System).
**Key Requirements:**
- Handle Privacy Notice consent checkbox (`[x] I agree`).
- Handle country/residency dropdowns (`Are you a resident of China or South Korea?` -> `No`).
- Handle repeating Work History block dropdowns (`Is current position?` -> `No`).
- Support Carbon Design dropdowns, listbox menus, and blank-field preservation.

**Actions Taken:**
- Created dedicated `IBMAdapter` in `adapters/ibm-adapter.js` supporting Carbon Design System select components (`.bx--dropdown`, `.cds--dropdown`, `[role="combobox"]`).
- Registered `IBMAdapter` in `core/site-detector.js` and `manifest.json`.
- Added IBM-specific questions and aliases to `question_dictionary.json` (now 121 Qs total).

---

*This document is maintained as an ongoing record of architectural decisions and development milestones.*
