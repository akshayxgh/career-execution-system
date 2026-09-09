# Job Autofill Chrome Extension (MVP)

## 1. Project Purpose
This is a Minimum Viable Product (MVP) of a Chrome extension designed to automatically fill job application forms on career portals using a predefined JSON candidate profile. It is the first step toward a complete Job Application Assistant. The current version only maps known fields and leaves unknown fields untouched, without automatically submitting forms or bypassing security.

## 2. Project Structure
```
job-autofill/
├── manifest.json
├── popup/
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
├── content/
│   └── content.js
├── core/
│   ├── profile-mapper.js
│   ├── field-detector.js
│   ├── field-matcher.js
│   └── form-filler.js
├── test/
│   └── test-form.html
└── README.md
```

## 3. How to Load the Extension in Chrome
1. Open Google Chrome.
2. Navigate to `chrome://extensions/`.
3. Enable **Developer mode** in the top right corner.
4. Click the **Load unpacked** button.
5. Select the `job-autofill` directory.

## 4. How to Import `resume_zero.json` & `question_dictionary.json`
1. Click the Job Autofill extension icon in the Chrome toolbar to open the popup.
2. Click **Import resume_zero.json** and select your resume JSON.
3. Click **Update Questionnaire** and select `question_dictionary.json`.
4. The popup will display **Loaded ✓** for both sources. Data is safely stored in Chrome's local storage.

## 5. How to Open the Test Form
1. Open Chrome.
2. Press `Ctrl+O` (or `Cmd+O` on Mac) and select the `test/test-form.html` file inside the `job-autofill` directory.
3. The test form contains common application fields along with some unknown ones.

## 6. How to Use "Fill Form"
1. Make sure you are on a page containing a job application form (like the `test-form.html`).
2. Open the extension popup.
3. Ensure your profile is loaded.
4. Click the **Fill Form** button.
5. The extension will populate matched fields and provide a summary of what was filled, skipped, and unknown.
6. Note: It will **NOT** submit the form automatically.

## 7. How to Debug
* **Popup Issues**: Right-click on the extension icon -> **Inspect popup** to see console logs related to importing the profile.
* **Form Filling Issues**: Right-click on the webpage (e.g., `test-form.html`) -> **Inspect** -> **Console** to see logs like `[Job Autofill] Detected field`, `[Job Autofill] Classified: email`, and matching results.

## 8. Current Limitations
* Only basic HTML inputs (`<input>`, `<textarea>`, `<select>`) are supported.
* Complex React/Vue custom dropdowns, radio/checkbox combinations are currently skipped.
* Unknown fields are left blank.
* No AI capabilities (e.g., answering subjective questions).

## 9. Future Development Direction
* Advanced portal-specific adapters (e.g., Workday, Lever, Greenhouse).
* Support for complex modern UI components.
* Integration with AI for answering subjective questions based on candidate context.
* Job scraping and workflow state management.
