document.addEventListener('DOMContentLoaded', async () => {
  const statusText = document.getElementById('status-text');
  const btnImport = document.getElementById('btn-import');
  const fileInput = document.getElementById('import-file');
  
  const qStatusText = document.getElementById('q-status-text');
  const btnImportQ = document.getElementById('btn-import-q');
  const fileInputQ = document.getElementById('import-questionnaire');

  const siteBadge = document.getElementById('site-badge');
  const btnFill = document.getElementById('btn-fill');
  const summaryDiv = document.getElementById('fill-summary');
  const summaryEngine = document.getElementById('summary-engine');
  const summaryText = document.getElementById('summary-text');

  let profileLoaded = false;

  function updateFillButton() {
    btnFill.disabled = !profileLoaded;
  }

  // 1. Detect Active Tab and Site Engine
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && tab.id) {
    chrome.tabs.sendMessage(tab.id, { action: "GET_SITE_INFO" }, (response) => {
      if (chrome.runtime.lastError || !response) {
        siteBadge.textContent = "Refresh page to detect";
        siteBadge.className = "site-badge detecting";
        return;
      }

      siteBadge.textContent = response.adapterName;
      if (response.isDedicated) {
        siteBadge.className = "site-badge dedicated";
      } else {
        siteBadge.className = "site-badge generic";
      }
    });
  }

  // 2. Check if profile and questionnaire are already loaded
  chrome.storage.local.get(['normalizedProfile', 'questionnaire'], (result) => {
    if (result.normalizedProfile) {
      statusText.textContent = 'Loaded ✓';
      statusText.style.color = '#059669';
      btnImport.textContent = 'Update Profile';
      profileLoaded = true;
    } else {
      statusText.textContent = 'Not Loaded';
      statusText.style.color = '#dc2626';
      profileLoaded = false;
    }

    if (result.questionnaire && Array.isArray(result.questionnaire)) {
      qStatusText.textContent = `Loaded ✓ (${result.questionnaire.length} Qs)`;
      qStatusText.style.color = '#059669';
    } else {
      qStatusText.textContent = 'Not Loaded';
      qStatusText.style.color = '#dc2626';
    }

    updateFillButton();
  });

  // 3. Handle Profile import
  btnImport.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);
        console.log("[Job Autofill] Profile loaded from file");
        
        const normalized = window.mapProfile(json);
        
        chrome.storage.local.set({ normalizedProfile: normalized }, () => {
          statusText.textContent = 'Loaded ✓';
          statusText.style.color = '#059669';
          btnImport.textContent = 'Update Profile';
          profileLoaded = true;
          updateFillButton();
          console.log("[Job Autofill] Normalized profile saved to storage");
        });
      } catch (err) {
        console.error("[Job Autofill] Error parsing JSON:", err);
        alert("Failed to parse JSON file.");
      }
    };
    reader.readAsText(file);
  });

  // 4. Handle Questionnaire import
  btnImportQ.addEventListener('click', () => {
    fileInputQ.click();
  });

  fileInputQ.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);
        if (!Array.isArray(json)) {
          throw new Error("Questionnaire must be an array of objects.");
        }
        
        console.log(`[Job Autofill] Questionnaire loaded from file (${json.length} questions)`);
        
        chrome.storage.local.set({ questionnaire: json }, () => {
          qStatusText.textContent = `Loaded ✓ (${json.length} Qs)`;
          qStatusText.style.color = '#059669';
          console.log("[Job Autofill] Questionnaire saved to storage");
        });
      } catch (err) {
        console.error("[Job Autofill] Error parsing JSON:", err);
        alert("Failed to parse Questionnaire JSON file. " + err.message);
      }
    };
    reader.readAsText(file);
  });

  // 5. Handle Fill Form button click
  btnFill.addEventListener('click', async () => {
    btnFill.disabled = true;
    summaryDiv.classList.add('hidden');
    
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!activeTab) {
      updateFillButton();
      return;
    }

    chrome.tabs.sendMessage(activeTab.id, { action: "FILL_FORM" }, (response) => {
      updateFillButton();
      if (chrome.runtime.lastError) {
        console.error("[Job Autofill] Error sending message:", chrome.runtime.lastError);
        alert("Please refresh the job application tab (F5) so the autofill engine is connected.");
        return;
      }
      
      if (response && response.summary) {
        const s = response.summary;
        summaryEngine.textContent = `Engine: ${s.adapterName || 'Generic'}`;
        summaryText.innerHTML = `
          <strong>Total Filled:</strong> ${s.filled || 0}<br>
          &nbsp;&nbsp;• Profile fields: ${s.filledProfile || 0}<br>
          &nbsp;&nbsp;• Questionnaire: ${s.filledQuestionnaire || 0}<br>
          <strong>Skipped:</strong> ${s.skipped || 0}<br>
          <strong>Manual Review:</strong> ${s.unknown || 0}
        `;
        summaryDiv.classList.remove('hidden');
      }
    });
  });
});
